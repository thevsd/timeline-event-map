using System.Net;
using System.Net.Sockets;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Ixnas.AltchaNet;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Memory;

// Altcha is the solved captcha (base64), sent by the ALTCHA widget in the form.
public record SignupRequest(string Username, string Password, string? Altcha);
public record LoginRequest(string Username, string Password, string? Altcha);
public record RecoverRequest(string Username, string RecoveryCode, string NewPassword, string? Altcha);

public static class Auth
{
    public static void MapAuth(this IEndpointRouteBuilder app)
    {
        var g = app.MapGroup("/api/auth");

        // A fresh challenge for each attempt; solving it is the captcha. Each one works once and expires after 2 minutes.
        // About 75k hashes on average (well under a second), or 20x that for a network timed out in the last day.
        g.MapGet("/challenge", (AltchaService altcha, HttpContext ctx) =>
        {
            ctx.Response.Headers.CacheControl = "no-store";
            return Results.Ok(LoginThrottle.Suspicious(ctx)
                ? altcha.Generate(c => c with { Complexity = c.Complexity with { Counter = new AltchaComplexityCounterRange(1_000_000, 2_000_000) } })
                : altcha.Generate());
        });

        g.MapPost("/signup", async (SignupRequest req, AltchaService altcha, UserManager<AppUser> users, SignInManager<AppUser> signIn) =>
        {
            if (!await Solved(altcha, req.Altcha)) return CaptchaFailed;
            if (req.Username is not { Length: >= 3 and <= 32 })
                return Results.ValidationProblem(new Dictionary<string, string[]>
                    { ["InvalidUserNameLength"] = ["Username must be 3 to 32 characters."] });

            var code = NewRecoveryCode();
            var user = new AppUser { UserName = req.Username, RecoveryCodeHash = HashCode(code) };
            var result = await users.CreateAsync(user, req.Password ?? "");
            if (!result.Succeeded) return Problem(result);

            await signIn.SignInAsync(user, isPersistent: true);
            return Results.Ok(new { username = user.UserName, recoveryCode = code });
        }).RequireRateLimiting("signup");

        g.MapPost("/login", async (LoginRequest req, AltchaService altcha, UserManager<AppUser> users, SignInManager<AppUser> signIn) =>
        {
            if (!await Solved(altcha, req.Altcha)) return CaptchaFailed;
            var user = await users.FindByNameAsync(req.Username ?? "");
            // Same answer for unknown user and wrong password. Signup still reveals taken names; that's accepted without email.
            if (user is null || !await users.CheckPasswordAsync(user, req.Password ?? ""))
                return Results.Problem("Wrong username or password.", statusCode: StatusCodes.Status401Unauthorized);

            await signIn.SignInAsync(user, isPersistent: true);
            return Results.Ok(new { username = user.UserName });
        }).AddEndpointFilter(LoginThrottle.Filter);

        g.MapPost("/logout", async (SignInManager<AppUser> signIn) =>
        {
            await signIn.SignOutAsync();
            return Results.NoContent();
        });

        g.MapGet("/me", (ClaimsPrincipal me) => Results.Ok(new { username = me.Identity!.Name }))
            .RequireAuthorization();

        // Shares the login throttle, so an IP can't double its guesses by alternating endpoints.
        g.MapPost("/recover", async (RecoverRequest req, AltchaService altcha, UserManager<AppUser> users, SignInManager<AppUser> signIn) =>
        {
            if (!await Solved(altcha, req.Altcha)) return CaptchaFailed;
            var user = await users.FindByNameAsync(req.Username ?? "");
            if (user?.RecoveryCodeHash is null || !CodeMatches(user.RecoveryCodeHash, req.RecoveryCode))
                return Results.Problem("Wrong username or recovery code.", statusCode: StatusCodes.Status401Unauthorized);

            // Set before the reset so the new code and new password are saved in the same write.
            var code = NewRecoveryCode();
            user.RecoveryCodeHash = HashCode(code);
            var token = await users.GeneratePasswordResetTokenAsync(user);
            // Also rotates the security stamp, which signs out every other session.
            var result = await users.ResetPasswordAsync(user, token, req.NewPassword ?? "");
            if (!result.Succeeded) return Problem(result);

            await signIn.SignInAsync(user, isPersistent: true);
            return Results.Ok(new { username = user.UserName, recoveryCode = code });
        }).AddEndpointFilter(LoginThrottle.Filter);
    }

    static async Task<bool> Solved(AltchaService altcha, string? payload)
    {
        if (string.IsNullOrEmpty(payload)) return false;
        try { return (await altcha.Validate(payload)).IsValid; }
        catch (Exception e) when (e is FormatException or System.Text.Json.JsonException) { return false; }
    }

    static readonly IResult CaptchaFailed = Results.ValidationProblem(new Dictionary<string, string[]>
        { ["CaptchaFailed"] = ["The robot check failed or expired. Try again."] });

    // Identity error codes (DuplicateUserName, PasswordTooShort, CommonPassword, ...) become the keys, for the UI to match on.
    static IResult Problem(IdentityResult r) => Results.ValidationProblem(
        r.Errors.GroupBy(e => e.Code).ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()));

    // Crockford base32: no I, L, O, U, so the code survives being written down by hand.
    const string Alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

    // 16 chars x 5 bits = 80 bits: unguessable, so a fast hash is enough to store it.
    public static string NewRecoveryCode() =>
        string.Join('-', RandomNumberGenerator.GetItems<char>(Alphabet, 16).Chunk(4).Select(c => new string(c)));

    static string Normalize(string code) => code.ToUpperInvariant()
        .Replace("-", "").Replace(" ", "").Replace('O', '0').Replace('I', '1').Replace('L', '1');

    public static string HashCode(string code) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(Normalize(code))));

    public static bool CodeMatches(string storedHash, string? code) =>
        CryptographicOperations.FixedTimeEquals(Convert.FromHexString(storedHash),
            SHA256.HashData(Encoding.UTF8.GetBytes(Normalize(code ?? ""))));

    // Rate-limit key. IPv6 users typically own a whole /64, so throttle the block, not the single address.
    public static string ClientKey(HttpContext ctx)
    {
        var ip = ctx.Connection.RemoteIpAddress;
        if (ip is null) return "unknown";
        if (ip.IsIPv4MappedToIPv6) return ip.MapToIPv4().ToString();
        if (ip.AddressFamily != AddressFamily.InterNetworkV6) return ip.ToString();
        var bytes = ip.GetAddressBytes();
        Array.Clear(bytes, 8, 8);
        return new IPAddress(bytes) + "/64";
    }
}

public class CommonPasswordValidator : IPasswordValidator<AppUser>
{
    static readonly HashSet<string> Common = new(
        File.ReadLines(Path.Combine(AppContext.BaseDirectory, "common-passwords.txt")), StringComparer.OrdinalIgnoreCase);

    public Task<IdentityResult> ValidateAsync(UserManager<AppUser> manager, AppUser user, string? password) =>
        Task.FromResult(Common.Contains(password ?? "") || string.Equals(password, user.UserName, StringComparison.OrdinalIgnoreCase)
            ? IdentityResult.Failed(new IdentityError { Code = "CommonPassword", Description = "This password is too common or too easy to guess." })
            : IdentityResult.Success);
}

// Solved challenges, remembered until they expire so each one is accepted only once.
// ponytail: per pod, like the rate limiter; a replica that didn't see a solution would accept it again.
// Move to the database or Redis when running >1 replica.
public class UsedChallenges(IMemoryCache cache) : IAltchaChallengeStore
{
    public Task Store(string challenge, DateTimeOffset expiryUtc)
    {
        cache.Set("altcha:" + challenge, true, expiryUtc);
        return Task.CompletedTask;
    }

    public Task<bool> Exists(string challenge) => Task.FromResult(cache.TryGetValue("altcha:" + challenge, out _));
}
