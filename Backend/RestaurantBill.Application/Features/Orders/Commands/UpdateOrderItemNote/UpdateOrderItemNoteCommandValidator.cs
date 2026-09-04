using FluentValidation;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderItemNote;

public class UpdateOrderItemNoteCommandValidator : AbstractValidator<UpdateOrderItemNoteCommand>
{
    public UpdateOrderItemNoteCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş seçilmelidir.");

        RuleFor(x => x.OrderItemId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş kalemi seçilmelidir.");

        RuleFor(x => x.Note)
            .MaximumLength(300).WithMessage("Ürün notu en fazla 300 karakter olabilir.");
    }
}
