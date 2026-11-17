using FluentValidation;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
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
    /// <summary>Menünün tamamına uygulanan indirim. Fiyat gönderilmez; ürün fiyatlarından sunucuda hesaplanır.</summary>
    public DiscountType DiscountType { get; set; }
    public decimal DiscountValue { get; set; }
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
    /// <summary>Bölümün kategorisi; verilirse seçenekler yalnızca bu kategorinin ürünleri olabilir.</summary>
    public Guid? CategoryId { get; set; }
    public List<SetMenuOptionInput> Options { get; set; } = [];
}

public class SetMenuOptionInput
{
    public Guid ProductId { get; set; }
    public bool IsDefault { get; set; }
    /// <summary>Bu ürüne menü içinde uygulanan indirim. Ek ücret gönderilmez; fiyat farkından hesaplanır.</summary>
    public DiscountType DiscountType { get; set; }
    public decimal DiscountValue { get; set; }
}

public abstract class SetMenuInputValidator<T> : AbstractValidator<T> where T : SetMenuInput
{
    public const int MaxOptionsPerSlot = 30;

    protected SetMenuInputValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Menü adı boş olamaz.")
            .MaximumLength(SetMenu.NameMaxLength).WithMessage($"Menü adı en fazla {SetMenu.NameMaxLength} karakter olabilir.");

        RuleFor(x => x.Description)
            .MaximumLength(SetMenu.DescriptionMaxLength).WithMessage($"Menü açıklaması en fazla {SetMenu.DescriptionMaxLength} karakter olabilir.");

        RuleFor(x => x.DiscountType).IsInEnum().WithMessage("Geçersiz indirim türü.");
        RuleFor(x => x.DiscountValue).GreaterThanOrEqualTo(0).WithMessage("İndirim 0'dan küçük olamaz.");

        RuleFor(x => x.Slots)
            .NotEmpty().WithMessage("Menüde en az bir bölüm olmalı.");

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
                option.RuleFor(o => o.DiscountType).IsInEnum().WithMessage("Geçersiz indirim türü.");
                option.RuleFor(o => o.DiscountValue).GreaterThanOrEqualTo(0).WithMessage("İndirim 0'dan küçük olamaz.");
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
        // Menünün ve bölümlerin kategorileri aynı şubede olmalı. Bölüm adı, kategorisi seçilmişse kategorinin adıdır.
        List<Guid> categoryIds = input.Slots.Select(s => s.CategoryId)
            .Append(input.CategoryId)
            .Where(id => id is Guid g && g != Guid.Empty)
            .Select(id => id!.Value)
            .Distinct()
            .ToList();
        Dictionary<Guid, string> categoryNames = await db.Categories
            .Where(c => categoryIds.Contains(c.Id) && c.BranchId == branchId)
            .ToDictionaryAsync(c => c.Id, c => c.Name, cancellationToken);
        if (categoryNames.Count != categoryIds.Count)
            return Result<List<SetMenuSlotDraft>>.Failure("Böyle bir kategori bulunamadı.");

        List<Guid> productIds = input.Slots.SelectMany(s => s.Options).Select(o => o.ProductId).Distinct().ToList();
        Dictionary<Guid, Product> products = await db.Products
            .Where(p => productIds.Contains(p.Id) && p.Category.BranchId == branchId)
            .ToDictionaryAsync(p => p.Id, cancellationToken);
        if (products.Count != productIds.Count)
            return Result<List<SetMenuSlotDraft>>.Failure("Menüye eklenen ürünlerden biri bulunamadı.");

        List<SetMenuSlotDraft> drafts = input.Slots
            .Select(slot =>
            {
                Guid? slotCategoryId = slot.CategoryId is Guid g && g != Guid.Empty ? g : null;
                return new SetMenuSlotDraft(
                    slotCategoryId is Guid id ? categoryNames[id] : slot.Name,
                    slot.Options.Select(o => new SetMenuOptionDraft(products[o.ProductId], o.IsDefault, o.DiscountType, o.DiscountValue)).ToList(),
                    slot.Id,
                    slotCategoryId);
            })
            .ToList();
        return Result<List<SetMenuSlotDraft>>.Success(drafts);
    }
}
