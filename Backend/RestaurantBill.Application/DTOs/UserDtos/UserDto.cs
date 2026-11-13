using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.DTOs;
public class UserDto
{
    public Guid Id { get; set; }
    public required string FullName { get; set; }
    public required string UserName { get; set; }
    public string? Email { get; set; }
    public required string PhoneNumber { get; set; }
    public required string UserCode { get; set; }
    public UserRole Role { get; set; }
    public bool IsActive { get; set; }
    public Guid BranchId { get; set; }
    public string? BranchName { get; set; }
    // Birden çok şubeye atanmış Admin için tüm şubeler; diğer personelde tek eleman.
    public List<Guid> BranchIds { get; set; } = [];
    public string? RestaurantName { get; set; }
    public DateTime? HireDate { get; set; }
    public bool IsPhoneVerified { get; set; }
    public bool IsEmailVerified { get; set; }
    // Garson bölgeleri (boş = tüm bölgeler) ve garson yetkileri; mutfak kategorileri (boş = tüm kategoriler).
    // Diğer rollerde anlamsızdır.
    public List<Guid> RegionIds { get; set; } = [];
    public List<Guid> CategoryIds { get; set; } = [];
    public bool CanTakeOrders { get; set; }
    public bool CanTakePayment { get; set; }
    public bool CanCancelAndDiscount { get; set; }
    public bool CanTransferAndReserve { get; set; }
}
