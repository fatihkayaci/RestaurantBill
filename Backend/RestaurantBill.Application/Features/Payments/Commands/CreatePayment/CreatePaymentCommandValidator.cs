using FluentValidation;

namespace RestaurantBill.Application.Features.Payments.Commands.CreatePayment;

public class CreatePaymentCommandValidator : AbstractValidator<CreatePaymentCommand>
{
    public CreatePaymentCommandValidator()
    {
        RuleFor(x => x.OrderId).NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş numarası girmelisiniz.");
        RuleFor(x => x.CashRegisterId).NotEqual(Guid.Empty).WithMessage("Geçersiz kasa Id.");
        RuleFor(x => x.PaymentMethod).IsInEnum().WithMessage("Geçersiz ödeme yöntemi.");
    }
}
