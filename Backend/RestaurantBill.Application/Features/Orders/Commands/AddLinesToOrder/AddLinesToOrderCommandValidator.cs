using FluentValidation;
using RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder;

namespace RestaurantBill.Application.Features.Orders.Commands.AddLinesToOrder;

public class AddLinesToOrderCommandValidator : AbstractValidator<AddLinesToOrderCommand>
{
    public const int MaxLines = 100;

    public AddLinesToOrderCommandValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir sipariş numarası girmelisiniz.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Not alanı en fazla 500 karakter olabilir.");

        RuleFor(x => x)
            .Must(x => x.Products.Count + x.SetMenus.Count > 0)
            .WithMessage("Siparişe eklenecek en az bir ürün ya da menü seçmelisiniz.")
            .Must(x => x.Products.Count + x.SetMenus.Count <= MaxLines)
            .WithMessage($"Tek seferde en fazla {MaxLines} satır gönderilebilir.");

        RuleForEach(x => x.Products)
            .SetValidator(new CreateOrderItemDtoValidator());

        RuleForEach(x => x.SetMenus)
            .SetValidator(new SetMenuLineDtoValidator());
    }
}

public class SetMenuLineDtoValidator : AbstractValidator<SetMenuLineDto>
{
    public SetMenuLineDtoValidator()
    {
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
