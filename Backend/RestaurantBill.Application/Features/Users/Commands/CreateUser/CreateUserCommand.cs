using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Commands.CreateUser
{
    public class CreateUserCommand : IRequest<Result>, IInvalidatesCache, IIdempotent
    {
        public required string FullName { get; set; }
        public required string UserName { get; set; }
        public string? Email { get; set; }
        public string? PhoneNumber { get; set; }
        public required string PasswordHash { get; set; }
        public string? UserCode { get; set; }
        public UserRole Role { get; set; } = UserRole.Waiter;
        public Guid? BranchId { get; set; }

        public string[] CacheKeysToInvalidate => ["stuff:all"];
        public string IdempotencyKey => $"create-user:{UserName}";
    }
}