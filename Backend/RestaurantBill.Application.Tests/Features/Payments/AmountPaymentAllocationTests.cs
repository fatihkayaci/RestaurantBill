using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Payments;
using RestaurantBill.Application.Features.Payments.Commands.CreatePayment;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Payments;

public class AmountPaymentAllocationTests
{
    [Theory]
    [InlineData(100)]
    [InlineData(0.01)]
    [InlineData(333.33)]
    [InlineData(1000)]
    public void Split_AlwaysSumsToAmount(decimal amount)
    {
        var weights = new Dictionary<decimal, decimal> { [1m] = 123.45m, [10m] = 600m, [20m] = 77.7m };

        Dictionary<decimal, decimal> shares = PaymentAllocation.Split(amount, weights);

        Assert.Equal(amount, shares.Values.Sum());
        Assert.All(shares.Values, s => Assert.True(s >= 0m));
    }

    [Fact]
    public void Split_IsProportional()
    {
        var weights = new Dictionary<decimal, decimal> { [10m] = 600m, [20m] = 300m };

        Dictionary<decimal, decimal> shares = PaymentAllocation.Split(300m, weights);

        Assert.Equal(200m, shares[10m]);
        Assert.Equal(100m, shares[20m]);
    }

    [Fact]
    public void Split_ZeroWeight_GetsNothing()
    {
        var weights = new Dictionary<decimal, decimal> { [10m] = 0m, [20m] = 50m };

        Dictionary<decimal, decimal> shares = PaymentAllocation.Split(30m, weights);

        Assert.Equal(0m, shares[10m]);
        Assert.Equal(30m, shares[20m]);
    }

    [Fact]
    public void CreditByRate_UsesPerRateHistory()
    {
        var gross = new Dictionary<decimal, decimal> { [10m] = 600m, [20m] = 300m };
        var paid = new Dictionary<decimal, decimal> { [10m] = 333.33m, [20m] = 166.67m };

        Dictionary<decimal, decimal> credit = PaymentAllocation.CreditByRate(gross, paid);

        Assert.Equal(333.33m, credit[10m]);
        Assert.Equal(166.67m, credit[20m]);
    }

    [Fact]
    public void CreditByRate_SpillsExcessOfARemovedRateToOtherRates()
    {
        // %20'lik ürünler hesaba ödemeden sonra iptal edildi: o orana yazılan ₺100 diğer orana kayar.
        var gross = new Dictionary<decimal, decimal> { [10m] = 600m };
        var paid = new Dictionary<decimal, decimal> { [10m] = 200m, [20m] = 100m };

        Dictionary<decimal, decimal> credit = PaymentAllocation.CreditByRate(gross, paid);

        Assert.Equal(300m, credit[10m]);
    }

    [Fact]
    public void SplitTax_MatrahPlusTaxEqualsGross()
    {
        (decimal matrah, decimal tax) = PaymentAllocation.SplitTax(133.33m, 10m);

        Assert.Equal(121.21m, matrah);
        Assert.Equal(133.33m, matrah + tax);
    }
}

public class CreatePaymentCommandValidatorAmountTests
{
    private readonly CreatePaymentCommandValidator _validator = new();

    private static CreatePaymentCommand Command(decimal? amount, bool withItems = false, decimal? discountPercent = null) => new()
    {
        OrderId = Guid.NewGuid(),
        CashRegisterId = Guid.NewGuid(),
        PaymentMethod = PaymentMethod.Kart,
        Amount = amount,
        DiscountPercent = discountPercent,
        Items = withItems ? [new PaymentItemDto { OrderItemId = Guid.NewGuid(), Quantity = 1 }] : [],
    };

    [Fact]
    public void AmountOnly_IsValid() => Assert.True(_validator.Validate(Command(150.5m)).IsValid);

    [Fact]
    public void NeitherAmountNorItems_IsInvalid() => Assert.False(_validator.Validate(Command(null)).IsValid);

    [Fact]
    public void AmountWithItems_IsInvalid() => Assert.False(_validator.Validate(Command(100m, withItems: true)).IsValid);

    [Fact]
    public void AmountWithDiscount_IsInvalid() => Assert.False(_validator.Validate(Command(100m, discountPercent: 10m)).IsValid);

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(10.005)]
    public void InvalidAmount_IsInvalid(decimal amount) => Assert.False(_validator.Validate(Command(amount)).IsValid);
}
