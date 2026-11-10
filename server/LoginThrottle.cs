using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;

// Where one IP (or IPv6 /64) stands with login + recover, which share one budget.
public record ThrottleState(int Attempts, DateTimeOffset WindowStart, int Timeouts, DateTimeOffset BlockedUntil);

// The numbers, from the "Throttle" section of appsettings.json. Login and recover: Budget attempts per Window, then
// a timeout that grows each time the same network runs out again (one step of Timeouts each, staying on the last),
// forgiven after Forgive without one. Signup: SignupLimit per SignupWindow. A network timed out within the last
// Forgive gets captchas from the HarderCaptcha range (the library default is 50k-100k).
public class ThrottleOptions
{
    public int Budget { get; set; }
    public TimeSpan Window { get; set; }
    public TimeSpan[] Timeouts { get; set; } = [];
    public TimeSpan Forgive { get; set; }
    public int SignupLimit { get; set; }
    public TimeSpan SignupWindow { get; set; }
    public int HarderCaptchaMin { get; set; }
    public int HarderCaptchaMax { get; set; }

    public bool Valid => Budget > 0 && Window > TimeSpan.Zero && Timeouts.Length > 0
        && Timeouts.All(t => t > TimeSpan.Zero) && Forgive > TimeSpan.Zero
        && SignupLimit > 0 && SignupWindow > TimeSpan.Zero
        && HarderCaptchaMin > 0 && HarderCaptchaMin <= HarderCaptchaMax;
}

// Per-IP throttle for login and recover. Never per account, so strangers can't lock anyone out; every attempt
// counts, not only failures.
public static class LoginThrottle
{
    // The state after one attempt at `now`, and how long to wait when the attempt is refused.
    public static (ThrottleState State, TimeSpan? Wait) Attempt(ThrottleOptions o, ThrottleState? s, DateTimeOffset now)
    {
        if (s is null) s = new(0, now, 0, DateTimeOffset.MinValue);
        else if (now < s.BlockedUntil) return (s, s.BlockedUntil - now);
        else if (s.Timeouts > 0 && now - s.BlockedUntil >= o.Forgive) s = new(0, now, 0, DateTimeOffset.MinValue);

        if (now - s.WindowStart >= o.Window) s = s with { Attempts = 0, WindowStart = now };
        if (s.Attempts < o.Budget) return (s with { Attempts = s.Attempts + 1 }, null);

        // Out of attempts: time out, and start a fresh budget when the timeout ends.
        var timeout = o.Timeouts[Math.Min(s.Timeouts, o.Timeouts.Length - 1)];
        return (new(0, now + timeout, s.Timeouts + 1, now + timeout), timeout);
    }

    // Timed out within the last Forgive (or right now): such a network gets harder captchas.
    public static bool Suspicious(ThrottleOptions o, ThrottleState? s, DateTimeOffset now) =>
        s is { Timeouts: > 0 } && now - s.BlockedUntil < o.Forgive;

    public static bool Suspicious(HttpContext http) =>
        Suspicious(Options(http), http.RequestServices.GetRequiredService<IMemoryCache>().Get<ThrottleState>(Key(http)), DateTimeOffset.UtcNow);

    public static ThrottleOptions Options(HttpContext http) => http.RequestServices.GetRequiredService<IOptions<ThrottleOptions>>().Value;

    static string Key(HttpContext http) => "throttle:" + Auth.ClientKey(http);

    static readonly object Gate = new();

    // ponytail: in memory, so per pod, like the signup limiter; move it to Redis when running >1 replica.
    public static async ValueTask<object?> Filter(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var http = ctx.HttpContext;
        var cache = http.RequestServices.GetRequiredService<IMemoryCache>();
        var key = Key(http);
        var o = Options(http);
        TimeSpan? wait;
        lock (Gate)
        {
            (var state, wait) = Attempt(o, cache.Get<ThrottleState>(key), DateTimeOffset.UtcNow);
            // Idle entries drop out after Forgive, which is the same as forgiving them.
            cache.Set(key, state, new MemoryCacheEntryOptions { SlidingExpiration = o.Forgive });
        }
        if (wait is null) return await next(ctx);

        http.Response.Headers.RetryAfter = ((int)Math.Ceiling(wait.Value.TotalSeconds)).ToString();
        return Results.StatusCode(StatusCodes.Status429TooManyRequests);
    }
}
