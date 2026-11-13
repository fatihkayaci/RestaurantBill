using System.Reflection;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

// Tutar girerek (ürün seçmeden) ödeme: ürünler masada kalır, kalan = TotalPrice - PaidOnAccount.
public class OrderPayOnAccountTests
{
    private static Product CreateProduct(decimal price)
    {
        Product product = Product.Create("Köfte", price, "", Guid.NewGuid());
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(product, Guid.NewGuid());
        typeof(Product).GetProperty(nameof(Product.Category))!.SetValue(product, Category.Create("Yemek", Guid.NewGuid(), taxRate: 10m));
        return product;
    }

    private static (Order Order, Product Product) OrderOf(decimal price, int quantity)
    {
        Order order = Order.Create(Guid.NewGuid());
        Product product = CreateProduct(price);
        order.AddItem(product, quantity, 10m);
        return (order, product);
    }

    [Fact]
    public void PayOnAccount_ReducesRemaining_AndKeepsItems()
    {
        var (order, _) = OrderOf(100m, 3);

        order.PayOnAccount(120m);

        Assert.Equal(300m, order.TotalPrice);
        Assert.Equal(120m, order.PaidOnAccount);
        Assert.Equal(180m, order.RemainingAmount);
        Assert.Equal(3, order.OrderItems.Single().Quantity);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    [InlineData(300.01)]
    public void PayOnAccount_InvalidAmount_Throws(decimal amount)
    {
        var (order, _) = OrderOf(100m, 3);

        Assert.Throws<DomainException>(() => order.PayOnAccount(amount));
        Assert.Equal(0m, order.PaidOnAccount);
    }

    [Fact]
    public void PayOnAccount_ExactRemaining_Throws_BecauseClosingPaymentCarriesTheItems()
    {
        var (order, _) = OrderOf(100m, 3);
        order.PayOnAccount(100m);

        Assert.Throws<DomainException>(() => order.PayOnAccount(200m));
    }

    [Fact]
    public void Cancel_WithPaidOnAccount_Throws()
    {
        var (order, _) = OrderOf(100m, 3);
        order.PayOnAccount(50m);

        Assert.Throws<DomainException>(() => order.Cancel());
        Assert.NotEqual(OrderStatus.Cancelled, order.Status);
    }

    [Fact]
    public void RemoveItem_BelowPaidAmount_Throws()
    {
        var (order, product) = OrderOf(100m, 3);
        order.AddItem(CreateProduct(50m), 1, 10m);
        order.PayOnAccount(320m);

        Assert.Throws<DomainException>(() => order.RemoveItem(product.Id));
        Assert.Throws<DomainException>(() => order.UpdateItemQuantity(product.Id, 2));
        Assert.Equal(350m, order.TotalPrice);
    }

    [Fact]
    public void RemoveItem_StayingAbovePaidAmount_IsAllowed()
    {
        var (order, product) = OrderOf(100m, 3);
        Product dessert = CreateProduct(50m);
        order.AddItem(dessert, 1, 10m);
        order.PayOnAccount(200m);

        order.RemoveItem(dessert.Id);
        order.UpdateItemQuantity(product.Id, 2);

        Assert.Equal(200m, order.TotalPrice);
        Assert.Equal(0m, order.RemainingAmount);
    }

    [Fact]
    public void MergeFrom_CarriesPaidAmount()
    {
        var (target, _) = OrderOf(100m, 1);
        var (source, _) = OrderOf(80m, 2);
        source.PayOnAccount(60m);

        target.MergeFrom(source);

        Assert.Equal(260m, target.TotalPrice);
        Assert.Equal(60m, target.PaidOnAccount);
        Assert.Equal(200m, target.RemainingAmount);
        Assert.Equal(0m, source.PaidOnAccount);
        source.Cancel();
    }

    [Fact]
    public void Close_ClearsPaidOnAccount_AndBillRequest()
    {
        var (order, _) = OrderOf(100m, 1);
        order.RequestBill(DateTime.UtcNow);
        order.PayOnAccount(40m);

        order.Close();

        Assert.Equal(OrderStatus.Paid, order.Status);
        Assert.Equal(0m, order.PaidOnAccount);
        Assert.Null(order.BillRequestedAt);
    }

    [Fact]
    public void PayOnAccount_OnClosedOrder_Throws()
    {
        var (order, _) = OrderOf(100m, 1);
        order.Close();

        Assert.Throws<DomainException>(() => order.PayOnAccount(10m));
    }
}

public class PaymentOnAccountTests
{
    [Fact]
    public void OnAccountPayment_CannotCarryItemsOrDiscount()
    {
        Assert.Throws<DomainException>(() => Payment.Create(Guid.NewGuid(), Guid.NewGuid(), 100m, 90.91m, 9.09m, PaymentMethod.Kart, 1, isOnAccount: true));
        Assert.Throws<DomainException>(() => Payment.Create(Guid.NewGuid(), Guid.NewGuid(), 100m, 90.91m, 9.09m, PaymentMethod.Kart, 0, discountAmount: 5m, isOnAccount: true));
        Assert.Throws<DomainException>(() => Payment.Create(Guid.NewGuid(), Guid.NewGuid(), 0m, 0m, 0m, PaymentMethod.Kart, 0, isOnAccount: true));
    }

    [Fact]
    public void MoveToOrder_OnlyForOnAccountPayments()
    {
        Guid target = Guid.NewGuid();
        Payment onAccount = Payment.Create(Guid.NewGuid(), Guid.NewGuid(), 100m, 90.91m, 9.09m, PaymentMethod.Kart, 0, taxRate: 10m, isOnAccount: true);
        Payment regular = Payment.Create(Guid.NewGuid(), Guid.NewGuid(), 100m, 90.91m, 9.09m, PaymentMethod.Kart, 1, taxRate: 10m);

        onAccount.MoveToOrder(target);

        Assert.Equal(target, onAccount.OrderId);
        Assert.Throws<DomainException>(() => regular.MoveToOrder(target));
    }

    [Fact]
    public void PrepaidAmount_CannotBeNegative()
    {
        Assert.Throws<DomainException>(() => Payment.Create(Guid.NewGuid(), Guid.NewGuid(), 100m, 90.91m, 9.09m, PaymentMethod.Kart, 1, prepaidAmount: -1m));
    }
}
