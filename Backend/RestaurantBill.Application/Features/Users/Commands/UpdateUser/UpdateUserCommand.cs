using MediatR;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Commands.UpdateUser
{
    public class UpdateUserCommand : IRequest<Result>
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
    }
}