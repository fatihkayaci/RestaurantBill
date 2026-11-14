using FluentValidation;

namespace RestaurantBill.Application.Features.Orders.Commands.AddSetMenuToOrder;

public class AddSetMenuToOrderCommandValidator : AbstractValidator<AddSetMenuToOrderCommand>
{
    public AddSetMenuToOrderCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş numarası girmelisiniz.");

        RuleFor(x => x.SetMenuId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir menü seçilmelidir.");

        RuleFor(x => x.Quantity)
            .GreaterThan(0).WithMessage("Menü adedi 0'dan büyük olmalıdır.");

        RuleFor(x => x.Note)
            .MaximumLength(300).WithMessage("Menü notu en fazla 300 karakter olabilir.");

        RuleFor(x => x.Selections)
            .Must(s => s.Select(x => x.SlotId).Distinct().Count() == s.Count)
            .WithMessage("Her bölüm için yalnızca bir seçim yapılabilir.");

        RuleForEach(x => x.Selections).ChildRules(selection =>
        {
            selection.RuleFor(s => s.SlotId).NotEqual(Guid.Empty).WithMessage("Geçerli bir bölüm seçilmelidir.");
            selection.RuleFor(s => s.ProductId).NotEqual(Guid.Empty).WithMessage("Geçerli bir ürün seçilmelidir.");
        });
    }
}
