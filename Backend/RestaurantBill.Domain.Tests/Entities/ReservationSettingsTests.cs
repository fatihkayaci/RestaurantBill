using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class ReservationSettingsTests
{
    private static List<ReservationDayHours> Week(string first = "10:00", string last = "22:00", params DayOfWeek[] closed)
        => ReservationSettings.WeekOrder
            .Select(d => new ReservationDayHours(d, !closed.Contains(d), TimeOnly.Parse(first), TimeOnly.Parse(last)))
            .ToList();

    private static string[] Times(ReservationSettings settings, DayOfWeek day)
        => settings.StartTimes(day).Select(t => t.ToString("HH:mm")).ToArray();

    [Fact]
    public void Default_WithoutOpeningHours_IsEnabledEveryDay0900To2100Every30Minutes()
    {
        ReservationSettings settings = ReservationSettings.Default(null, null);

        Assert.True(settings.Enabled);
        Assert.Equal(30, settings.SlotIntervalMinutes);
        Assert.Equal(120, settings.DurationMinutes);
        Assert.Equal(60, settings.MaxDaysAhead);
        Assert.Equal(20, settings.MaxPartySize);
        Assert.All(settings.Days, d => Assert.True(d.IsOpen));
        string[] times = Times(settings, DayOfWeek.Saturday);
        Assert.Equal("09:00", times[0]);
        Assert.Equal("09:30", times[1]);
        Assert.Equal("21:00", times[^1]);
    }

    [Fact]
    public void Default_WithOpeningHours_StartsAtOpeningAndEndsTwoHoursBeforeClosing()
    {
        ReservationSettings settings = ReservationSettings.Default(new TimeOnly(11, 45), new TimeOnly(23, 0));

        string[] times = Times(settings, DayOfWeek.Monday);
        Assert.Equal("12:00", times[0]);
        Assert.Equal("21:00", times[^1]);
    }

    [Fact]
    public void Default_WithOvernightHours_LastStartIsCappedAt2300()
    {
        ReservationSettings settings = ReservationSettings.Default(new TimeOnly(18, 0), new TimeOnly(3, 0));

        string[] times = Times(settings, DayOfWeek.Friday);
        Assert.Equal("18:00", times[0]);
        Assert.Equal("23:00", times[^1]);
    }

    [Theory]
    [InlineData(15, "10:00", "11:00", new[] { "10:00", "10:15", "10:30", "10:45", "11:00" })]
    [InlineData(60, "10:00", "12:30", new[] { "10:00", "11:00", "12:00" })]
    [InlineData(30, "18:00", "18:00", new[] { "18:00" })]
    public void StartTimes_FollowIntervalAndRespectLastStart(int interval, string first, string last, string[] expected)
    {
        ReservationSettings settings = ReservationSettings.Create(true, interval, 120, 30, 10, Week(first, last));

        Assert.Equal(expected, Times(settings, DayOfWeek.Wednesday));
    }

    [Fact]
    public void StartTimes_OnClosedDay_IsEmpty()
    {
        ReservationSettings settings = ReservationSettings.Create(true, 30, 120, 30, 10, Week(closed: DayOfWeek.Monday));

        Assert.Empty(settings.StartTimes(DayOfWeek.Monday));
        Assert.NotEmpty(settings.StartTimes(DayOfWeek.Tuesday));
        Assert.False(settings.IsStartTime(DayOfWeek.Monday, new TimeOnly(12, 0)));
    }

    [Theory]
    [InlineData(20, 120, 30, 10)]   // aralık
    [InlineData(30, 45, 30, 10)]    // süre < 60
    [InlineData(30, 270, 30, 10)]   // süre > 240
    [InlineData(30, 100, 30, 10)]   // 30'un katı değil
    [InlineData(30, 120, 0, 10)]    // gün
    [InlineData(30, 120, 91, 10)]
    [InlineData(30, 120, 30, 0)]    // kişi
    [InlineData(30, 120, 30, 51)]
    public void Create_WithOutOfRangeValues_Throws(int interval, int duration, int days, int party)
    {
        Assert.Throws<DomainException>(() => ReservationSettings.Create(true, interval, duration, days, party, Week()));
    }

    [Fact]
    public void Create_WithLastBeforeFirst_Throws()
    {
        var ex = Assert.Throws<DomainException>(() => ReservationSettings.Create(true, 30, 120, 30, 10, Week("20:00", "12:00")));
        Assert.Contains("Pazartesi", ex.Message);
    }

    [Fact]
    public void Create_WithLastBeforeFirstOnClosedDay_IsAllowed()
    {
        List<ReservationDayHours> week = Week();
        week[0] = new ReservationDayHours(DayOfWeek.Monday, false, new TimeOnly(20, 0), new TimeOnly(12, 0));

        ReservationSettings settings = ReservationSettings.Create(true, 30, 120, 30, 10, week);

        Assert.Empty(settings.StartTimes(DayOfWeek.Monday));
    }

    [Fact]
    public void Create_WithMissingDay_Throws()
    {
        Assert.Throws<DomainException>(() => ReservationSettings.Create(true, 30, 120, 30, 10, Week().Take(6)));
    }

    [Fact]
    public void Branch_WithoutSavedSettings_UsesDefaultsAndCanBeReset()
    {
        Branch branch = Branch.Create("Merkez");
        Assert.Null(branch.ReservationSettings);
        Assert.Equal(120, branch.GetReservationSettings().DurationMinutes);

        branch.SetReservationSettings(ReservationSettings.Create(false, 60, 90, 7, 6, Week()));
        Assert.False(branch.GetReservationSettings().Enabled);
        Assert.Equal(90, branch.GetReservationSettings().DurationMinutes);

        branch.SetReservationSettings(null);
        Assert.True(branch.GetReservationSettings().Enabled);
    }
}
