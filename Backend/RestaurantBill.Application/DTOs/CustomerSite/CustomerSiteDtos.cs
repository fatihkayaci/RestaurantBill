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
