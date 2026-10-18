using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Features.Payments.Commands.CreatePayment;
using RestaurantBill.Application.Features.Shifts.Commands.CloseShift;
using RestaurantBill.Application.Features.Shifts.Commands.CloseShiftWithoutCount;
using RestaurantBill.Application.Features.Shifts.Commands.OpenShift;
using RestaurantBill.Application.Features.Shifts.Commands.RejectShiftDifference;
using RestaurantBill.Application.Features.Shifts.Commands.TakeOverShift;
using RestaurantBill.Application.Features.Shifts.Queries.GetShiftSummary;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Infrastructure.Services;
using RestaurantBill.Integration.Tests.Infrastructure;

namespace RestaurantBill.Integration.Tests.Features.Shifts;

public class ShiftFlowTests : IntegrationTestBase
{
    private readonly ShiftBalanceCalculator _calculator;

    public ShiftFlowTests()
    {
        _calculator = new ShiftBalanceCalculator(AppDb);

        // Admin işlemleri denetim kaydına adını yazar; varsayılan test kullanıcısı bu yüzden gerçek bir kullanıcı olmalı.
        User admin = User.Create("Şube Yöneticisi", "admin@test.com", "05000000001");
        DbContext.Users.Add(admin);
        DbContext.Entry(admin).Property(u => u.Id).CurrentValue = UserId;
        DbContext.SaveChanges();
    }

    private static FakeCurrentUserService Cashier(Guid userId) =>
        new() { BranchId = RestaurantId, UserId = userId, Role = "Cashier" };

    private async Task<Guid> SeedUserAsync(string fullName)
    {
        User user = User.Create(fullName, $"{Guid.NewGuid():N}@test.com", "05000000000");
        await DbContext.Users.AddAsync(user);
        await DbContext.SaveChangesAsync();
        return user.Id;
    }

    private async Task<CashRegister> SeedRegisterAsync(decimal balance, Guid? branchId = null)
    {
        CashRegister register = CashRegister.Create("Nakit Kasa", balance, branchId ?? RestaurantId);
        await DbContext.CashRegisters.AddAsync(register);
        await DbContext.SaveChangesAsync();
        return register;
    }

    private Task<Domain.Shared.Result<Application.DTOs.ShiftDto>> OpenAsync(ICurrentUserService user, Guid registerId, decimal? counted = null) =>
        new OpenShiftCommandHandler(AppDb, user)
            .Handle(new OpenShiftCommand { CashRegisterId = registerId, CountedBalance = counted }, CancellationToken.None);

    private Task<Domain.Shared.Result<Application.DTOs.ShiftDto>> CloseAsync(ICurrentUserService user, Guid shiftId, decimal counted) =>
        new CloseShiftCommandHandler(AppDb, user, _calculator)
            .Handle(new CloseShiftCommand { ShiftId = shiftId, CountedClosingBalance = counted }, CancellationToken.None);

    [Fact]
    public async Task Open_AfterCountedClose_DoesNotAskForCountAgain()
    {
        CashRegister register = await SeedRegisterAsync(100m);
        var alice = Cashier(await SeedUserAsync("Ayşe"));
        var bora = Cashier(await SeedUserAsync("Bora"));

        var first = await OpenAsync(alice, register.Id);
        Assert.True((await CloseAsync(alice, first.Value!.Id, 100m)).IsSuccess);

        var second = await OpenAsync(bora, register.Id);

        Assert.True(second.IsSuccess);
        Assert.Equal(100m, second.Value!.OpeningBalance);
        Assert.Equal(0m, second.Value.OpeningDifference);
        Assert.Equal("Bora", second.Value.OpenedByUserName);
    }

    [Fact]
    public async Task Open_AfterUncountedClose_RequiresCountAndChargesThePreviousShift()
    {
        CashRegister register = await SeedRegisterAsync(100m);
        var alice = Cashier(await SeedUserAsync("Ayşe"));
        var bora = Cashier(await SeedUserAsync("Bora"));

        var first = await OpenAsync(alice, register.Id);
        await new CloseShiftWithoutCountCommandHandler(AppDb, CurrentUser, _calculator)
            .Handle(new CloseShiftWithoutCountCommand { ShiftId = first.Value!.Id }, CancellationToken.None);

        var withoutCount = await OpenAsync(bora, register.Id);
        Assert.True(withoutCount.IsFailure);

        var second = await OpenAsync(bora, register.Id, counted: 80m);
        Assert.True(second.IsSuccess);

        Shift previous = await DbContext.Shifts.AsNoTracking().SingleAsync(s => s.Id == first.Value.Id);
        Assert.Equal(ShiftCountStatus.Counted, previous.CountStatus);
        Assert.Equal(-20m, previous.Difference);

        Assert.Equal(80m, second.Value!.OpeningBalance);
        Assert.Equal(80m, (await DbContext.CashRegisters.AsNoTracking().SingleAsync(r => r.Id == register.Id)).Balance);

        // Geç sayım düzeltmesi açılış bakiyesine dahil; yeni vardiyanın beklenen tutarını ikinci kez etkilememeli.
        Shift opened = await DbContext.Shifts.AsNoTracking().SingleAsync(s => s.Id == second.Value.Id);
        Assert.Equal(80m, await _calculator.CalculateExpectedClosingBalanceAsync(opened, CancellationToken.None));
    }

    [Fact]
    public async Task TakeOver_ClosesTheOpenShiftWithTheCountAndOpensANewOne()
    {
        CashRegister register = await SeedRegisterAsync(100m);
        Guid aliceId = await SeedUserAsync("Ayşe");
        var alice = Cashier(aliceId);
        var bora = Cashier(await SeedUserAsync("Bora"));

        var first = await OpenAsync(alice, register.Id);
        DbContext.CashTransactions.Add(register.AddTransaction(CashTransactionType.In, 50m, aliceId));
        await DbContext.SaveChangesAsync();

        var result = await new TakeOverShiftCommandHandler(AppDb, bora, _calculator)
            .Handle(new TakeOverShiftCommand { CashRegisterId = register.Id, CountedBalance = 140m }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Shift previous = await DbContext.Shifts.AsNoTracking().SingleAsync(s => s.Id == first.Value!.Id);
        Assert.Equal(ShiftStatus.Closed, previous.Status);
        Assert.Equal(150m, previous.ExpectedClosingBalance);
        Assert.Equal(-10m, previous.Difference);
        Assert.Equal(bora.UserId, previous.ClosedByUserId);

        Assert.Equal(bora.UserId, result.Value!.OpenedByUserId);
        Assert.Equal(140m, result.Value.OpeningBalance);
        Assert.Equal(140m, (await DbContext.CashRegisters.AsNoTracking().SingleAsync(r => r.Id == register.Id)).Balance);

        Shift opened = await DbContext.Shifts.AsNoTracking().SingleAsync(s => s.Id == result.Value.Id);
        Assert.Equal(140m, await _calculator.CalculateExpectedClosingBalanceAsync(opened, CancellationToken.None));
    }

    [Fact]
    public async Task Open_WhenSomeoneElsesShiftIsOpen_Fails()
    {
        CashRegister register = await SeedRegisterAsync(100m);
        await OpenAsync(Cashier(await SeedUserAsync("Ayşe")), register.Id);

        var result = await OpenAsync(Cashier(await SeedUserAsync("Bora")), register.Id);

        Assert.True(result.IsFailure);
    }

    [Fact]
    public async Task Close_CashierCannotCloseSomeoneElsesShift()
    {
        CashRegister register = await SeedRegisterAsync(100m);
        var first = await OpenAsync(Cashier(await SeedUserAsync("Ayşe")), register.Id);

        var result = await CloseAsync(Cashier(await SeedUserAsync("Bora")), first.Value!.Id, 100m);

        Assert.True(result.IsFailure);
        Assert.Equal(ShiftStatus.Open, (await DbContext.Shifts.AsNoTracking().SingleAsync(s => s.Id == first.Value.Id)).Status);
    }

    [Fact]
    public async Task Payment_CashierCannotTakePaymentOnSomeoneElsesShift()
    {
        CashRegister register = await SeedRegisterAsync(100m);
        await OpenAsync(Cashier(await SeedUserAsync("Ayşe")), register.Id);

        Table table = Table.Create("Masa 1", "", DefaultRegionId);
        await DbContext.Tables.AddAsync(table);
        await DbContext.SaveChangesAsync();
        Order order = Order.Create(table.Id);
        await DbContext.Orders.AddAsync(order);
        await DbContext.SaveChangesAsync();

        var result = await new CreatePaymentCommandHandler(AppDb, null!, null!, Cashier(await SeedUserAsync("Bora")))
            .Handle(new CreatePaymentCommand { OrderId = order.Id, CashRegisterId = register.Id, PaymentMethod = PaymentMethod.Nakit }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains("devralmanız", result.Error);
    }

    [Fact]
    public async Task RejectDifference_LeavesTheRegisterAtTheCountedBalance()
    {
        CashRegister register = await SeedRegisterAsync(100m);
        var alice = Cashier(await SeedUserAsync("Ayşe"));
        var shift = await OpenAsync(alice, register.Id);
        await CloseAsync(alice, shift.Value!.Id, 90m);
        int transactionsBefore = await DbContext.CashTransactions.CountAsync();

        var result = await new RejectShiftDifferenceCommandHandler(AppDb, CurrentUser)
            .Handle(new RejectShiftDifferenceCommand { ShiftId = shift.Value.Id, Note = "Açıklama yok" }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(90m, (await DbContext.CashRegisters.AsNoTracking().SingleAsync(r => r.Id == register.Id)).Balance);
        Assert.Equal(transactionsBefore, await DbContext.CashTransactions.CountAsync());
    }

    [Fact]
    public async Task Summary_HidesTheExpectedCashFromCashiers()
    {
        CashRegister register = await SeedRegisterAsync(100m);
        var alice = Cashier(await SeedUserAsync("Ayşe"));
        var shift = await OpenAsync(alice, register.Id);
        var query = new GetShiftSummaryQuery { ShiftId = shift.Value!.Id };

        var asCashier = await new GetShiftSummaryQueryHandler(AppDb, alice, _calculator).Handle(query, CancellationToken.None);
        var asAdmin = await new GetShiftSummaryQueryHandler(AppDb, CurrentUser, _calculator).Handle(query, CancellationToken.None);

        Assert.Null(asCashier.Value!.ExpectedCashInRegister);
        Assert.Equal(100m, asAdmin.Value!.ExpectedCashInRegister);
    }

    [Fact]
    public async Task Open_AsOwner_WritesTheRegistersBranchNotTheCompany()
    {
        User ownerUser = User.Create("Sahip", "owner@test.com", "05000000009");
        await DbContext.Users.AddAsync(ownerUser);
        Company company = Company.Create("Şirket", ownerUser);
        await DbContext.Companies.AddAsync(company);
        await DbContext.SaveChangesAsync();
        Branch branch = Branch.Create(company.Id, "Merkez", "Sahip", "05000000009", "owner@test.com", "İstanbul", "Kadıköy", "Adres", 10m);
        await DbContext.Branches.AddAsync(branch);
        await DbContext.SaveChangesAsync();
        CashRegister register = await SeedRegisterAsync(0m, branch.Id);

        var owner = new FakeCurrentUserService { BranchId = company.Id, UserId = ownerUser.Id, Role = "Owner" };
        var result = await OpenAsync(owner, register.Id);

        Assert.True(result.IsSuccess);
        Assert.Equal(branch.Id, result.Value!.BranchId);
    }
}
