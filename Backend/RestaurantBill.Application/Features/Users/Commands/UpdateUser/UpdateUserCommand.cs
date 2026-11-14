using MediatR;
using RestaurantBill.Application.Features.Users;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Commands.UpdateUser
{
    public class UpdateUserCommand : IRequest<Result>, IStaffAssignmentRequest
    {
        public Guid UserId { get; set; }
        public required string FullName { get; set; }
        public required string UserName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Password { get; set; }
        public string? UserCode { get; set; }
        public UserRole Role { get; set; } = UserRole.Waiter;
        public bool? IsActive { get; set; }
        public Guid? BranchId { get; set; }
        // Admin için atandığı şubelerin tam listesi (Owner gönderir); verilirse üyelikler bu listeyle eşitlenir.
        public List<Guid>? BranchIds { get; set; }
        public DateTime? HireDate { get; set; }
        // Garson bölgeleri (boş = tüm bölgeler) ve garson yetkileri; null = varsayılan / değiştirme.
        public List<Guid>? RegionIds { get; set; }
        // Garsonun masa masa baktığı bölgeler ("Seçili masalar") ve bu bölgelerde seçtiği masalar; null = değiştirme.
        public List<Guid>? RestrictedRegionIds { get; set; }
        public List<Guid>? TableIds { get; set; }
        // Mutfak kategorileri (boş = tüm kategoriler); null = varsayılan / değiştirme.
        public List<Guid>? CategoryIds { get; set; }
        public bool? CanTakeOrders { get; set; }
        public bool? CanTakePayment { get; set; }
        public bool? CanCancelAndDiscount { get; set; }
        public bool? CanTransferAndReserve { get; set; }
        // Kasiyer yetkileri ve indirim sınırı (%1–100, 100 = sınırsız); null = varsayılan / değiştirme.
        public bool? CanApplyDiscount { get; set; }
        public int? MaxDiscountPercent { get; set; }
        public bool? CanTransferTables { get; set; }
    }
}