using FluentValidation;

namespace RestaurantBill.Application.Features.Orders.Commands.TransferOrder;

public class TransferOrderCommandValidator : AbstractValidator<TransferOrderCommand>
{
    public TransferOrderCommandValidator()
    {
        RuleFor(x => x.SourceTableId).NotEqual(Guid.Empty).WithMessage("Geçersiz kaynak masa.");
        RuleFor(x => x.DestinationTableId).NotEqual(Guid.Empty).WithMessage("Geçersiz hedef masa.");
        RuleFor(x => x.Mode).IsInEnum().WithMessage("Geçersiz işlem.");
        RuleFor(x => x)
            .Must(x => x.SourceTableId != x.DestinationTableId)
            .WithMessage("Kaynak ve hedef masa aynı olamaz.")
            .WithName("DestinationTableId");
    }
}
