using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Domain.Tests.Entities;

// Paket servis altyapısının küçük kuralları: telefon biçimi, ayarlar, SMS doğrulaması, rezervasyon ve ön sipariş.
public class OnlineOrderingFoundationTests
{
    private static readonly DateTime Now = new(2026, 11, 14, 12, 0, 0, DateTimeKind.Utc);

    [Theory]
    [InlineData("0532 123 45 67", "+905321234567")]
    [InlineData("+90 (532) 123-4567", "+905321234567")]
    [InlineData("5321234567", "+905321234567")]
    [InlineData("0212 000 00 00", "+902120000000")]
    [InlineData("12345", "")]
    [InlineData("00532123456", "")]
    public void TurkishPhone_Normalize(string input, string expected)
    {
        Assert.Equal(expected, TurkishPhone.Normalize(input));
    }

    [Fact]
    public void OnlineOrderSettings_DefaultIsOff_WithTenMinuteAutoReject()
    {
        OnlineOrderSettings settings = OnlineOrderSettings.Default(new TimeOnly(10, 0), new TimeOnly(23, 0));

        Assert.False(settings.Enabled);
        Assert.Equal(10, settings.AutoRejectAfterMinutes);
        Assert.False(settings.RequirePhoneVerification);
        Assert.Equal(7, settings.Days.Count);
        Assert.Equal(new TimeOnly(23, 0), settings.For(DayOfWeek.Friday).Closes);
    }

    [Fact]
    public void OnlineOrderSettings_Create_NeedsAPaymentMethodAndAllDays()
    {
        List<OnlineOrderDayHours> week = ReservationSettings.WeekOrder
            .Select(d => new OnlineOrderDayHours(d, true, new TimeOnly(11, 0), new TimeOnly(2, 0))).ToList();

        OnlineOrderSettings ok = OnlineOrderSettings.Create(true, week, 30, 45, 15, 2, 5, true, false, false, true, 60);
        Assert.Equal(15, ok.AutoRejectAfterMinutes);

        Assert.Throws<DomainException>(() => OnlineOrderSettings.Create(true, week, 30, 45, 10, 2, 5, false, false, false, false, 60));
        Assert.Throws<DomainException>(() => OnlineOrderSettings.Create(true, week.Take(6), 30, 45, 10, 2, 5, true, true, false, false, 60));
    }

    [Fact]
    public void Branch_AcceptsOnlineOrders_OnlyWhenEnabledAndNotPaused()
    {
        Branch branch = Branch.Create("Merkez");
        Assert.False(branch.AcceptsOnlineOrders);

        List<OnlineOrderDayHours> week = ReservationSettings.WeekOrder
            .Select(d => new OnlineOrderDayHours(d, true, new TimeOnly(11, 0), new TimeOnly(22, 0))).ToList();
        branch.SetOnlineOrderSettings(OnlineOrderSettings.Create(true, week, 30, 45, 10, 2, 5, true, true, false, false, 60));
        Assert.True(branch.AcceptsOnlineOrders);

        branch.SetOnlineOrdersPaused(true);
        Assert.False(branch.AcceptsOnlineOrders);
    }

    [Fact]
    public void PhoneVerification_LocksAfterFiveWrongCodes()
    {
        CustomerPhoneVerification code = CustomerPhoneVerification.Create(Guid.NewGuid(), "05321234567", "hash-1", Now);

        for (int i = 0; i < CustomerPhoneVerification.MaxAttempts; i++)
            Assert.False(code.Verify("wrong", "token", Now));

        Assert.Equal(VerificationCodeStatus.Failed, code.Status);
        Assert.Throws<DomainException>(() => code.Verify("hash-1", "token", Now));
    }

    [Fact]
    public void PhoneVerification_TokenIsSingleUse_AndCodeExpires()
    {
        CustomerPhoneVerification code = CustomerPhoneVerification.Create(Guid.NewGuid(), "05321234567", "hash-1", Now);
        Assert.True(code.Verify("hash-1", "token-hash", Now.AddMinutes(1)));

        code.ConsumeToken("token-hash", Now.AddMinutes(2));
        Assert.Throws<DomainException>(() => code.ConsumeToken("token-hash", Now.AddMinutes(3)));

        CustomerPhoneVerification late = CustomerPhoneVerification.Create(Guid.NewGuid(), "05321234567", "hash-1", Now);
        Assert.Throws<DomainException>(() => late.Verify("hash-1", "token-hash", Now.Add(CustomerPhoneVerification.CodeLifetime)));
    }

    [Fact]
    public void Reservation_GetsARandomToken_AndSeatOrNoShowFromConfirmed()
    {
        Table table = Table.Create("Masa 1", "", Guid.NewGuid());
        Reservation seated = Reservation.CreateRequest(table, "Ayşe", "05321234567", Now, Now.AddHours(2), 2, null);
        Reservation noShow = Reservation.CreateRequest(table, "Ali", "05321234568", Now, Now.AddHours(2), 2, null);
        Assert.Equal(AccessToken.Length, seated.AccessToken.Length);
        Assert.NotEqual(seated.AccessToken, noShow.AccessToken);

        Assert.Throws<DomainException>(() => seated.Seat(Now));
        seated.Confirm();
        seated.Seat(Now);
        Assert.Equal(ReservationStatus.Seated, seated.Status);
        Assert.Equal(Now, seated.SeatedAt);

        noShow.Confirm();
        Assert.Throws<DomainException>(() => noShow.MarkNoShow(Now.AddMinutes(-1)));
        noShow.MarkNoShow(Now.AddMinutes(30));
        Assert.Equal(ReservationStatus.NoShow, noShow.Status);
    }

    [Fact]
    public void Reservation_GetsAShortCode_ForStaffAndCustomerReservations_AndCanRegenerateIt()
    {
        Table table = Table.Create("Masa 1", "", Guid.NewGuid());
        Reservation staff = Reservation.Create(table, "Ayşe", "05321234567", Now, "", Now.AddHours(2));
        Reservation customer = Reservation.CreateRequest(table, "Ali", "05321234568", Now, Now.AddHours(2), 2, null);

        foreach (Reservation reservation in new[] { staff, customer })
        {
            Assert.Equal(ReservationCode.Length, reservation.Code.Length);
            Assert.Equal(reservation.Code, ReservationCode.Normalize(reservation.Code));
        }

        string before = customer.Code;
        // Aynı kodun art arda gelme olasılığı 1/887 milyon; birkaç denemede değişmeli.
        for (int i = 0; i < 5 && customer.Code == before; i++)
            customer.RegenerateCode();
        Assert.NotEqual(before, customer.Code);
    }

    [Fact]
    public void PreOrder_OnlyForConfirmedReservation_AndCanBeCancelledOrExpired()
    {
        Table table = Table.Create("Masa 1", "", Guid.NewGuid());
        Reservation reservation = Reservation.CreateRequest(table, "Ayşe", "05321234567", Now, Now.AddHours(2), 2, null);
        Assert.Throws<DomainException>(() => OrderRequest.CreatePreOrder(reservation, null));

        reservation.Confirm();
        OrderRequest preOrder = OrderRequest.CreatePreOrder(reservation, "doğum günü");
        preOrder.AddItem(Product.Create("Pasta", 300m, "", Guid.NewGuid()), 1, null, unitPrice: 280m);

        Assert.Equal(OrderRequestKind.PreOrder, preOrder.Kind);
        Assert.Equal(280m, Assert.Single(preOrder.Items).UnitPrice);
        preOrder.Expire();
        Assert.Equal(OrderRequestStatus.Expired, preOrder.Status);
        Assert.Throws<DomainException>(preOrder.Cancel);

        OrderRequest qr = OrderRequest.Create(Guid.NewGuid(), null);
        Assert.Throws<DomainException>(qr.Expire);
        qr.Reject("Ürün kalmadı");
        Assert.Equal("Ürün kalmadı", qr.RejectReason);
    }
}
