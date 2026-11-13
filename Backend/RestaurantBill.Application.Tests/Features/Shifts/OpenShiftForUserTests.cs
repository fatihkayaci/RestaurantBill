using RestaurantBill.Application.Features.Shifts.Commands.OpenShift;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Shifts;

// Yönetici bir kasiyer adına vardiya açar: vardiya kasiyerin olur, kasiyer girişte kapı görmez.
public class OpenShiftForUserTests : ApplicationTestBase
{
    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private async Task<(Branch Branch, CashRegister Register, User Cashier)> SeedAsync()
    {
        User owner = User.Create("Sahip", "owner@mail.com", "05001234567");
        SetId(owner, Guid.NewGuid());
        owner.SetPasswordHash("x");
        DbContext.Users.Add(owner);
        Company company = Company.Create("Test Restoran", owner);
        DbContext.Companies.Add(company);

        Branch branch = Branch.Create(company.Id, "Merkez", "Y", "111", "a@mail.com", "İstanbul", "Kadıköy", "Adres", 0);
        SetId(branch, CurrentUser.BranchId);
        DbContext.Branches.Add(branch);

        await SeedActorAsync("Şube Yöneticisi");

        User cashier = User.Create("Ayşe Yılmaz", "ayse@mail.com", "05009998877");
        SetId(cashier, Guid.NewGuid());
        cashier.SetPasswordHash("x");
        DbContext.Users.Add(cashier);
        DbContext.UserBranches.Add(UserBranch.Create(cashier, branch, "ayse", "1001", UserRole.Cashier));

        CashRegister register = CashRegister.Create("Ana Kasa", 500m, branch.Id);
        DbContext.CashRegisters.Add(register);

        await DbContext.SaveChangesAsync();
        return (branch, register, cashier);
    }

    [Fact]
    public async Task Admin_CanOpenShift_ForCashier_ShiftBelongsToCashier()
    {
        var (_, register, cashier) = await SeedAsync();
        var admin = new FakeCurrentUserService { UserId = CurrentUser.UserId, Role = "Admin", BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId };
        var handler = new OpenShiftCommandHandler(Db, admin, new FakeCashierNotificationService());

        var result = await handler.Handle(new OpenShiftCommand { CashRegisterId = register.Id, ForUserId = cashier.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Shift shift = Assert.Single(DbContext.Shifts);
        Assert.Equal(cashier.Id, shift.OpenedByUserId);
        Assert.Equal(ShiftStatus.Open, shift.Status);
        Assert.Equal(500m, shift.OpeningBalance);
    }

    [Fact]
    public async Task Cashier_CannotOpenShift_ForSomeoneElse()
    {
        var (_, register, cashier) = await SeedAsync();
        var otherCashier = new FakeCurrentUserService { UserId = Guid.NewGuid(), Role = "Cashier", BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId };
        var handler = new OpenShiftCommandHandler(Db, otherCashier, new FakeCashierNotificationService());

        var result = await handler.Handle(new OpenShiftCommand { CashRegisterId = register.Id, ForUserId = cashier.Id }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.Shifts);
    }

    [Fact]
    public async Task Admin_CannotOpenShift_ForWaiter()
    {
        var (branch, register, _) = await SeedAsync();
        User waiter = User.Create("Garson", "garson@mail.com", "05001112233");
        SetId(waiter, Guid.NewGuid());
        waiter.SetPasswordHash("x");
        DbContext.Users.Add(waiter);
        DbContext.UserBranches.Add(UserBranch.Create(waiter, branch, "garson", "1002", UserRole.Waiter));
        await DbContext.SaveChangesAsync();

        var admin = new FakeCurrentUserService { UserId = CurrentUser.UserId, Role = "Admin", BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId };
        var handler = new OpenShiftCommandHandler(Db, admin, new FakeCashierNotificationService());

        var result = await handler.Handle(new OpenShiftCommand { CashRegisterId = register.Id, ForUserId = waiter.Id }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.Shifts);
    }

    [Fact]
    public async Task Cashier_CannotOpenShift_ForThemselves()
    {
        var (_, register, cashier) = await SeedAsync();
        var asCashier = new FakeCurrentUserService { UserId = cashier.Id, Role = "Cashier", BranchId = CurrentUser.BranchId, CompanyId = CurrentUser.CompanyId };
        var notifications = new FakeCashierNotificationService();

        var result = await new OpenShiftCommandHandler(Db, asCashier, notifications)
            .Handle(new OpenShiftCommand { CashRegisterId = register.Id }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.Shifts);
        Assert.Equal(0, notifications.ShiftsChangedCount);
    }

    [Fact]
    public async Task Admin_OpeningShiftForCashier_NotifiesWaitingScreens()
    {
        var (_, register, cashier) = await SeedAsync();
        var notifications = new FakeCashierNotificationService();

        var result = await new OpenShiftCommandHandler(Db, CurrentUser, notifications)
            .Handle(new OpenShiftCommand { CashRegisterId = register.Id, ForUserId = cashier.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(1, notifications.ShiftsChangedCount);
    }
}
