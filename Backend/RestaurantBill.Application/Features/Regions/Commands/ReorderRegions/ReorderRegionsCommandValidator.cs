using FluentValidation;

namespace RestaurantBill.Application.Features.Regions.Commands.ReorderRegions
{
    public class ReorderRegionsCommandValidator : AbstractValidator<ReorderRegionsCommand>
    {
        public ReorderRegionsCommandValidator()
        {
            RuleFor(x => x.OrderedRegionIds).NotEmpty().WithMessage("Sıralanacak bölge listesi boş olamaz.");
            RuleFor(x => x.OrderedRegionIds)
                .Must(ids => ids.Distinct().Count() == ids.Count)
                .WithMessage("Aynı bölge birden fazla kez gönderilemez.");
        }
    }
}
