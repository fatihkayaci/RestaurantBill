using MediatR;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Commands.UpdateUser
{
    public class UpdateUserCommand : IRequest<Result>
    {
        public int UserId { get; set; }
        public required string FullName { get; set; }
        public required string UserName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Password { get; set; }
        public required string UserCode { get; set; }
        public UserRole Role { get; set; } = UserRole.Waiter;
        public bool? IsActive { get; set; }
        public int? RestaurantId { get; set; }
    }
}