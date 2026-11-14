using FluentValidation;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemsStatus;

public class UpdateOrderItemsStatusCommandValidator : AbstractValidator<UpdateOrderItemsStatusCommand>
{
    // Bir bilette bundan fazla kalem beklenmez; sınır, yanlışlıkla devasa liste gönderilmesine karşı.
    public const int MaxItems = 200;

    public UpdateOrderItemsStatusCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş seçilmelidir.");

        RuleFor(x => x.OrderItemIds)
            .NotEmpty().WithMessage("En az bir sipariş kalemi seçilmelidir.")
            .Must(ids => ids.Count <= MaxItems).WithMessage($"Tek seferde en fazla {MaxItems} kalem güncellenebilir.");

        RuleForEach(x => x.OrderItemIds)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş kalemi seçilmelidir.");

        RuleFor(x => x.Status)
            .Must(s => Enum.IsDefined(typeof(OrderItemStatus), s))
            .WithMessage("Geçerli bir durum seçilmelidir.");
    }
}
