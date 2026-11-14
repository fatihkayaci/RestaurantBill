using FluentValidation;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.SetMenus;

/// <summary>
/// Menü oluşturma ve güncellemenin ortak gövdesi: menünün tamamı (bölümleri ve seçenekleriyle) gönderilir.
/// Güncellemede mevcut bölümler Id'leriyle gelir; seçenekler bölüm içinde ürüne göre eşlenir.
/// </summary>
public abstract class SetMenuInput
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
    /// <summary>İsteğe bağlı gösterim kategorisi (raporda menü bu kategori altında görünür; KDV oranı da ondan gelir).</summary>
    public Guid? CategoryId { get; set; }
    public List<SetMenuSlotInput> Slots { get; set; } = [];
}

public class SetMenuSlotInput
{
    /// <summary>Mevcut bölümün Id'si (bölüm yerinde güncellenir, Id'si değişmez); yeni bölümde boş.</summary>
    public Guid? Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<SetMenuOptionInput> Options { get; set; } = [];
}

public class SetMenuOptionInput
{
    public Guid ProductId { get; set; }
    public decimal Surcharge { get; set; }
    public bool IsDefault { get; set; }
}

public abstract class SetMenuInputValidator<T> : AbstractValidator<T> where T : SetMenuInput
{
    public const int MaxSlots = 10;
    public const int MaxOptionsPerSlot = 30;

    protected SetMenuInputValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Menü adı boş olamaz.")
            .MaximumLength(SetMenu.NameMaxLength).WithMessage($"Menü adı en fazla {SetMenu.NameMaxLength} karakter olabilir.");

        RuleFor(x => x.Description)
            .MaximumLength(SetMenu.DescriptionMaxLength).WithMessage($"Menü açıklaması en fazla {SetMenu.DescriptionMaxLength} karakter olabilir.");

        RuleFor(x => x.Price)
            .GreaterThan(0).WithMessage("Menü fiyatı 0'dan büyük olmalıdır.");

        RuleFor(x => x.Slots)
            .NotEmpty().WithMessage("Menüde en az bir bölüm olmalı.")
            .Must(s => s.Count <= MaxSlots).WithMessage($"Bir menüde en fazla {MaxSlots} bölüm olabilir.");

        RuleForEach(x => x.Slots).ChildRules(slot =>
        {
            slot.RuleFor(s => s.Name)
                .NotEmpty().WithMessage("Bölüm adı boş olamaz.")
                .MaximumLength(SetMenuSlot.NameMaxLength).WithMessage($"Bölüm adı en fazla {SetMenuSlot.NameMaxLength} karakter olabilir.");

            slot.RuleFor(s => s.Options)
                .NotEmpty().WithMessage("Her bölümde en az bir ürün olmalı.")
                .Must(o => o.Count <= MaxOptionsPerSlot).WithMessage($"Bir bölümde en fazla {MaxOptionsPerSlot} seçenek olabilir.");

            slot.RuleForEach(s => s.Options).ChildRules(option =>
            {
                option.RuleFor(o => o.ProductId).NotEqual(Guid.Empty).WithMessage("Geçerli bir ürün seçilmelidir.");
                option.RuleFor(o => o.Surcharge).GreaterThanOrEqualTo(0).WithMessage("Ek ücret 0'dan küçük olamaz.");
            });
        });
    }
}

public static class SetMenuInputMapper
{
    /// <summary>
    /// Gövdedeki ürünleri menünün şubesinde arar ve alan modelinin bölüm taslaklarına çevirir. Kategori de aynı şubede olmalı.
    /// Bölümlerin kuralları (boş bölüm, aynı ürün iki kez, birden çok varsayılan) alan modelinde denetlenir.
    /// </summary>
    public static async Task<Result<List<SetMenuSlotDraft>>> ToSlotDraftsAsync(
        this SetMenuInput input, IAppDbContext db, Guid branchId, CancellationToken cancellationToken)
    {
        if (input.CategoryId is Guid categoryId && categoryId != Guid.Empty)
        {
            bool categoryInBranch = await db.Categories.AnyAsync(c => c.Id == categoryId && c.BranchId == branchId, cancellationToken);
            if (!categoryInBranch)
                return Result<List<SetMenuSlotDraft>>.Failure("Böyle bir kategori bulunamadı.");
        }

        List<Guid> productIds = input.Slots.SelectMany(s => s.Options).Select(o => o.ProductId).Distinct().ToList();
        Dictionary<Guid, Product> products = await db.Products
            .Where(p => productIds.Contains(p.Id) && p.Category.BranchId == branchId)
            .ToDictionaryAsync(p => p.Id, cancellationToken);
        if (products.Count != productIds.Count)
            return Result<List<SetMenuSlotDraft>>.Failure("Menüye eklenen ürünlerden biri bulunamadı.");

        List<SetMenuSlotDraft> drafts = input.Slots
            .Select(slot => new SetMenuSlotDraft(
                slot.Name,
                slot.Options.Select(o => new SetMenuOptionDraft(products[o.ProductId], o.Surcharge, o.IsDefault)).ToList(),
                slot.Id))
            .ToList();
        return Result<List<SetMenuSlotDraft>>.Success(drafts);
    }
}
