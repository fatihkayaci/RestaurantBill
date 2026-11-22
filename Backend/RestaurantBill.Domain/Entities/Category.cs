using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Domain.Entities;
public class Category : BaseEntity
{
    public Guid BranchId { get; private set; }
    public Branch Branch { get; private set; } = default!;
    public string Name { get; private set; } = string.Empty;
    public decimal? TaxRate { get; private set; }
    // Şube içindeki sıra (küçük önce). Menüde, garsonda ve sitede bu sırayla listelenir; yeni kategori sona eklenir.
    public int SortOrder { get; private set; }
    // Müşteri menüsünde ürünlerin görünümü (kart / liste); varsayılan otomatik (fotoğraf oranına göre).
    public CategoryMenuDisplay MenuDisplay { get; private set; } = CategoryMenuDisplay.Auto;
    // Servis penceresi (şubenin yerel saatiyle): pide fırını kapanınca "Pide" kategorisi o saatten sonra sipariş
    // edilemez. Üçü de null: her zaman. AvailableDays bit maskesi (bit 0 = Pazar … bit 6 = Cumartesi, DayOfWeek sırası)
    // pencerenin başladığı günleri seçer; null: her gün. Yalnız From: o saatten gün sonuna; yalnız Until: gün
    // başından o saate. From > Until ise pencere gece yarısını aşar (22:00–02:00) ve başladığı güne sayılır.
    public int? AvailableDays { get; private set; }
    public TimeOnly? AvailableFrom { get; private set; }
    public TimeOnly? AvailableUntil { get; private set; }

    public const int AllDaysMask = 0b111_1111;
    public const int WeekdaysMask = 0b011_1110;
    public const int WeekendMask = 0b100_0001;

    protected Category() { }

    public static Category Create(string name, Guid branchId, decimal? taxRate = null)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Kategori adı boş olamaz.");

        if (branchId == Guid.Empty)
            throw new DomainException("Geçersiz şube.");

        return new Category
        {
            Name = name,
            BranchId = branchId,
            TaxRate = taxRate
        };
    }

    public void Rename(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Kategori adı boş olamaz.");

        Name = name;
    }

    public void SetSortOrder(int sortOrder)
    {
        SortOrder = sortOrder;
    }

    public void SetMenuDisplay(CategoryMenuDisplay display)
    {
        if (!Enum.IsDefined(display))
            throw new DomainException("Geçersiz menü görünümü.");
        MenuDisplay = display;
    }

    public bool HasAvailabilityWindow => AvailableDays is not null || AvailableFrom is not null || AvailableUntil is not null;

    /// <summary>Servis penceresini değiştirir; hepsi null: her zaman. Bütün günler seçiliyse gün maskesi tutulmaz.</summary>
    public void SetAvailability(int? days, TimeOnly? from, TimeOnly? until)
    {
        if (days is int mask && (mask <= 0 || mask > AllDaysMask))
            throw new DomainException("En az bir gün seçilmelidir.");

        if (from is TimeOnly f && until is TimeOnly u && f == u)
            throw new DomainException("Başlangıç ve bitiş saati aynı olamaz.");

        AvailableDays = days == AllDaysMask ? null : days;
        AvailableFrom = from;
        AvailableUntil = until;
    }

    /// <summary>Kategori bu yerel anda sipariş edilebilir mi (pencere yoksa her zaman).</summary>
    public bool IsAvailableAt(DateTime local) => IsAvailableAt(AvailableDays, AvailableFrom, AvailableUntil, local);

    public static bool IsAvailableAt(int? days, TimeOnly? from, TimeOnly? until, DateTime local)
    {
        TimeOnly now = TimeOnly.FromDateTime(local);
        DayOfWeek today = local.DayOfWeek;
        DayOfWeek yesterday = (DayOfWeek)(((int)today + 6) % 7);
        bool DayOn(DayOfWeek day) => days is not int mask || (mask & (1 << (int)day)) != 0;

        switch (from, until)
        {
            case (null, null):
                return DayOn(today);
            case (TimeOnly f, null):
                return DayOn(today) && now >= f;
            case (null, TimeOnly u):
                return DayOn(today) && now < u;
            case (TimeOnly f, TimeOnly u) when f < u:
                return DayOn(today) && now >= f && now < u;
            case (TimeOnly f, TimeOnly u):
                // Gece yarısını aşan pencere: akşam kısmı bugüne, gece kısmı dünkü pencereye aittir.
                return (DayOn(today) && now >= f) || (DayOn(yesterday) && now < u);
        }
    }

    /// <summary>Müşteriye gösterilen kısa açıklama: "12:00'ye kadar", "18:00'den itibaren", "Hafta içi 08:00–12:00". Pencere yoksa boş.</summary>
    public string AvailabilityLabel() => AvailabilityLabel(AvailableDays, AvailableFrom, AvailableUntil);

    public static string AvailabilityLabel(int? days, TimeOnly? from, TimeOnly? until)
    {
        string time = (from, until) switch
        {
            (TimeOnly f, TimeOnly u) => $"{TurkishTime.Format(f)}–{TurkishTime.Format(u)}",
            (TimeOnly f, null) => $"{TurkishTime.Ablative(f)} itibaren",
            (null, TimeOnly u) => $"{TurkishTime.Dative(u)} kadar",
            _ => string.Empty,
        };
        string day = DaysLabel(days);
        return string.Join(" ", new[] { day, time }.Where(x => x.Length > 0));
    }

    private static readonly string[] ShortDayNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];

    private static string DaysLabel(int? days)
    {
        if (days is not int mask || mask == AllDaysMask) return string.Empty;
        if (mask == WeekdaysMask) return "Hafta içi";
        if (mask == WeekendMask) return "Hafta sonu";
        // Pazartesiden başlayarak.
        int[] order = [1, 2, 3, 4, 5, 6, 0];
        return string.Join(", ", order.Where(d => (mask & (1 << d)) != 0).Select(d => ShortDayNames[d]));
    }

    public void SetTaxRate(decimal? taxRate)
    {
        TaxRate = taxRate;
    }

    public decimal GetEffectiveTaxRate()
    {
        return TaxRate ?? Branch.TaxRate;
    }

    public void EnsureCanBeDeleted(IEnumerable<Product> linkedProducts)
    {
        if (linkedProducts.Any())
            throw new DomainException("Bu kategoriye bağlı ürünler bulunmaktadır. Lütfen silmeden önce ilgili ürünlerin kategorisini güncelleyin.");
    }
}