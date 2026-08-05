using FluentValidation;

namespace RestaurantBill.Application.Features.Payments.Commands.CreatePayment;

public class CreatePaymentCommandValidator : AbstractValidator<CreatePaymentCommand>
{
    public CreatePaymentCommandValidator()
    {
        RuleFor(x => x.OrderId).NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş numarası girmelisiniz.");
        RuleFor(x => x.CashRegisterId).NotEqual(Guid.Empty).WithMessage("Geçersiz kasa Id.");
        RuleFor(x => x.PaymentMethod).IsInEnum().WithMessage("Geçersiz ödeme yöntemi.");
        RuleFor(x => x.Items).NotEmpty().WithMessage("Ödenecek en az bir ürün seçilmeli.");
        RuleFor(x => x.Items)
            .Must(items => items.Select(i => i.OrderItemId).Distinct().Count() == items.Count)
            .WithMessage("Aynı ürün birden fazla kez gönderilemez.");
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.OrderItemId).NotEqual(Guid.Empty).WithMessage("Geçersiz sipariş kalemi.");
            item.RuleFor(i => i.Quantity).GreaterThan(0).WithMessage("Miktar 0'dan büyük olmalı.");
        });
    }
}
