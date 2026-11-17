using RestaurantBill.Domain.Entities;
using FluentValidation;
namespace RestaurantBill.Application.Features.Tables.Commands.UpdateTable;

public class UpdateTableCommandValidator : AbstractValidator<UpdateTableCommand>
{
    public UpdateTableCommandValidator()
    {
        RuleFor(x => x.Id)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir masa seçilmelidir.");

        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Masa adı boş olamaz.")
            .MaximumLength(50).WithMessage("Masa adı en fazla 50 karakter olabilir.");

        RuleFor(x => x.RegionId)
            .NotEqual(Guid.Empty).WithMessage("Bölge seçilmelidir.");

        RuleFor(x => x.Capacity)
            .InclusiveBetween(1, Table.MaxCapacity).When(x => x.Capacity.HasValue)
            .WithMessage($"Kapasite 1 ile {Table.MaxCapacity} kişi arasında olmalı.");
    }
}
