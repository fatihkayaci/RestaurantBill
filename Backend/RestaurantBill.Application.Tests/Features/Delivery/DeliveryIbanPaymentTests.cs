using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Delivery.Public;
using RestaurantBill.Application.Features.Delivery.Settings;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// Online paket siparişte "IBAN ile öde" (havale/EFT): ayar, sipariş sayfası, gönderim, takip sayfası ve kurye/kasa akışı.
public class DeliveryIbanPaymentTests : DeliveryTestBase
{
    private const string ValidIban = "TR330006100519786457841326";

    private async Task SeedWithIbanAsync(OnlineOrderSettings settings, bool withIban = true)
    {
        await SeedAsync(settings);
        if (withIban)
        {
            Branch.SetIban(ValidIban, "Paket Restoran Ltd.", "Ziraat Bankası");
            await DbContext.SaveChangesAsync();
        }
    }

    private async Task<OnlineOrderingDto> OnlineOrderingAsync()
    {
        var handler = new GetOnlineOrderingQueryHandler(Db, Tenant, Options.Create(new BunnyStorageOptions()), Sms, Clock);
        var result = await handler.Handle(new GetOnlineOrderingQuery { BranchId = Branch.Id }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        return result.Value!;
    }

    private SubmitDeliveryOrderCommand IbanSubmit()
    {
        SubmitDeliveryOrderCommand command = Submit(220m, ProductLine(Lahmacun, 2));
        command.PaymentMethod = PaymentMethod.Iban;
        return command;
    }

    private static UpdateOnlineOrderSettingsCommand SettingsCommand(bool acceptCash, bool acceptCard, bool acceptIban) => new()
    {
        Enabled = true,
        Days = ReservationSettings.WeekOrder.Select(d => new OnlineOrderDayDto { Day = (int)d, IsOpen = true, Opens = "11:00", Closes = "22:00" }).ToList(),
        LastOrderMinutesBeforeClose = 30,
        DefaultEtaMinutes = 45,
        AutoRejectAfterMinutes = 10,
        MaxOpenOrdersPerPhone = 2,
        MaxOrdersPerPhonePerDay = 5,
        AcceptCash = acceptCash,
        AcceptCard = acceptCard,
        AcceptIban = acceptIban,
        PreOrderLeadMinutes = 60
    };

    [Fact]
    public async Task OnlineOrdering_IbanAcceptedWithValidIban_ListsIbanAndDetails()
    {
        await SeedWithIbanAsync(Settings(acceptIban: true));

        OnlineOrderingDto dto = await OnlineOrderingAsync();

        Assert.Equal(new[] { PaymentMethod.Nakit, PaymentMethod.Kart, PaymentMethod.Iban }, dto.PaymentMethods);
        Assert.NotNull(dto.IbanPayment);
        Assert.Equal(ValidIban, dto.IbanPayment!.Iban);
        Assert.Equal("TR33 0006 1005 1978 6457 8413 26", dto.IbanPayment.IbanFormatted);
        Assert.Equal("Paket Restoran Ltd.", dto.IbanPayment.AccountHolder);
        Assert.Equal("Ziraat Bankası", dto.IbanPayment.BankName);
    }

    [Fact]
    public async Task OnlineOrdering_IbanSettingOnButNoIban_HidesIban()
    {
        await SeedWithIbanAsync(Settings(acceptIban: true), withIban: false);

        OnlineOrderingDto dto = await OnlineOrderingAsync();

        Assert.DoesNotContain(PaymentMethod.Iban, dto.PaymentMethods);
        Assert.Null(dto.IbanPayment);
    }

    [Fact]
    public async Task OnlineOrdering_IbanSettingOff_HidesIbanEvenWithIban()
    {
        await SeedWithIbanAsync(Settings());

        OnlineOrderingDto dto = await OnlineOrderingAsync();

        Assert.DoesNotContain(PaymentMethod.Iban, dto.PaymentMethods);
        Assert.Null(dto.IbanPayment);
    }

    [Fact]
    public async Task Submit_IbanNotAccepted_IsRejected()
    {
        await SeedWithIbanAsync(Settings());

        var result = await SubmitAsync(IbanSubmit());

        Assert.True(result.IsFailure);
        Assert.Equal(SubmitDeliveryOrderCommandHandler.IbanNotAcceptedMessage, result.Error);
        Assert.Empty(DbContext.DeliveryOrders);
    }

    [Fact]
    public async Task Submit_Iban_IsSaved_AndTrackingShowsIbanDetails()
    {
        await SeedWithIbanAsync(Settings(acceptCash: false, acceptCard: false, acceptIban: true));

        var result = await SubmitAsync(IbanSubmit());

        Assert.True(result.IsSuccess, result.Error);
        DeliveryOrder order = DbContext.DeliveryOrders.Single();
        Assert.Equal(PaymentMethod.Iban, order.PaymentPreference);

        var tracking = await new GetDeliveryTrackingQueryHandler(Db, Tenant)
            .Handle(new GetDeliveryTrackingQuery { Token = result.Value!.Token }, CancellationToken.None);
        Assert.True(tracking.IsSuccess, tracking.Error);
        Assert.Equal(PaymentMethod.Iban, tracking.Value!.PaymentPreference);
        Assert.Equal(ValidIban, tracking.Value.IbanPayment?.Iban);
        Assert.Equal(220m, tracking.Value.Total);
    }

    [Fact]
    public async Task Tracking_CashOrder_HasNoIbanDetails()
    {
        await SeedWithIbanAsync(Settings(acceptIban: true));
        DeliveryOrder order = await SubmitOkAsync();

        var tracking = await new GetDeliveryTrackingQueryHandler(Db, Tenant)
            .Handle(new GetDeliveryTrackingQuery { Token = order.AccessToken }, CancellationToken.None);

        Assert.True(tracking.IsSuccess, tracking.Error);
        Assert.Null(tracking.Value!.IbanPayment);
    }

    [Fact]
    public async Task UpdateSettings_IbanWithoutBranchIban_IsRejected_AndIbanOnlyIsAllowedWithIban()
    {
        await SeedWithIbanAsync(Settings(), withIban: false);
        var handler = new UpdateOnlineOrderSettingsCommandHandler(Db, CurrentUser, Sms);

        var withoutIban = await handler.Handle(SettingsCommand(acceptCash: true, acceptCard: true, acceptIban: true), CancellationToken.None);
        Assert.True(withoutIban.IsFailure);
        Assert.Equal(UpdateOnlineOrderSettingsCommandHandler.IbanMissingMessage, withoutIban.Error);

        var none = await handler.Handle(SettingsCommand(acceptCash: false, acceptCard: false, acceptIban: false), CancellationToken.None);
        Assert.True(none.IsFailure);

        Branch.SetIban(ValidIban, "Paket Restoran Ltd.");
        await DbContext.SaveChangesAsync();
        var ibanOnly = await handler.Handle(SettingsCommand(acceptCash: false, acceptCard: false, acceptIban: true), CancellationToken.None);
        Assert.True(ibanOnly.IsSuccess, ibanOnly.Error);
        Assert.True(ibanOnly.Value!.AcceptIban);
        Assert.True(ibanOnly.Value.HasIban);
        Assert.False(ibanOnly.Value.AcceptCash);
    }

    [Fact]
    public void RemovingIban_WhenItIsTheOnlyOnlinePaymentMethod_IsBlocked()
    {
        Branch branch = Branch.Create(Guid.NewGuid(), "Kadıköy", "", "", "", "İstanbul", "Kadıköy", "", 10m);
        branch.SetIban(ValidIban, "Paket Restoran Ltd.");
        branch.SetOnlineOrderSettings(Settings(acceptCash: false, acceptCard: false, acceptIban: true));

        Assert.Throws<DomainException>(() => branch.SetIban(null, null));

        branch.SetOnlineOrderSettings(Settings(acceptIban: true));
        branch.SetIban(null, null);
        Assert.False(branch.AcceptsIbanForDelivery);
    }

    [Fact]
    public async Task IbanOrder_CourierMarksIban_HandoverRecordsIbanPayment_WithoutCash()
    {
        await SeedWithIbanAsync(Settings(acceptIban: true));
        User courier = User.Create("Kurye Kaan", $"{Guid.NewGuid():N}@test.com", "5550000000");
        DbContext.Users.Add(courier);
        DbContext.UserBranches.Add(UserBranch.Create(courier, Branch, "kurye.kaan", null, UserRole.Courier));
        CashRegister register = CashRegister.Create("Ana Kasa", 500m, Branch.Id);
        DbContext.CashRegisters.Add(register);
        await DbContext.SaveChangesAsync();
        DbContext.Shifts.Add(Shift.Create(Branch.Id, register.Id, CurrentUser.UserId, 500m, 500m));
        await DbContext.SaveChangesAsync();

        var submitted = await SubmitAsync(IbanSubmit());
        Assert.True(submitted.IsSuccess, submitted.Error);
        DeliveryOrder delivery = DbContext.DeliveryOrders.Single();
        await AcceptOkAsync(delivery);
        Result ready = await new UpdateOrderStatusCommandHandler(Db, TableNotifications, CashierNotifications, CurrentUser)
            .Handle(new UpdateOrderStatusCommand { OrderId = delivery.OrderId!.Value, Status = (int)OrderStatus.Ready }, CancellationToken.None);
        Assert.True(ready.IsSuccess, ready.Error);
        Result assigned = await new AssignCourierCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications)
            .Handle(new AssignCourierCommand { Id = delivery.Id, CourierUserId = courier.Id }, CancellationToken.None);
        Assert.True(assigned.IsSuccess, assigned.Error);
        Result dispatched = await new DispatchDeliveryOrderCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications, Clock)
            .Handle(new DispatchDeliveryOrderCommand { Id = delivery.Id }, CancellationToken.None);
        Assert.True(dispatched.IsSuccess, dispatched.Error);

        Result delivered = await new DeliverDeliveryOrderCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications, Clock)
            .Handle(new DeliverDeliveryOrderCommand { Id = delivery.Id, Method = PaymentMethod.Iban }, CancellationToken.None);
        Assert.True(delivered.IsSuccess, delivered.Error);
        Assert.Equal(PaymentMethod.Iban, delivery.CollectedMethod);

        var result = await new HandoverCourierCashCommandHandler(Db, CurrentUser, CashierNotifications, CourierNotifications, Clock)
            .Handle(new HandoverCourierCashCommand
            {
                CourierUserId = courier.Id,
                CashRegisterId = register.Id,
                DeliveryOrderIds = [delivery.Id]
            }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(0m, result.Value!.CashAmount);
        Assert.Equal(220m, result.Value.CardAmount);
        Assert.Empty(DbContext.CashTransactions);
        Assert.All(DbContext.Payments, p => Assert.Equal(PaymentMethod.Iban, p.PaymentMethod));
        Assert.Equal(220m, DbContext.Payments.Sum(p => p.TotalAmount));
        Assert.Contains(DbContext.AuditLogs, a => a.Action == "DeliveryOrderSettled" && a.Message.Contains("IBAN"));
    }
}
