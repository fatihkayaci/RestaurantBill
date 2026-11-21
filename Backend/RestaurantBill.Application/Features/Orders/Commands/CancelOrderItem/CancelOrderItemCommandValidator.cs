using FluentValidation;
namespace RestaurantBill.Application.Features.Orders.Commands.CancelOrderItem;

public class CancelOrderItemCommandValidator : AbstractValidator<CancelOrderItemCommand>
{
    public const int ReasonMaxLength = 200;

    public CancelOrderItemCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş seçilmelidir.");

        RuleFor(x => x.OrderItemId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş kalemi seçilmelidir.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("İptal edilecek adet 0'dan büyük olmalı.");

        RuleFor(x => x.Reason)
            .MaximumLength(ReasonMaxLength).WithMessage($"İptal nedeni en fazla {ReasonMaxLength} karakter olabilir.");
    }
}
