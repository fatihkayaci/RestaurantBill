using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.DTOs.CustomerSite;

public class PublicSiteDto
{
    public string CompanyName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string OpenAddress { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public List<PublicBranchDto> Branches { get; set; } = [];
    public List<PublicCategoryDto> Categories { get; set; } = [];
    public List<PublicRegionDto> Regions { get; set; } = [];
    public BranchSiteDto Site { get; set; } = new();
    /// <summary>Şubenin yerel saatiyle şu an açık mı; saat girilmemişse null.</summary>
    public bool? IsOpenNow { get; set; }
    /// <summary>Sitenin rezervasyon arayüzünün ihtiyaç duyduğu kurallar.</summary>
    public ReservationRulesDto Reservation { get; set; } = new();
}

// Şubenin rezervasyon ayarları. Müşteri sitesi ve admin "Rezervasyon ayarları" aynı şekli kullanır.
public class ReservationRulesDto
{
    public bool Enabled { get; set; }
    public int SlotIntervalMinutes { get; set; }
    public int DurationMinutes { get; set; }
    public int MaxDaysAhead { get; set; }
    public int MaxPartySize { get; set; }
    /// <summary>Pazartesi → Pazar; Day: 0 Pazar … 6 Cumartesi (JS Date.getDay ile aynı).</summary>
    public List<ReservationDayDto> Days { get; set; } = [];
    /// <summary>false: şubede hiç kaydedilmemiş, değerler varsayılan (açılış/kapanış saatinden türetilir).</summary>
    public bool IsCustomized { get; set; }

    public static ReservationRulesDto From(Branch branch)
    {
        ReservationSettings settings = branch.GetReservationSettings();
        return new ReservationRulesDto
        {
            Enabled = settings.Enabled,
            SlotIntervalMinutes = settings.SlotIntervalMinutes,
            DurationMinutes = settings.DurationMinutes,
            MaxDaysAhead = settings.MaxDaysAhead,
            MaxPartySize = settings.MaxPartySize,
            Days = settings.Days.Select(ReservationDayDto.From).ToList(),
            IsCustomized = branch.ReservationSettings is not null,
        };
    }
}

public class ReservationDayDto
{
    public int Day { get; set; }
    public bool IsOpen { get; set; }
    /// <summary>"HH:mm"</summary>
    public string FirstStart { get; set; } = string.Empty;
    public string LastStart { get; set; } = string.Empty;

    public static ReservationDayDto From(ReservationDayHours hours) => new()
    {
        Day = (int)hours.Day,
        IsOpen = hours.IsOpen,
        FirstStart = hours.FirstStart.ToString("HH:mm", System.Globalization.CultureInfo.InvariantCulture),
        LastStart = hours.LastStart.ToString("HH:mm", System.Globalization.CultureInfo.InvariantCulture),
    };
}

public class PublicBranchDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class PublicCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<PublicProductDto> Products { get; set; } = [];
}

public class PublicProductDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsFeatured { get; set; }
    /// <summary>Tahmini hazırlanma süresi (dk); null ise gösterilmez.</summary>
    public int? PrepMinutes { get; set; }
}

// Şubenin site içeriği. Admin "Restoran sitesi" sayfasında da aynı şekil kullanılır (görseller tam adresle).
public class BranchSiteDto
{
    public string Headline { get; set; } = string.Empty;
    public string Tagline { get; set; } = string.Empty;
    public string StoryTitle { get; set; } = string.Empty;
    public string About { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public string AboutImageUrl { get; set; } = string.Empty;
    /// <summary>"HH:mm" ya da null.</summary>
    public string? OpensAt { get; set; }
    public string? ClosesAt { get; set; }
    public string HoursNote { get; set; } = string.Empty;
    public string InstagramUrl { get; set; } = string.Empty;
    public string AccentColor { get; set; } = string.Empty;

    public static BranchSiteDto From(Branch branch, string cdnBaseUrl) => new()
    {
        Headline = branch.SiteHeadline,
        Tagline = branch.SiteTagline,
        StoryTitle = branch.SiteStoryTitle,
        About = branch.SiteAbout,
        CoverImageUrl = string.IsNullOrWhiteSpace(branch.SiteCoverImage) ? string.Empty : $"{cdnBaseUrl}/{branch.SiteCoverImage}",
        AboutImageUrl = string.IsNullOrWhiteSpace(branch.SiteAboutImage) ? string.Empty : $"{cdnBaseUrl}/{branch.SiteAboutImage}",
        OpensAt = branch.OpensAt?.ToString("HH:mm", System.Globalization.CultureInfo.InvariantCulture),
        ClosesAt = branch.ClosesAt?.ToString("HH:mm", System.Globalization.CultureInfo.InvariantCulture),
        HoursNote = branch.HoursNote,
        InstagramUrl = branch.InstagramUrl,
        AccentColor = branch.SiteAccentColor,
    };
}

public class PublicRegionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<PublicTableDto> Tables { get; set; } = [];
}

public class PublicTableDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class PublicTableInfoDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string RegionName { get; set; } = string.Empty;
    public Guid BranchId { get; set; }
}

public class AvailabilityDto
{
    public List<Guid> UnavailableTableIds { get; set; } = [];
}

public class OrderRequestStatusDto
{
    public Guid Id { get; set; }
    public int Status { get; set; }
}

public class ReservationStatusDto
{
    public Guid Id { get; set; }
    public int Status { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public int PartySize { get; set; }
}

public class OrderRequestDto
{
    public Guid Id { get; set; }
    public Guid TableId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string RegionName { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public decimal Total { get; set; }
    public List<OrderRequestItemDto> Items { get; set; } = [];
}

public class OrderRequestItemDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string Note { get; set; } = string.Empty;
}

public class StaffReservationDto
{
    public Guid Id { get; set; }
    public int Status { get; set; }
    public Guid TableId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public string RegionName { get; set; } = string.Empty;
    public string GuestName { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public int PartySize { get; set; }
    // Şubenin saat diliminde: "2026-11-14", "19:30", "21:30".
    public string Date { get; set; } = string.Empty;
    public string Time { get; set; } = string.Empty;
    public string EndTime { get; set; } = string.Empty;
    public DateTime StartsAtUtc { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DaySlotDto
{
    /// <summary>Şubenin yerel saatiyle "HH:mm".</summary>
    public string Time { get; set; } = string.Empty;
    /// <summary>Bu saatte boş masa kalmadı.</summary>
    public bool Full { get; set; }
}
