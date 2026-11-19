using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Payments.Commands.CreatePayment;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Features.Waiter;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Payments;

// Ürün indirimi: hesabın tamamı tek ödemede alınırken bazı kalemlere indirim uygulanır, kalanı tam fiyat.
public class ItemDiscountPaymentTests : WaiterTestBase
{
    private Product _ayran = default!;

    // Köfte 2 × 200 (%10) + Ayran 2 × 50 (%1) = 500 TL.
    private async Task<(Order Order, CashRegister Register)> SeedBillAsync(Guid shiftOwnerId)
    {
        await SeedActorAsync();
        await SeedBranchAsync();
        _ayran = Product.Create("Ayran", 50m, "", Product.CategoryId);
        DbContext.Products.Add(_ayran);
        await DbContext.SaveChangesAsync();
        var (register, _) = await SeedRegisterAsync("Ana Kasa", shiftOwnerId);
        Order order = await SeedOrderAsync(Salon);
        order.AddItem(_ayran, 2, 1m);
        await DbContext.SaveChangesAsync();
        return (order, register);
    }

    private OrderItem Line(Order order, Product product) => order.OrderItems.Single(i => i.ProductId == product.Id);

    private Task<Result<bool>> PayAsync(FakeCurrentUserService user, Order order, CashRegister register, IEnumerable<PaymentItemDto> items,
        decimal? discountPercent = null, decimal? discountAmount = null, decimal? amount = null) =>
        new CreatePaymentCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), user)
            .Handle(new CreatePaymentCommand
            {
                OrderId = order.Id,
                CashRegisterId = register.Id,
                PaymentMethod = PaymentMethod.Kart,
                Items = items.ToList(),
                DiscountPercent = discountPercent,
                DiscountAmount = discountAmount,
                Amount = amount,
            }, CancellationToken.None);

    private List<PaymentItemDto> AllItems(Order order, decimal? ayranPercent = null, decimal? ayranAmount = null) =>
        order.OrderItems.Select(i => new PaymentItemDto
        {
            OrderItemId = i.Id,
            Quantity = i.Quantity,
            DiscountPercent = i.ProductId == _ayran.Id ? ayranPercent : null,
            DiscountAmount = i.ProductId == _ayran.Id ? ayranAmount : null,
        }).ToList();

    [Fact]
    public async Task FullBill_WithItemDiscount_ClosesTable_InOnePayment()
    {
        var (order, register) = await SeedBillAsync(CurrentUser.UserId);

        var result = await PayAsync(CurrentUser, order, register, AllItems(order, ayranPercent: 50m));

        Assert.True(result.IsSuccess, result.Error);
        Assert.True(result.Value); // masa kapandı
        List<Payment> payments = await DbContext.Payments.ToListAsync();
        Assert.Equal(450m, payments.Sum(p => p.TotalAmount));
        Assert.Equal(50m, payments.Sum(p => p.DiscountAmount));

        // İndirim yalnızca ayranın satırında: ürün raporu indirimi doğru ürüne düşürür.
        Payment kofte = payments.Single(p => p.TaxRate == 10m);
        Assert.Equal(400m, kofte.TotalAmount);
        Assert.Equal(0m, kofte.DiscountAmount);
        Payment ayran = payments.Single(p => p.TaxRate == 1m);
        Assert.Equal(50m, ayran.TotalAmount);
        Assert.Equal(50m, ayran.DiscountAmount);
        Assert.Equal(50m, ayran.DiscountPercent);
        Assert.True((await DbContext.Orders.SingleAsync()).IsClosed());
        Assert.Contains("ürün indirimi: Ayran ×2 %50", (await DbContext.AuditLogs.SingleAsync()).Message);
    }

    [Fact]
    public async Task ItemDiscount_SameRate_GetsItsOwnPaymentRow()
    {
        await SeedActorAsync();
        await SeedBranchAsync();
        var (register, _) = await SeedRegisterAsync("Ana Kasa", CurrentUser.UserId);
        Product cola = Product.Create("Kola", 60m, "", Product.CategoryId);
        DbContext.Products.Add(cola);
        Order order = await SeedOrderAsync(Salon); // Köfte 2 × 200
        order.AddItem(cola, 1, 10m);
        await DbContext.SaveChangesAsync();

        var items = order.OrderItems.Select(i => new PaymentItemDto
        {
            OrderItemId = i.Id,
            Quantity = i.Quantity,
            DiscountAmount = i.ProductId == cola.Id ? 60m : null, // kola ikram
        });
        var result = await PayAsync(CurrentUser, order, register, items);

        Assert.True(result.IsSuccess, result.Error);
        List<Payment> payments = await DbContext.Payments.Include(p => p.Order).ToListAsync();
        Assert.Equal(2, payments.Count);
        Assert.Equal(400m, payments.Sum(p => p.TotalAmount));
        Payment colaPayment = payments.Single(p => p.DiscountAmount > 0m);
        Assert.Equal(0m, colaPayment.TotalAmount);
        Assert.Equal(1, colaPayment.ItemCount);
        List<PaymentLineItem> colaLines = await DbContext.PaymentLineItems.Where(l => l.PaymentId == colaPayment.Id).ToListAsync();
        Assert.Equal("Kola", Assert.Single(colaLines).ProductName);
    }

    [Fact]
    public async Task ItemDiscount_AndBillDiscount_Combine()
    {
        var (order, register) = await SeedBillAsync(CurrentUser.UserId);

        // Ayrana 20 TL, kalan 480 TL'ye %10 hesap indirimi (48 TL) → 432 TL.
        var result = await PayAsync(CurrentUser, order, register, AllItems(order, ayranAmount: 20m), discountPercent: 10m);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(432m, await DbContext.Payments.SumAsync(p => p.TotalAmount));
        Assert.Equal(68m, await DbContext.Payments.SumAsync(p => p.DiscountAmount));
    }

    [Fact]
    public async Task PartialPayment_WithItemDiscount_KeepsRestOnTable()
    {
        var (order, register) = await SeedBillAsync(CurrentUser.UserId);
        OrderItem ayran = Line(order, _ayran);

        var result = await PayAsync(CurrentUser, order, register,
            [new PaymentItemDto { OrderItemId = ayran.Id, Quantity = 1, DiscountPercent = 100m }]);

        Assert.True(result.IsSuccess, result.Error);
        Assert.False(result.Value);
        Payment payment = await DbContext.Payments.SingleAsync();
        Assert.Equal(0m, payment.TotalAmount);
        Assert.Equal(50m, payment.DiscountAmount);
        Assert.Equal(450m, (await DbContext.Orders.SingleAsync()).TotalPrice);
    }

    [Fact]
    public async Task ItemDiscount_AfterOnAccountPayment_DeductsPrepaidShare()
    {
        var (order, register) = await SeedBillAsync(CurrentUser.UserId);
        Assert.True((await PayAsync(CurrentUser, order, register, [], amount: 100m)).IsSuccess);

        var result = await PayAsync(CurrentUser, order, register, AllItems(order, ayranAmount: 30m));

        Assert.True(result.IsSuccess, result.Error);
        Assert.True(result.Value);
        // 500 - 100 (hesaba) - 30 (ayran indirimi) = 370 TL.
        List<Payment> closing = await DbContext.Payments.Where(p => !p.IsOnAccount).ToListAsync();
        Assert.Equal(370m, closing.Sum(p => p.TotalAmount));
        Assert.Equal(100m, closing.Sum(p => p.PrepaidAmount));
        Assert.All(closing, p => Assert.True(p.TotalAmount >= 0m));
        Assert.Equal(500m, closing.Sum(p => p.TotalAmount + p.DiscountAmount + p.PrepaidAmount));
    }

    [Fact]
    public async Task ItemDiscount_AboveLineTotal_IsRejected()
    {
        var (order, register) = await SeedBillAsync(CurrentUser.UserId);

        var result = await PayAsync(CurrentUser, order, register, AllItems(order, ayranAmount: 101m));

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.Payments);
    }

    [Fact]
    public async Task Cashier_ItemDiscountAboveLimit_IsRejected()
    {
        await SeedBranchAsync();
        User cashierUser = User.Create("Ayşe Kasiyer", $"{Guid.NewGuid():N}@test.com", "5550000000");
        DbContext.Users.Add(cashierUser);
        UserBranch membership = UserBranch.Create(cashierUser, Branch, "kasiyer" + Guid.NewGuid().ToString("N")[..6], null, UserRole.Cashier);
        membership.SetCashierPermissions(true, 10, true, true);
        DbContext.UserBranches.Add(membership);
        await DbContext.SaveChangesAsync();
        var cashier = new FakeCurrentUserService { UserId = cashierUser.Id, Role = "Cashier", BranchId = Branch.Id, CompanyId = CurrentUser.CompanyId };
        _ayran = Product.Create("Ayran", 50m, "", Product.CategoryId);
        DbContext.Products.Add(_ayran);
        var (register, _) = await SeedRegisterAsync("Ana Kasa", cashier.UserId);
        Order order = await SeedOrderAsync(Salon);
        order.AddItem(_ayran, 2, 1m);
        await DbContext.SaveChangesAsync();

        var overLine = await PayAsync(cashier, order, register, AllItems(order, ayranPercent: 20m));
        var withinLine = await PayAsync(cashier, order, register, AllItems(order, ayranPercent: 10m));

        Assert.False(overLine.IsSuccess);
        Assert.Equal(StaffAccess.DiscountLimitMessage(10), overLine.Error);
        Assert.True(withinLine.IsSuccess, withinLine.Error);
        Assert.Equal(490m, await DbContext.Payments.SumAsync(p => p.TotalAmount));
    }

    [Fact]
    public void Validator_RejectsItemWithBothPercentAndAmount()
    {
        var command = new CreatePaymentCommand
        {
            OrderId = Guid.NewGuid(),
            CashRegisterId = Guid.NewGuid(),
            PaymentMethod = PaymentMethod.Kart,
            Items = [new PaymentItemDto { OrderItemId = Guid.NewGuid(), Quantity = 1, DiscountPercent = 10m, DiscountAmount = 5m }],
        };

        Assert.False(new CreatePaymentCommandValidator().Validate(command).IsValid);
    }

    // --- Adede indirim: satırdaki adetlerin yalnızca bir kısmına ürün indirimi (DiscountQuantity) ---

    // Köfte 2 × 200 (%10) + Ayran 3 × 50 (%1) = 550 TL.
    private async Task<(Order Order, CashRegister Register)> SeedThreeAyranAsync(Guid? shiftOwnerId = null)
    {
        _ayran = Product.Create("Ayran", 50m, "", Product.CategoryId);
        DbContext.Products.Add(_ayran);
        await DbContext.SaveChangesAsync();
        var (register, _) = await SeedRegisterAsync("Ana Kasa", shiftOwnerId ?? CurrentUser.UserId);
        Order order = await SeedOrderAsync(Salon);
        order.AddItem(_ayran, 3, 1m);
        await DbContext.SaveChangesAsync();
        return (order, register);
    }

    private List<PaymentItemDto> AllItemsWithAyranDiscount(Order order, int discountQuantity, decimal? percent = null, decimal? amount = null) =>
        order.OrderItems.Select(i => new PaymentItemDto
        {
            OrderItemId = i.Id,
            Quantity = i.Quantity,
            DiscountPercent = i.ProductId == _ayran.Id ? percent : null,
            DiscountAmount = i.ProductId == _ayran.Id ? amount : null,
            DiscountQuantity = i.ProductId == _ayran.Id ? discountQuantity : null,
        }).ToList();

    [Fact]
    public async Task PercentDiscount_OnOneOfThreeUnits_DiscountsOnlyThatUnit()
    {
        await SeedActorAsync();
        await SeedBranchAsync();
        var (order, register) = await SeedThreeAyranAsync();

        var result = await PayAsync(CurrentUser, order, register, AllItemsWithAyranDiscount(order, 1, percent: 50m));

        Assert.True(result.IsSuccess, result.Error);
        Assert.True(result.Value);
        List<Payment> payments = await DbContext.Payments.ToListAsync();
        // 550 - 25 (1 ayranın yarısı) = 525.
        Assert.Equal(525m, payments.Sum(p => p.TotalAmount));
        Assert.Equal(25m, payments.Sum(p => p.DiscountAmount));

        // İndirimli adet kendi ödeme satırında; kalan 2 ayran tam fiyat.
        Payment discounted = payments.Single(p => p.DiscountAmount > 0m);
        Assert.Equal(1, discounted.ItemCount);
        Assert.Equal(25m, discounted.TotalAmount);
        Assert.Equal(50m, discounted.DiscountPercent);
        Payment plainAyran = payments.Single(p => p.TaxRate == 1m && p.DiscountAmount == 0m);
        Assert.Equal(2, plainAyran.ItemCount);
        Assert.Equal(100m, plainAyran.TotalAmount);

        // Ürün raporu için ayranın satır kalemleri toplam 3 adet.
        List<PaymentLineItem> ayranLines = await DbContext.PaymentLineItems.Where(l => l.ProductName == "Ayran").ToListAsync();
        Assert.Equal(3, ayranLines.Sum(l => l.Quantity));
        Assert.Contains("Ayran ×1/3 %50", (await DbContext.AuditLogs.SingleAsync()).Message);
    }

    [Fact]
    public async Task AmountDiscount_OnTwoOfThreeUnits_IsTotalForThoseUnits()
    {
        await SeedActorAsync();
        await SeedBranchAsync();
        var (order, register) = await SeedThreeAyranAsync();

        var result = await PayAsync(CurrentUser, order, register, AllItemsWithAyranDiscount(order, 2, amount: 20m));

        Assert.True(result.IsSuccess, result.Error);
        List<Payment> payments = await DbContext.Payments.ToListAsync();
        Assert.Equal(530m, payments.Sum(p => p.TotalAmount));
        Payment discounted = payments.Single(p => p.DiscountAmount > 0m);
        Assert.Equal(20m, discounted.DiscountAmount);
        Assert.Equal(2, discounted.ItemCount);
        Assert.Equal(80m, discounted.TotalAmount);
        Assert.Contains("Ayran ×2/3 ₺20", (await DbContext.AuditLogs.SingleAsync()).Message);
    }

    [Fact]
    public async Task PartialSelection_DiscountOnOneOfSelectedUnits()
    {
        await SeedActorAsync();
        await SeedBranchAsync();
        var (order, register) = await SeedThreeAyranAsync();
        OrderItem ayran = Line(order, _ayran);

        // Ürün seç: 3 ayrandan 2'si ödeniyor, 1'i ikram.
        var result = await PayAsync(CurrentUser, order, register,
            [new PaymentItemDto { OrderItemId = ayran.Id, Quantity = 2, DiscountPercent = 100m, DiscountQuantity = 1 }]);

        Assert.True(result.IsSuccess, result.Error);
        Assert.False(result.Value);
        List<Payment> payments = await DbContext.Payments.ToListAsync();
        Assert.Equal(50m, payments.Sum(p => p.TotalAmount));
        Assert.Equal(50m, payments.Sum(p => p.DiscountAmount));
        Assert.Equal(2, payments.Sum(p => p.ItemCount));
        // Masada köfteler ve 1 ayran kalır.
        Assert.Equal(450m, (await DbContext.Orders.SingleAsync()).TotalPrice);
    }

    [Fact]
    public async Task DiscountQuantity_AbovePaidQuantity_IsRejected()
    {
        await SeedActorAsync();
        await SeedBranchAsync();
        var (order, register) = await SeedThreeAyranAsync();
        OrderItem ayran = Line(order, _ayran);

        var result = await PayAsync(CurrentUser, order, register,
            [new PaymentItemDto { OrderItemId = ayran.Id, Quantity = 2, DiscountPercent = 50m, DiscountQuantity = 3 }]);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.Payments);

        var command = new CreatePaymentCommand
        {
            OrderId = Guid.NewGuid(),
            CashRegisterId = Guid.NewGuid(),
            PaymentMethod = PaymentMethod.Kart,
            Items = [new PaymentItemDto { OrderItemId = Guid.NewGuid(), Quantity = 2, DiscountPercent = 50m, DiscountQuantity = 3 }],
        };
        Assert.False(new CreatePaymentCommandValidator().Validate(command).IsValid);
        command.Items.First().DiscountQuantity = 0;
        Assert.False(new CreatePaymentCommandValidator().Validate(command).IsValid);
        command.Items.First().DiscountQuantity = 2;
        Assert.True(new CreatePaymentCommandValidator().Validate(command).IsValid);
    }

    [Fact]
    public async Task Cashier_DiscountLimit_IsJudgedOnDiscountedUnits()
    {
        await SeedBranchAsync();
        User cashierUser = User.Create("Ayşe Kasiyer", $"{Guid.NewGuid():N}@test.com", "5550000000");
        DbContext.Users.Add(cashierUser);
        UserBranch membership = UserBranch.Create(cashierUser, Branch, "kasiyer" + Guid.NewGuid().ToString("N")[..6], null, UserRole.Cashier);
        membership.SetCashierPermissions(true, 10, true, true);
        DbContext.UserBranches.Add(membership);
        await DbContext.SaveChangesAsync();
        var cashier = new FakeCurrentUserService { UserId = cashierUser.Id, Role = "Cashier", BranchId = Branch.Id, CompanyId = CurrentUser.CompanyId };
        var (order, register) = await SeedThreeAyranAsync(cashier.UserId);

        // 1 ayrana ₺10 = o adedin %20'si (3 ayranın %6,7'si olsa da) → sınır %10, reddedilir.
        var overLimit = await PayAsync(cashier, order, register, AllItemsWithAyranDiscount(order, 1, amount: 10m));
        var withinLimit = await PayAsync(cashier, order, register, AllItemsWithAyranDiscount(order, 1, amount: 5m));

        Assert.False(overLimit.IsSuccess);
        Assert.Equal(StaffAccess.DiscountLimitMessage(10), overLimit.Error);
        Assert.True(withinLimit.IsSuccess, withinLimit.Error);
        Assert.Equal(545m, await DbContext.Payments.SumAsync(p => p.TotalAmount));
    }
}
