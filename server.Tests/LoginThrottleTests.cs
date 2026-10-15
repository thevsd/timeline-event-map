public class LoginThrottleTests
{
    static readonly DateTimeOffset T0 = new(2026, 10, 15, 12, 0, 0, TimeSpan.Zero);

    // Spends the whole budget at `at`, then makes one more attempt and returns how long it was told to wait.
    static TimeSpan? RunOut(ref ThrottleState? s, DateTimeOffset at)
    {
        TimeSpan? wait;
        for (var i = 0; i < LoginThrottle.Budget; i++)
        {
            (s, wait) = LoginThrottle.Attempt(s, at);
            Assert.Null(wait);
        }
        (s, wait) = LoginThrottle.Attempt(s, at);
        return wait;
    }

    [Fact]
    public void TimeoutsGrow_1_2_15_then_30_minutes()
    {
        ThrottleState? s = null;
        var now = T0;
        foreach (var minutes in new[] { 1, 2, 15, 30, 30 })
        {
            var wait = RunOut(ref s, now);
            Assert.Equal(TimeSpan.FromMinutes(minutes), wait);

            // Still blocked just before the end, with the remaining time.
            var (_, again) = LoginThrottle.Attempt(s, now + wait!.Value - TimeSpan.FromSeconds(1));
            Assert.Equal(TimeSpan.FromSeconds(1), again);

            now += wait.Value;
        }
    }

    [Fact]
    public void BudgetRefillsAfterTheWindow()
    {
        ThrottleState? s = null;
        for (var i = 0; i < LoginThrottle.Budget; i++) (s, _) = LoginThrottle.Attempt(s, T0);
        var (_, wait) = LoginThrottle.Attempt(s, T0 + TimeSpan.FromMinutes(15));
        Assert.Null(wait);
    }

    [Fact]
    public void ForgivenAfterADayWithoutATimeout()
    {
        ThrottleState? s = null;
        Assert.Equal(TimeSpan.FromMinutes(1), RunOut(ref s, T0));
        Assert.Equal(TimeSpan.FromMinutes(2), RunOut(ref s, T0 + TimeSpan.FromMinutes(1)));
        // Back to the first step a day after the last timeout ended.
        Assert.Equal(TimeSpan.FromMinutes(1), RunOut(ref s, T0 + TimeSpan.FromMinutes(3) + TimeSpan.FromDays(1)));
    }

    [Fact]
    public void HarderCaptchasForADayAfterATimeout()
    {
        ThrottleState? s = null;
        Assert.False(LoginThrottle.Suspicious(s, T0));
        for (var i = 0; i < LoginThrottle.Budget; i++) (s, _) = LoginThrottle.Attempt(s, T0);
        Assert.False(LoginThrottle.Suspicious(s, T0)); // used the budget, but never timed out

        (s, _) = LoginThrottle.Attempt(s, T0); // the 11th: timed out until T0 + 1 minute
        Assert.True(LoginThrottle.Suspicious(s, T0));
        Assert.True(LoginThrottle.Suspicious(s, T0 + TimeSpan.FromHours(23)));
        Assert.False(LoginThrottle.Suspicious(s, T0 + TimeSpan.FromMinutes(1) + TimeSpan.FromDays(1)));
    }
}
