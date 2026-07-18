using FluentValidation;

namespace RestaurantBill.Application.Features.Regions.Commands.CreateRegion;

public class CreateRegionCommandValidator : AbstractValidator<CreateRegionCommand>
{
    public CreateRegionCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Bölge adı boş olamaz.")
            .MaximumLength(50).WithMessage("Bölge adı en fazla 50 karakter olabilir.");
    }
}
