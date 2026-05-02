using FluentValidation;
using RestaurantBill.Application.Features.Products.Commands.DeleteProduct;

namespace RestaurantBill.Application.Validators.Product;

public class DeleteProductCommandValidator : AbstractValidator<DeleteProductCommand>
{
    public DeleteProductCommandValidator()
    {
        RuleFor(x => x.Id)
            .GreaterThan(0).WithMessage("Geçerli bir ürün seçilmelidir.");
    }
}
