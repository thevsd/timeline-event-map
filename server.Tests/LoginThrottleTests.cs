using Microsoft.Extensions.Configuration;

// The numbers come from the server's own appsettings.json, so these tests follow whatever it is set to.
public class LoginThrottleTests
{
    static readonly ThrottleOptions O = new ConfigurationBuilder().AddJsonFile("appsettings.json").Build()
        .GetSection("Throttle").Get<ThrottleOptions>() ?? throw new InvalidOperationException("No Throttle in appsettings.json");

    // Any start works: the throttle only looks at time passed since.
    static readonly DateTimeOffset T0 = DateTimeOffset.UtcNow;

    static TimeSpan Step(int i) => O.Timeouts[Math.Min(i, O.Timeouts.Length - 1)];

    // Spends the whole budget at `at`, then makes one more attempt and returns how long it was told to wait.
    static TimeSpan? RunOut(ref ThrottleState? s, DateTimeOffset at)
    {
        TimeSpan? wait;
        for (var i = 0; i < O.Budget; i++)
        {
            (s, wait) = LoginThrottle.Attempt(O, s, at);
            Assert.Null(wait);
        }
        (s, wait) = LoginThrottle.Attempt(O, s, at);
        return wait;
    }

    [Fact]
    public void SettingsAreValid() => Assert.True(O.Valid);

    [Fact]
    public void TimeoutsGrowStepByStep_ThenStayOnTheLast()
    {
        ThrottleState? s = null;
        var now = T0;
        for (var i = 0; i <= O.Timeouts.Length; i++)
        {
            var wait = RunOut(ref s, now);
            Assert.Equal(Step(i), wait);

            // Still blocked just before the end, with the remaining time.
            var (_, again) = LoginThrottle.Attempt(O, s, now + wait!.Value - TimeSpan.FromSeconds(1));
            Assert.Equal(TimeSpan.FromSeconds(1), again);

            now += wait.Value;
        }
    }

    [Fact]
    public void BudgetRefillsAfterTheWindow()
    {
        ThrottleState? s = null;
        for (var i = 0; i < O.Budget; i++) (s, _) = LoginThrottle.Attempt(O, s, T0);
        var (_, wait) = LoginThrottle.Attempt(O, s, T0 + O.Window);
        Assert.Null(wait);
    }

    [Fact]
    public void ForgivenAfterForgiveWithoutATimeout()
    {
        ThrottleState? s = null;
        Assert.Equal(Step(0), RunOut(ref s, T0));
        Assert.Equal(Step(1), RunOut(ref s, T0 + Step(0)));
        // Back to the first step once Forgive has passed since the last timeout ended.
        Assert.Equal(Step(0), RunOut(ref s, T0 + Step(0) + Step(1) + O.Forgive));
    }

    [Fact]
    public void HarderCaptchasUntilForgiven()
    {
        ThrottleState? s = null;
        Assert.False(LoginThrottle.Suspicious(O, s, T0));
        for (var i = 0; i < O.Budget; i++) (s, _) = LoginThrottle.Attempt(O, s, T0);
        Assert.False(LoginThrottle.Suspicious(O, s, T0)); // used the budget, but never timed out

        (s, _) = LoginThrottle.Attempt(O, s, T0); // one more: timed out until T0 + Step(0)
        Assert.True(LoginThrottle.Suspicious(O, s, T0));
        Assert.True(LoginThrottle.Suspicious(O, s, T0 + Step(0) + O.Forgive - TimeSpan.FromSeconds(1)));
        Assert.False(LoginThrottle.Suspicious(O, s, T0 + Step(0) + O.Forgive));
    }
}
