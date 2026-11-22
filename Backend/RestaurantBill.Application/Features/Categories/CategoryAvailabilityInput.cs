using System.Globalization;
using FluentValidation;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Categories;

/// <summary>
/// Kategorinin servis penceresi (şubenin yerel saatiyle). Üçü de boş: her zaman. Days: gün bit maskesi (bit 0 = Pazar …
/// bit 6 = Cumartesi); null: her gün. From / Until "HH:mm"; From > Until gece yarısını aşan pencere demektir.
/// </summary>
public class CategoryAvailabilityInput
{
    public int? Days { get; set; }
    public string? From { get; set; }
    public string? Until { get; set; }

    public static bool TryParseTime(string? value, out TimeOnly? time)
    {
        time = null;
        if (string.IsNullOrWhiteSpace(value)) return true;
        if (!TimeOnly.TryParseExact(value.Trim(), "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out TimeOnly parsed))
            return false;
        time = parsed;
        return true;
    }

    /// <summary>Doğrulanmış girdiyi kategoriye yazar (doğrulayıcı biçimi kontrol eder).</summary>
    public void ApplyTo(Category category)
    {
        TryParseTime(From, out TimeOnly? from);
        TryParseTime(Until, out TimeOnly? until);
        category.SetAvailability(Days, from, until);
    }
}

public class CategoryAvailabilityInputValidator : AbstractValidator<CategoryAvailabilityInput>
{
    public CategoryAvailabilityInputValidator()
    {
        RuleFor(x => x.Days)
            .InclusiveBetween(1, Category.AllDaysMask).When(x => x.Days.HasValue)
            .WithMessage("En az bir gün seçilmelidir.");
        RuleFor(x => x.From)
            .Must(v => CategoryAvailabilityInput.TryParseTime(v, out _)).WithMessage("Başlangıç saati SS:dd biçiminde olmalıdır.");
        RuleFor(x => x.Until)
            .Must(v => CategoryAvailabilityInput.TryParseTime(v, out _)).WithMessage("Bitiş saati SS:dd biçiminde olmalıdır.");
        RuleFor(x => x)
            .Must(x => !(CategoryAvailabilityInput.TryParseTime(x.From, out TimeOnly? f) && CategoryAvailabilityInput.TryParseTime(x.Until, out TimeOnly? u)
                && f is not null && f == u))
            .WithMessage("Başlangıç ve bitiş saati aynı olamaz.");
    }
}
