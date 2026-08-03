using FluentValidation;
namespace RestaurantBill.Application.Features.Regions.Commands.UpdateRegion;

public class UpdateRegionCommandValidator : AbstractValidator<UpdateRegionCommand>
{
    public UpdateRegionCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir bölge seçilmelidir.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Bölge adı boş olamaz.")
            .MaximumLength(50).WithMessage("Bölge adı en fazla 50 karakter olabilir.");
    }
}
