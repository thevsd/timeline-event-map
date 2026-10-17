using System.Threading.RateLimiting;
using Ixnas.AltchaNet;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDb>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Db")));
builder.Services.AddDataProtection().SetApplicationName("timeline").PersistKeysToDbContext<AppDb>();

builder.Services.AddAuthentication(IdentityConstants.ApplicationScheme).AddIdentityCookies();
builder.Services.AddAuthorization();
builder.Services.AddIdentityCore<AppUser>(o =>
    {
        // No email anywhere: usernames only, so drop '@' and '+' from the defaults.
        o.User.AllowedUserNameCharacters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._";
        // NIST 800-63B: length + common-password list, no composition rules.
        o.Password.RequiredLength = 10;
        o.Password.RequiredUniqueChars = 1;
        o.Password.RequireDigit = false;
        o.Password.RequireLowercase = false;
        o.Password.RequireUppercase = false;
        o.Password.RequireNonAlphanumeric = false;
        // Throttling is per IP (rate limiter below), never per account: strangers can't lock anyone out.
        o.Lockout.AllowedForNewUsers = false;
    })
    .AddEntityFrameworkStores<AppDb>()
    .AddSignInManager()
    .AddDefaultTokenProviders()
    .AddPasswordValidator<CommonPasswordValidator>();

builder.Services.ConfigureApplicationCookie(c =>
{
    c.Cookie.Name = "tl_auth";
    c.Cookie.SameSite = SameSiteMode.Strict;
    c.Cookie.SecurePolicy = CookieSecurePolicy.Always;
    // This is an API: answer 401/403 instead of redirecting to a login page.
    c.Events.OnRedirectToLogin = ctx => { ctx.Response.StatusCode = 401; return Task.CompletedTask; };
    c.Events.OnRedirectToAccessDenied = ctx => { ctx.Response.StatusCode = 403; return Task.CompletedTask; };
});
// How quickly a password reset kicks out the other sessions.
builder.Services.Configure<SecurityStampValidatorOptions>(o => o.ValidationInterval = TimeSpan.FromMinutes(1));

// Captcha on every signup, login and recover: an ALTCHA proof-of-work, issued and checked here (no third party).
// The key is 64 random bytes, base64, in user-secrets / an env var like the DB password; all replicas need the same one.
var altchaKey = builder.Configuration["Altcha:Key"] ?? throw new InvalidOperationException(
    "Missing Altcha:Key. Run in server/: dotnet user-secrets set \"Altcha:Key\" \"<64 random bytes, base64>\"");
builder.Services.AddMemoryCache();
builder.Services.AddSingleton(sp => Altcha.CreateService(new AltchaSha256Configuration
{
    Key = AltchaKey.FromBytes(Convert.FromBase64String(altchaKey)),
    StoreFactory = () => new UsedChallenges(sp.GetRequiredService<IMemoryCache>()),
}));

// Signup: 5 per hour per IP. Login and recover have their own growing timeout (LoginThrottle.cs).
// ponytail: in-memory limiter is per pod; move the limit to the ingress or Redis when running >1 replica.
// It counts every attempt, not only failures; the limits are loose enough for people sharing one IP.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.OnRejected = (ctx, _) =>
    {
        if (ctx.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry))
            ctx.HttpContext.Response.Headers.RetryAfter = ((int)retry.TotalSeconds).ToString();
        return ValueTask.CompletedTask;
    };
    o.AddPolicy("signup", ctx => RateLimitPartition.GetFixedWindowLimiter(Auth.ClientKey(ctx),
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromHours(1) }));
});

// ponytail: only loopback proxies are trusted. Behind the k8s ingress, add its network to KnownNetworks,
// or every client shows up as the ingress IP and shares one rate-limit bucket.
builder.Services.Configure<ForwardedHeadersOptions>(o =>
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto);

var app = builder.Build();

// ponytail: migrating on startup races with several replicas; move it to a k8s Job when scaling out.
using (var scope = app.Services.CreateScope())
    scope.ServiceProvider.GetRequiredService<AppDb>().Database.Migrate();

app.UseForwardedHeaders();
app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

app.MapAuth();

app.Run();
