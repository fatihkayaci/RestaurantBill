using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Mappings;

public static class MappingExtensions
{
    public static CashRegisterDto ToDto(this CashRegister r) => new()
    {
        Id = r.Id,
        Name = r.Name,
        Balance = r.Balance,
        Status = r.Status
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
        Name = c.Name
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
        Note = o.Note,
        TotalPrice = o.TotalPrice,
        Status = o.Status,
        OrderItems = o.OrderItems.Select(i => i.ToDto()).ToList()
    };

    public static OrderItemDto ToDto(this OrderItem i) => new()
    {
        Id = i.Id,
        ProductId = i.ProductId,
        ProductName = i.Product?.Name ?? string.Empty,
        UnitPrice = i.UnitPrice,
        Quantity = i.Quantity,
        Status = i.Status
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

    public static RestaurantDto ToDto(this Restaurant r) => new()
    {
        Name = r.Name,
        PhoneNumber = r.PhoneNumber,
        MobilePhoneNumber = r.MobilePhoneNumber,
        Email = r.Email,
        City = r.City,
        District = r.District
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

    public static UserDto ToDto(this User u) => new()
    {
        Id = u.Id,
        FullName = u.FullName,
        UserName = u.UserName,
        Email = u.Email,
        PhoneNumber = u.PhoneNumber ?? string.Empty,
        UserCode = u.UserCode,
        Role = u.Role,
        IsActive = u.IsActive
    };
}
