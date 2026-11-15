using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Domain.Entities;

/// <summary>
/// Paket menü ("Adana Menü" = Adana Kebap + İçecek seçimi + Patates). Menü bölümlerden (slot) oluşur;
/// tek seçenekli bölüm sabit üründür, çok seçenekli bölümde müşteri birini seçer.
/// Fiyat elle girilmez, ürünlerden hesaplanır:
///   seçeneğin fiyatı = ürün fiyatı − seçeneğin indirimi,
///   bölümün taban fiyatı = varsayılan seçeneğin fiyatı (varsayılan yoksa en ucuz seçenek),
///   seçeneğin ek ücreti = seçeneğin fiyatı − taban fiyat (0'ın altına inmez),
///   menü fiyatı = taban fiyatların toplamı − menü indirimi.
/// Hesaplanan fiyat ve ek ücretler kaydedilir; ürünün fiyatı değişince <see cref="RecalculatePrice"/> çağrılır.
/// Siparişte menü tek satırdır (fiyat + ek ücretler); içindeki ürünler mutfağa ayrı satır olarak düşer.
/// </summary>
public class SetMenu : BaseEntity
{
    public const int NameMaxLength = 100;
    public const int DescriptionMaxLength = Product.DescriptionMaxLength;

    public Guid BranchId { get; private set; }
    public Branch Branch { get; private set; } = default!;
    // Yalnızca gösterim ve rapor kırılımı için; null ise raporda "Menüler" başlığı altında görünür.
    public Guid? CategoryId { get; private set; }
    public Category? Category { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    /// <summary>Hesaplanmış satış fiyatı (menü indirimi düşülmüş).</summary>
    public decimal Price { get; private set; }
    /// <summary>Menünün tamamına uygulanan indirim.</summary>
    public DiscountType DiscountType { get; private set; }
    public decimal DiscountValue { get; private set; }
    public string ImageUrl { get; private set; } = string.Empty;
    public bool IsActive { get; private set; }
    public int SortOrder { get; private set; }

    private readonly List<SetMenuSlot> _slots = new();
    public IReadOnlyCollection<SetMenuSlot> Slots => _slots.AsReadOnly();

    protected SetMenu() { }

    public static SetMenu Create(Guid branchId, string name)
    {
        if (branchId == Guid.Empty)
            throw new DomainException("Geçersiz şube.");

        SetMenu setMenu = new() { BranchId = branchId, IsActive = true };
        setMenu.Update(name, string.Empty, isActive: true, sortOrder: 0, categoryId: null);
        return setMenu;
    }

    public void Update(string name, string? description, bool isActive, int sortOrder, Guid? categoryId)
    {
        string trimmedName = name?.Trim() ?? string.Empty;
        if (trimmedName.Length == 0)
            throw new DomainException("Menü adı boş olamaz.");
        if (trimmedName.Length > NameMaxLength)
            throw new DomainException($"Menü adı en fazla {NameMaxLength} karakter olabilir.");

        string trimmedDescription = description?.Trim() ?? string.Empty;
        if (trimmedDescription.Length > DescriptionMaxLength)
            throw new DomainException($"Menü açıklaması en fazla {DescriptionMaxLength} karakter olabilir.");

        if (categoryId == Guid.Empty)
            categoryId = null;

        Name = trimmedName;
        Description = trimmedDescription;
        IsActive = isActive;
        SortOrder = sortOrder;
        CategoryId = categoryId;
    }

    public void UpdateImage(string imageUrl)
    {
        if (string.IsNullOrWhiteSpace(imageUrl))
            throw new DomainException("Geçersiz görsel anahtarı.");

        ImageUrl = imageUrl;
    }

    /// <summary>
    /// Bölümleri ve menü indirimini birlikte ayarlar, ardından fiyatı hesaplar. İndirimler sonrası fiyat 0 ya da
    /// altına düşerse hata atar (menü bedava satılamaz).
    /// </summary>
    public void SetContents(IReadOnlyList<SetMenuSlotDraft> slots, DiscountType discountType, decimal discountValue)
    {
        Discount.Validate(discountType, discountValue, "Menü indirimi");
        SetSlots(slots);
        DiscountType = discountType;
        DiscountValue = discountValue;
        RecalculatePrice();

        if (Price <= 0)
            throw new DomainException("İndirimlerden sonra menü fiyatı 0'dan büyük olmalı.");
    }

    /// <summary>
    /// Bölümleri düzenleyicinin gönderdiği listeyle eşitler. Id'si olan taslak mevcut bölümü yerinde günceller (Id'si
    /// değişmez, böylece açık garson ekranındaki seçimler geçerli kalır); Id'siz taslak yeni bölümdür; listede olmayan
    /// bölüm silinir. Siparişler bölüme değil ürüne bağlı olduğu için açık siparişler etkilenmez.
    /// </summary>
    private void SetSlots(IReadOnlyList<SetMenuSlotDraft> slots)
    {
        if (slots is null || slots.Count == 0)
            throw new DomainException("Menüde en az bir bölüm olmalı.");

        // Önce hepsi denetlenir; hatalı taslakta menünün yarısı güncellenmiş kalmasın.
        foreach (SetMenuSlotDraft draft in slots)
            SetMenuSlot.Validate(draft);

        List<Guid> draftIds = slots.Where(d => d.Id is not null).Select(d => d.Id!.Value).ToList();
        if (draftIds.Distinct().Count() != draftIds.Count)
            throw new DomainException("Aynı bölüm iki kez gönderilmiş.");
        if (draftIds.Any(id => _slots.All(s => s.Id != id)))
            throw new DomainException($"{Name}: düzenlenen bölümlerden biri bu menüde yok.");

        _slots.RemoveAll(slot => !draftIds.Contains(slot.Id));

        for (int index = 0; index < slots.Count; index++)
        {
            SetMenuSlotDraft draft = slots[index];
            SetMenuSlot? existing = draft.Id is Guid id ? _slots.Single(s => s.Id == id) : null;
            if (existing is null)
                _slots.Add(SetMenuSlot.Create(draft, index));
            else
                existing.Update(draft, index);
        }
    }

    /// <summary>
    /// Fiyatı ve ek ücretleri güncel ürün fiyatlarından yeniden hesaplar. Seçeneklerin ürünleri yüklü olmalıdır.
    /// Hata atmaz: ürün ucuzlayıp fiyat 0'a inerse menü siparişe eklenemez (<see cref="Order.AddSetMenu"/>), menü düzenlenmelidir.
    /// </summary>
    public void RecalculatePrice()
    {
        decimal listPrice = 0m;
        foreach (SetMenuSlot slot in _slots)
            listPrice += slot.RecalculateSurcharges();

        Price = Discount.Apply(listPrice, DiscountType, DiscountValue);
    }

    /// <summary>Menü indirimi öncesi fiyat: bölümlerin taban fiyatlarının toplamı. Ürünler yüklü olmalıdır.</summary>
    public decimal GetListPrice() => _slots.Sum(slot => slot.GetBasePrice());

    /// <summary>
    /// İndirimsiz fiyat: bölümlerin taban seçeneklerinin normal ürün fiyatları toplamı (seçenek ve menü indirimi yok).
    /// Müşteriye "avantaj" göstermek için; Price'tan büyükse menü indirimlidir. Ürünler yüklü olmalıdır.
    /// </summary>
    public decimal GetRegularPrice() => _slots.Sum(slot => slot.GetBaseOption()?.Product.Price ?? 0m);

    /// <summary>
    /// Siparişte her bölüm için seçilen seçeneği bulur. Seçim yapılmamış bölümde varsayılan seçenek kullanılır;
    /// varsayılanı olmayan bölüm için seçim zorunludur. Bölüm sırasıyla döner.
    /// </summary>
    /// <param name="selections">Bölüm Id → seçilen ürün Id.</param>
    public IReadOnlyList<SetMenuSlotOption> ResolveSelections(IReadOnlyDictionary<Guid, Guid> selections)
    {
        HashSet<Guid> slotIds = _slots.Select(s => s.Id).ToHashSet();
        if (selections.Keys.Any(id => !slotIds.Contains(id)))
            throw new DomainException($"{Name}: seçilen bölüm bu menüde yok.");

        var chosen = new List<SetMenuSlotOption>();
        foreach (SetMenuSlot slot in _slots.OrderBy(s => s.SortOrder))
        {
            SetMenuSlotOption? option = selections.TryGetValue(slot.Id, out Guid productId)
                ? slot.Options.FirstOrDefault(o => o.ProductId == productId)
                    ?? throw new DomainException($"{Name}: \"{slot.Name}\" için seçilen ürün bu bölümde yok.")
                : slot.GetDefaultOption()
                    ?? throw new DomainException($"{Name}: \"{slot.Name}\" için bir seçim yapın.");

            chosen.Add(option);
        }

        return chosen;
    }

    /// <summary>Varsayılan seçeneklerle tahmini maliyet (ürün maliyetlerinin toplamı). Varsayılanı olmayan bölümde ilk seçenek alınır.</summary>
    public decimal GetEstimatedCost()
    {
        return _slots.Sum(slot => (slot.GetDefaultOption() ?? slot.Options.FirstOrDefault())?.Product?.Cost ?? 0m);
    }
}

/// <summary>Menünün bir bölümü: "Ana yemek", "İçecek". Tek seçenekliyse sabit üründür.</summary>
public class SetMenuSlot : BaseEntity
{
    public const int NameMaxLength = 60;

    public Guid SetMenuId { get; private set; }
    public SetMenu SetMenu { get; private set; } = default!;
    public string Name { get; private set; } = string.Empty;
    /// <summary>
    /// Bölümün kategorisi ("İçecekler"); seçenekler yalnızca bu kategorinin ürünlerinden olabilir. Eski menülerde ve
    /// kategori silinince null.
    /// </summary>
    public Guid? CategoryId { get; private set; }
    public Category? Category { get; private set; }
    public int SortOrder { get; private set; }

    private readonly List<SetMenuSlotOption> _options = new();
    public IReadOnlyCollection<SetMenuSlotOption> Options => _options.AsReadOnly();

    public bool IsFixed => _options.Count == 1;

    protected SetMenuSlot() { }

    internal static SetMenuSlot Create(SetMenuSlotDraft draft, int sortOrder)
    {
        SetMenuSlot slot = new();
        slot.Update(draft, sortOrder);
        return slot;
    }

    /// <summary>
    /// Adı, kategoriyi, sırayı ve seçenekleri günceller. Seçenekler ürüne göre eşlenir: aynı ürün yerinde güncellenir,
    /// yeni ürün eklenir, listede olmayan çıkarılır.
    /// </summary>
    internal void Update(SetMenuSlotDraft draft, int sortOrder)
    {
        Name = Validate(draft);
        CategoryId = draft.CategoryId;
        SortOrder = sortOrder;

        HashSet<Guid> productIds = draft.Options.Select(o => o.Product.Id).ToHashSet();
        _options.RemoveAll(option => !productIds.Contains(option.ProductId));

        // Tek seçenekli bölüm sabit üründür; seçeneği her zaman varsayılandır.
        bool single = draft.Options.Count == 1;
        foreach (SetMenuOptionDraft optionDraft in draft.Options)
        {
            bool isDefault = single || optionDraft.IsDefault;
            SetMenuSlotOption? existing = _options.FirstOrDefault(o => o.ProductId == optionDraft.Product.Id);
            if (existing is null)
                _options.Add(SetMenuSlotOption.Create(optionDraft.Product, isDefault, optionDraft.DiscountType, optionDraft.DiscountValue));
            else
                existing.Update(isDefault, optionDraft.DiscountType, optionDraft.DiscountValue);
        }
    }

    /// <summary>Taslağın kurallarını denetler ve kırpılmış bölüm adını döner.</summary>
    internal static string Validate(SetMenuSlotDraft draft)
    {
        string name = draft.Name?.Trim() ?? string.Empty;
        if (name.Length == 0)
            throw new DomainException("Bölüm adı boş olamaz.");
        if (name.Length > NameMaxLength)
            throw new DomainException($"Bölüm adı en fazla {NameMaxLength} karakter olabilir.");

        if (draft.Options is null || draft.Options.Count == 0)
            throw new DomainException($"\"{name}\" bölümünde en az bir ürün olmalı.");

        if (draft.Options.Select(o => o.Product.Id).Distinct().Count() != draft.Options.Count)
            throw new DomainException($"\"{name}\" bölümünde aynı ürün iki kez eklenmiş.");

        if (draft.Options.Count(o => o.IsDefault) > 1)
            throw new DomainException($"\"{name}\" bölümünde yalnızca bir varsayılan seçenek olabilir.");

        if (draft.CategoryId is Guid categoryId && draft.Options.Any(o => o.Product.CategoryId != categoryId))
            throw new DomainException($"\"{name}\" bölümüne yalnızca o kategorinin ürünleri eklenebilir.");

        foreach (SetMenuOptionDraft option in draft.Options)
            Discount.Validate(option.DiscountType, option.DiscountValue, option.Product.Name);

        return name;
    }

    public SetMenuSlotOption? GetDefaultOption() =>
        _options.FirstOrDefault(o => o.IsDefault) ?? (IsFixed ? _options[0] : null);

    /// <summary>Menü fiyatına giren seçenek: varsayılan seçenek, varsayılan yoksa (indirimli fiyatıyla) en ucuz seçenek.</summary>
    public SetMenuSlotOption? GetBaseOption() =>
        GetDefaultOption() ?? _options.MinBy(o => o.GetPrice());

    /// <summary>Menü fiyatına giren tutar: taban seçeneğin (indirimli) fiyatı.</summary>
    public decimal GetBasePrice() => GetBaseOption()?.GetPrice() ?? 0m;

    /// <summary>Her seçeneğin ek ücretini taban fiyata göre yazar ve taban fiyatı döner.</summary>
    internal decimal RecalculateSurcharges()
    {
        decimal basePrice = GetBasePrice();
        foreach (SetMenuSlotOption option in _options)
            option.SetSurcharge(Math.Max(0m, option.GetPrice() - basePrice));
        return basePrice;
    }
}

/// <summary>Bölümdeki bir seçenek: ürün + isteğe bağlı indirim. Ek ücret ("Kola +10 ₺") fiyattan hesaplanır.</summary>
public class SetMenuSlotOption : BaseEntity
{
    public Guid SetMenuSlotId { get; private set; }
    public SetMenuSlot SetMenuSlot { get; private set; } = default!;
    public Guid ProductId { get; private set; }
    public Product Product { get; private set; } = default!;
    /// <summary>Hesaplanmış ek ücret: bu seçeneğin fiyatı − bölümün taban fiyatı.</summary>
    public decimal Surcharge { get; private set; }
    public bool IsDefault { get; private set; }
    /// <summary>Bu ürüne menü içinde uygulanan indirim.</summary>
    public DiscountType DiscountType { get; private set; }
    public decimal DiscountValue { get; private set; }

    protected SetMenuSlotOption() { }

    internal static SetMenuSlotOption Create(Product product, bool isDefault, DiscountType discountType, decimal discountValue)
    {
        if (product is null)
            throw new DomainException("Geçersiz ürün.");

        SetMenuSlotOption option = new() { Product = product, ProductId = product.Id };
        option.Update(isDefault, discountType, discountValue);
        return option;
    }

    internal void Update(bool isDefault, DiscountType discountType, decimal discountValue)
    {
        IsDefault = isDefault;
        DiscountType = discountType;
        DiscountValue = discountValue;
    }

    internal void SetSurcharge(decimal surcharge) => Surcharge = surcharge;

    /// <summary>Menü içindeki fiyatı: ürün fiyatı − indirim. Ürün yüklü olmalıdır.</summary>
    public decimal GetPrice() => Discount.Apply(Product.Price, DiscountType, DiscountValue);
}

/// <param name="Id">Mevcut bölümün Id'si; yeni bölümde null.</param>
/// <param name="CategoryId">Bölümün kategorisi; verilirse tüm seçenekler bu kategoriden olmalıdır.</param>
public sealed record SetMenuSlotDraft(string Name, IReadOnlyList<SetMenuOptionDraft> Options, Guid? Id = null, Guid? CategoryId = null);

public sealed record SetMenuOptionDraft(Product Product, bool IsDefault, DiscountType DiscountType = DiscountType.None, decimal DiscountValue = 0m);
