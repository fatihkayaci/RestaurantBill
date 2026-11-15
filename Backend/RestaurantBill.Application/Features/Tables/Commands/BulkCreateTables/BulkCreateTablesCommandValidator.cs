using FluentValidation;
namespace RestaurantBill.Application.Features.Tables.Commands.BulkCreateTables;

public class BulkCreateTablesCommandValidator : AbstractValidator<BulkCreateTablesCommand>
{
    // Ön ek 40 karakteri, numara 5 haneyi geçmediği için masa adı tekli eklemedeki 50 karakter sınırında kalır.
    public const int MaxPrefixLength = 40;
    public const int MaxStartNumber = 9999;

    public BulkCreateTablesCommandValidator()
    {
        RuleFor(x => x.RegionId)
            .NotEqual(Guid.Empty).WithMessage("Bölge seçilmelidir.");

        RuleFor(x => x.Prefix)
            .NotNull().WithMessage("Ön ek boş bırakılamaz.")
            .MaximumLength(MaxPrefixLength).WithMessage($"Ön ek en fazla {MaxPrefixLength} karakter olabilir.");

        RuleFor(x => x.StartNumber)
            .InclusiveBetween(1, MaxStartNumber).WithMessage($"Başlangıç numarası 1 ile {MaxStartNumber} arasında olmalıdır.");

        RuleFor(x => x.Count)
            .InclusiveBetween(1, BulkCreateTablesCommand.MaxCount)
            .WithMessage($"Tek seferde 1 ile {BulkCreateTablesCommand.MaxCount} arasında masa eklenebilir.");
    }
}
