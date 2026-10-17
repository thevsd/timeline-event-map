using Microsoft.Extensions.Caching.Memory;

// Where one IP (or IPv6 /64) stands with login + recover, which share one budget.
public record ThrottleState(int Attempts, DateTimeOffset WindowStart, int Timeouts, DateTimeOffset BlockedUntil);

// Per-IP throttle for login and recover: 10 attempts per 15 minutes, then a timeout that grows each time the
// same network runs out again (1, 2, 15, then 30 minutes), forgiven after a day without one. Never per account,
// so strangers can't lock anyone out; every attempt counts, not only failures.
public static class LoginThrottle
{
    public const int Budget = 10;
    static readonly TimeSpan Window = TimeSpan.FromMinutes(15);
    static readonly TimeSpan[] Timeouts = [TimeSpan.FromMinutes(1), TimeSpan.FromMinutes(2), TimeSpan.FromMinutes(15), TimeSpan.FromMinutes(30)];
    static readonly TimeSpan Forgive = TimeSpan.FromDays(1);

    // The state after one attempt at `now`, and how long to wait when the attempt is refused.
    public static (ThrottleState State, TimeSpan? Wait) Attempt(ThrottleState? s, DateTimeOffset now)
    {
        if (s is null) s = new(0, now, 0, DateTimeOffset.MinValue);
        else if (now < s.BlockedUntil) return (s, s.BlockedUntil - now);
        else if (s.Timeouts > 0 && now - s.BlockedUntil >= Forgive) s = new(0, now, 0, DateTimeOffset.MinValue);

        if (now - s.WindowStart >= Window) s = s with { Attempts = 0, WindowStart = now };
        if (s.Attempts < Budget) return (s with { Attempts = s.Attempts + 1 }, null);

        // Out of attempts: time out, and start a fresh budget when the timeout ends.
        var timeout = Timeouts[Math.Min(s.Timeouts, Timeouts.Length - 1)];
        return (new(0, now + timeout, s.Timeouts + 1, now + timeout), timeout);
    }

    // Timed out within the last day (or right now): such a network gets harder captchas.
    public static bool Suspicious(ThrottleState? s, DateTimeOffset now) =>
        s is { Timeouts: > 0 } && now - s.BlockedUntil < Forgive;

    public static bool Suspicious(HttpContext http) =>
        Suspicious(http.RequestServices.GetRequiredService<IMemoryCache>().Get<ThrottleState>(Key(http)), DateTimeOffset.UtcNow);

    static string Key(HttpContext http) => "throttle:" + Auth.ClientKey(http);

    static readonly object Gate = new();

    // ponytail: in memory, so per pod, like the signup limiter; move it to Redis when running >1 replica.
    public static async ValueTask<object?> Filter(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var http = ctx.HttpContext;
        var cache = http.RequestServices.GetRequiredService<IMemoryCache>();
        var key = Key(http);
        TimeSpan? wait;
        lock (Gate)
        {
            (var state, wait) = Attempt(cache.Get<ThrottleState>(key), DateTimeOffset.UtcNow);
            // Idle entries drop out after a day, which is the same as forgiving them.
            cache.Set(key, state, new MemoryCacheEntryOptions { SlidingExpiration = Forgive });
        }
        if (wait is null) return await next(ctx);

        http.Response.Headers.RetryAfter = ((int)Math.Ceiling(wait.Value.TotalSeconds)).ToString();
        return Results.StatusCode(StatusCodes.Status429TooManyRequests);
    }
}
