using RestaurantBill.Application.Features.Delivery;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// Sipariş saatleri şubenin saat diliminde hesaplanır; kapanış açılıştan küçükse aralık gece yarısını aşar.
public class OnlineOrderingHoursTests
{
    private static readonly TimeZoneInfo Istanbul = TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");

    private static OnlineOrderSettings Hours(TimeOnly opens, TimeOnly closes, int lastOrderMinutes = 30)
        => OnlineOrderSettings.Create(true,
            ReservationSettings.WeekOrder.Select(d => new OnlineOrderDayHours(d, true, opens, closes)),
            lastOrderMinutes, 45, 10, 2, 5, true, true, false, false, 60);

    // 2026-11 yerel saat → UTC (İstanbul UTC+3, yaz saati yok).
    private static DateTime Local(int day, int hour, int minute = 0) => new DateTime(2026, 11, day, hour, minute, 0, DateTimeKind.Utc).AddHours(-3);

    [Fact]
    public void InsideWindow_IsOpen_UntilLastOrderTime()
    {
        OnlineOrderSettings settings = Hours(new(11, 0), new(22, 0));

        var noon = DeliveryScope.EvaluateHours(settings, Istanbul, Local(14, 12));
        var afterLastOrder = DeliveryScope.EvaluateHours(settings, Istanbul, Local(14, 21, 40));

        Assert.True(noon.AcceptingNow);
        Assert.Equal(Local(14, 21, 30), noon.LastOrderAt);
        Assert.False(afterLastOrder.AcceptingNow);
        Assert.Equal(Local(15, 11), afterLastOrder.NextOpensAt);
    }

    [Fact]
    public void OvernightWindow_CoversEarlyMorning()
    {
        OnlineOrderSettings settings = Hours(new(18, 0), new(2, 0), lastOrderMinutes: 0);

        var oneAm = DeliveryScope.EvaluateHours(settings, Istanbul, Local(14, 1));
        var morning = DeliveryScope.EvaluateHours(settings, Istanbul, Local(14, 9));

        Assert.True(oneAm.AcceptingNow);
        Assert.Equal(Local(14, 2), oneAm.LastOrderAt);
        Assert.False(morning.AcceptingNow);
        Assert.Equal(Local(14, 18), morning.NextOpensAt);
    }

    [Fact]
    public void AllDayEveryDay_IsAlwaysOpen_WithoutLastOrderTime()
    {
        // 00:00–23:59 = 24 saat: son sipariş kesintisi ve gece yarısı boşluğu yok.
        OnlineOrderSettings settings = Hours(new(0, 0), new(23, 59), lastOrderMinutes: 30);

        foreach (DateTime at in new[] { Local(14, 0), Local(14, 12), Local(14, 23, 30), Local(14, 23, 59) })
        {
            var hours = DeliveryScope.EvaluateHours(settings, Istanbul, at);
            Assert.True(hours.AcceptingNow);
            Assert.Null(hours.LastOrderAt);
            Assert.Null(hours.NextOpensAt);
        }
    }

    [Fact]
    public void AllDayFollowedByNormalDay_LastOrderIsNextDaysCutoff()
    {
        // 14 Kasım 2026 Cumartesi: Cumartesi 24 saat, Pazar 00:00–22:00 (son sipariş 21:30), Pazartesi kapalı.
        List<OnlineOrderDayHours> days = ReservationSettings.WeekOrder.Select(d => d switch
        {
            DayOfWeek.Saturday => new OnlineOrderDayHours(d, true, new(0, 0), new(23, 59)),
            DayOfWeek.Sunday => new OnlineOrderDayHours(d, true, new(0, 0), new(22, 0)),
            _ => new OnlineOrderDayHours(d, false, new(11, 0), new(22, 0)),
        }).ToList();
        OnlineOrderSettings settings = OnlineOrderSettings.Create(true, days, 30, 45, 10, 2, 5, true, true, false, false, 60);

        var lateSaturday = DeliveryScope.EvaluateHours(settings, Istanbul, Local(14, 23, 45));
        var lateSunday = DeliveryScope.EvaluateHours(settings, Istanbul, Local(15, 21, 45));

        Assert.True(lateSaturday.AcceptingNow);
        Assert.Equal(Local(15, 21, 30), lateSaturday.LastOrderAt);
        Assert.False(lateSunday.AcceptingNow);
        Assert.Equal(Local(21, 0), lateSunday.NextOpensAt);
    }

    [Fact]
    public void AllDayFollowedByClosedDay_ClosesAtMidnight()
    {
        List<OnlineOrderDayHours> days = ReservationSettings.WeekOrder.Select(d => d == DayOfWeek.Saturday
            ? new OnlineOrderDayHours(d, true, new(0, 0), new(23, 59))
            : new OnlineOrderDayHours(d, false, new(11, 0), new(22, 0))).ToList();
        OnlineOrderSettings settings = OnlineOrderSettings.Create(true, days, 30, 45, 10, 2, 5, true, true, false, false, 60);

        var hours = DeliveryScope.EvaluateHours(settings, Istanbul, Local(14, 23, 50));

        Assert.True(hours.AcceptingNow);
        Assert.Equal(Local(15, 0), hours.LastOrderAt);
    }

    [Theory]
    [InlineData("Ahmet Yılmaz", "Ahmet Y.")]
    [InlineData("  ayşe  nur  kaya ", "ayşe K.")]
    [InlineData("Cem", "Cem")]
    [InlineData("ali ılgaz", "ali I.")]
    public void MaskName_KeepsFirstNameAndLastInitial(string input, string expected)
        => Assert.Equal(expected, DeliveryScope.MaskName(input));

    [Fact]
    public void MaskPhone_ShowsOnlyOperatorAndLastTwoDigits()
        => Assert.Equal("0532 *** ** 67", DeliveryScope.MaskPhone("+905321234567"));
}
