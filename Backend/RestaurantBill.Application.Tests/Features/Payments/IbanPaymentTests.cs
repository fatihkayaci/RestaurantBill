using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Payments.Commands.CreatePayment;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Payments;

// IBAN ile ödeme: kasaya nakit hareketi yazmaz (kart gibi) ve şubede IBAN yoksa reddedilir.
public class IbanPaymentTests : ApplicationTestBase
{
    private async Task<(Order Order, CashRegister Register)> SeedAsync(bool withIban)
    {
        await SeedActorAsync();
        Branch branch = Branch.Create(Guid.NewGuid(), "Merkez", "Y", "111", "a@mail.com", "İstanbul", "Kadıköy", "Adres", 10m);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(branch, CurrentUser.BranchId);
        if (withIban) branch.SetIban("TR330006100519786457841326", "Ocak Gıda");
        DbContext.Branches.Add(branch);

        Category category = Category.Create("Ana Yemek", branch.Id);
        DbContext.Categories.Add(category);
        Product product = Product.Create("Köfte", 200m, "", category.Id);
        DbContext.Products.Add(product);
        Table table = await SeedTableAsync();
        Order order = Order.Create(table.Id);
        order.AddItem(product, 1, 10m);
        DbContext.Orders.Add(order);

        CashRegister register = CashRegister.Create("Ana Kasa", 500m, branch.Id);
        DbContext.CashRegisters.Add(register);
        DbContext.Shifts.Add(Shift.Create(branch.Id, register.Id, CurrentUser.UserId, 500m, 500m));
        await DbContext.SaveChangesAsync();
        return (order, register);
    }

    private Task<RestaurantBill.Domain.Shared.Result<bool>> PayAsync(Order order, CashRegister register) =>
        new CreatePaymentCommandHandler(Db, new FakeTableNotificationService(), new FakeCashierNotificationService(), CurrentUser)
            .Handle(new CreatePaymentCommand
            {
                OrderId = order.Id,
                CashRegisterId = register.Id,
                PaymentMethod = PaymentMethod.Iban,
                Items = order.OrderItems.Select(i => new PaymentItemDto { OrderItemId = i.Id, Quantity = i.Quantity }).ToList(),
            }, CancellationToken.None);

    [Fact]
    public async Task IbanPayment_IsRecorded_AndDoesNotTouchCashDrawer()
    {
        var (order, register) = await SeedAsync(withIban: true);

        var result = await PayAsync(order, register);

        Assert.True(result.IsSuccess, result.Error);
        Payment payment = await DbContext.Payments.SingleAsync();
        Assert.Equal(PaymentMethod.Iban, payment.PaymentMethod);
        Assert.Equal(200m, payment.TotalAmount);
        Assert.Empty(DbContext.CashTransactions);
        Assert.Equal(500m, (await DbContext.CashRegisters.SingleAsync()).Balance);
    }

    [Fact]
    public async Task IbanPayment_WithoutBranchIban_Fails()
    {
        var (order, register) = await SeedAsync(withIban: false);

        var result = await PayAsync(order, register);

        Assert.False(result.IsSuccess);
        Assert.Empty(DbContext.Payments);
    }
}
