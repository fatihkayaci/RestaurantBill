using MediatR;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Users.Commands.CreateUser
{
    public class CreateUserCommand : IRequest
    {
        public int RestaurantId { get; set; }
        public required string FullName { get; set; }
        public required string UserName { get; set; }
        public string? Email { get; set; }
        public required string PhoneNumber { get; set; }
        public required string PasswordHash { get; set; }
        public required string UserCode { get; set; }
        public UserRole Role { get; set; } = UserRole.Waiter;
    }
}