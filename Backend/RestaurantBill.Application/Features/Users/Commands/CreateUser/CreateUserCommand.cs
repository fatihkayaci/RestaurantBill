using MediatR;
using RestaurantBill.Application.Features.Users;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Commands.CreateUser
{
    public class CreateUserCommand : IRequest<Result>, IInvalidatesCache, IIdempotent, IStaffAssignmentRequest
    {
        public required string FullName { get; set; }
        public required string UserName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public required string PasswordHash { get; set; }
        public string? UserCode { get; set; }
        public UserRole Role { get; set; } = UserRole.Waiter;
        public Guid? BranchId { get; set; }
        // Admin için birden çok şube; ilk eleman birincil şube olur. Diğer roller tek şubede çalışır.
        public List<Guid>? BranchIds { get; set; }
        public DateTime? HireDate { get; set; }
        // Garson bölgeleri (boş = tüm bölgeler) ve garson yetkileri; null = varsayılan / değiştirme.
        public List<Guid>? RegionIds { get; set; }
        // Mutfak kategorileri (boş = tüm kategoriler); null = varsayılan / değiştirme.
        public List<Guid>? CategoryIds { get; set; }
        public bool? CanTakeOrders { get; set; }
        public bool? CanTakePayment { get; set; }
        public bool? CanCancelAndDiscount { get; set; }
        public bool? CanTransferAndReserve { get; set; }

        public string[] CacheKeysToInvalidate => ["stuff:all"];
        public string IdempotencyKey => $"create-user:{UserName}";
    }
}