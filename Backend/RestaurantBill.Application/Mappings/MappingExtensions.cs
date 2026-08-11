using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Mappings;

public static class MappingExtensions
{
    public static AuditLogDto ToDto(this AuditLog log) => new()
    {
        Id = log.Id,
        BranchId = log.BranchId,
        BranchName = log.Branch?.BranchName,
        ActorName = log.ActorName,
        Category = log.Category,
        Severity = log.Severity,
        Action = log.Action,
        Message = log.Message,
        EntityType = log.EntityType,
        EntityId = log.EntityId,
        CreatedAt = log.CreatedAt
    };

    public static CashRegisterDto ToDto(this CashRegister r) => new()
    {
        Id = r.Id,
        Name = r.Name,
        Balance = r.Balance,
        Status = r.Status
    };

    public static ShiftDto ToDto(this Shift s) => new()
    {
        Id = s.Id,
        BranchId = s.BranchId,
        CashRegisterId = s.CashRegisterId,
        CashRegisterName = s.CashRegister?.Name ?? string.Empty,
        OpenedByUserId = s.OpenedByUserId,
        ClosedByUserId = s.ClosedByUserId,
        ExpectedOpeningBalance = s.ExpectedOpeningBalance,
        OpeningBalance = s.OpeningBalance,
        OpeningDifference = s.OpeningDifference,
        OpeningDifferenceApprovedAt = s.OpeningDifferenceApprovedAt,
        OpeningDifferenceApprovedByUserId = s.OpeningDifferenceApprovedByUserId,
        ExpectedClosingBalance = s.ExpectedClosingBalance,
        CountedClosingBalance = s.CountedClosingBalance,
        Difference = s.Difference,
        ClosingDifferenceApprovedAt = s.ClosingDifferenceApprovedAt,
        ClosingDifferenceApprovedByUserId = s.ClosingDifferenceApprovedByUserId,
        OpenedAt = s.OpenedAt,
        ClosedAt = s.ClosedAt,
        Status = s.Status,
        Note = s.Note
    };

    public static CashTransactionDto ToDto(this CashTransaction t) => new()
    {
        Id = t.Id,
        CashRegisterId = t.CashRegisterId,
        Type = t.Type,
        Amount = t.Amount,
        UserId = t.UserId,
        RelatedCashRegisterId = t.RelatedCashRegisterId,
        CreatedAt = t.CreatedAt
    };

    public static CategoryDto ToDto(this Category c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        TaxRate = c.TaxRate,
        EffectiveTaxRate = c.GetEffectiveTaxRate()
    };

    public static RegionDto ToDto(this Region r) => new()
    {
        Id = r.Id,
        Name = r.Name
    };

    public static OrderDto ToDto(this Order o) => new()
    {
        Id = o.Id,
        TableId = o.TableId,
        TableName = o.Table?.Name ?? string.Empty,
        Note = o.Note,
        TotalPrice = o.TotalPrice,
        Status = o.Status,
        CreatedAt = o.CreatedAt,
        OrderItems = o.OrderItems.Select(i => i.ToDto()).ToList()
    };

    public static OrderItemDto ToDto(this OrderItem i) => new()
    {
        Id = i.Id,
        ProductId = i.ProductId,
        ProductName = i.Product?.Name ?? string.Empty,
        UnitPrice = i.UnitPrice,
        Quantity = i.Quantity,
        Status = i.Status,
        CategoryName = i.Product?.Category?.Name ?? string.Empty,
        TaxRate = i.TaxRate
    };

    public static ProductDto ToDto(this Product p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Price = p.Price,
        IsActive = p.IsActive,
        CategoryId = p.CategoryId,
        CategoryName = p.Category?.Name ?? string.Empty
    };

    public static MembershipDto ToDto(this Membership m) => new()
    {
        Id = m.Id,
        PlanType = m.PlanType,
        Status = m.Status,
        StartDate = m.StartDate,
        EndDate = m.EndDate
    };

    public static CompanyDto ToDto(this Company c) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Slug = c.Slug
    };

    public static RestaurantDto ToDto(this Branch b) => new()
    {
        Id = b.Id,
        Name = b.BranchName,
        PhoneNumber = b.Number,
        Email = b.Email,
        City = b.City,
        District = b.District,
        Slug = b.Company?.Slug ?? string.Empty,
        TaxRate = b.TaxRate
    };

    public static BranchDto ToBranchDto(this Branch b, int tableCount, int staffCount, decimal revenue) => new()
    {
        Id = b.Id,
        BranchName = b.BranchName,
        ManagerName = b.ManagerName,
        Number = b.Number,
        Email = b.Email,
        City = b.City,
        District = b.District,
        OpenAddress = b.OpenAddress,
        TaxRate = b.TaxRate,
        TableCount = tableCount,
        StaffCount = staffCount,
        Revenue = revenue
    };

    public static TableDto ToDto(this Table t) => new()
    {
        Id = t.Id,
        Name = t.Name,
        Note = t.Note,
        Status = t.Status,
        RegionId = t.RegionId,
        RegionName = t.Region.Name
    };

    public static ReservationDto ToDto(this Reservation r) => new()
    {
        Id = r.Id,
        TableId = r.TableId,
        GuestName = r.GuestName,
        Contact = r.Contact,
        ReservationTime = r.ReservationTime,
        Note = r.Note
    };

    public static UserDto ToDto(this User u, UserBranch ub) => new()
    {
        Id = u.Id,
        FullName = u.FullName,
        UserName = ub.UserName,
        Email = u.Email,
        PhoneNumber = u.PhoneNumber ?? string.Empty,
        UserCode = ub.UserCode,
        Role = ub.Role,
        IsActive = u.IsActive,
        BranchId = ub.BranchId,
        BranchName = ub.Branch?.BranchName,
        RestaurantName = ub.Branch?.Company?.Name,
        HireDate = ub.HireDate
    };
}
