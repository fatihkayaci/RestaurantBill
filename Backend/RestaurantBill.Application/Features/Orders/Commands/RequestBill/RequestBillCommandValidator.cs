using FluentValidation;

namespace RestaurantBill.Application.Features.Orders.Commands.RequestBill;

public class RequestBillCommandValidator : AbstractValidator<RequestBillCommand>
{
    public RequestBillCommandValidator()
    {
        RuleFor(x => x.OrderId).NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş numarası girmelisiniz.");
    }
}
