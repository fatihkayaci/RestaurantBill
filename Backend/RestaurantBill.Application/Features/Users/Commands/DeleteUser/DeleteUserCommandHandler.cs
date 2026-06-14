using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Caching.Memory;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Features.Users.Commands.DeleteUser
{
    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand>
    {
        private readonly UserManager<User> _userManager;
        private readonly IMemoryCache _cache;

        public DeleteUserCommandHandler(UserManager<User> userManager, IMemoryCache cache)
        {
            _userManager = userManager;
            _cache = cache;
        }

        public async Task Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            User user = await _userManager.FindByIdAsync(request.UserId)
                ?? throw new NotFoundException("Kullanıcı bulunamadı.");

            IdentityResult result = await _userManager.DeleteAsync(user);
            if (!result.Succeeded)
            {
                string errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new BusinessException(errors);
            }

            _cache.Remove($"idempotency:r{user.RestaurantId}:create-user:{user.UserName}");
        }
    }
}
