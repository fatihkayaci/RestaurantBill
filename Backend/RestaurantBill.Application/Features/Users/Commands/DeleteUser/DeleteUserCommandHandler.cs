using MediatR;
using Microsoft.Extensions.Caching.Memory;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Users.Commands.DeleteUser
{
    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMemoryCache _cache;

        public DeleteUserCommandHandler(IUnitOfWork uow, IMemoryCache cache)
        {
            _uow = uow;
            _cache = cache;
        }

        public async Task Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            User user = await _uow.User.GetByIdAsync(request.UserId)
                ?? throw new NotFoundException("Kullanıcı bulunamadı.");

            user.MarkAsDeleted();
            await _uow.SaveChangesAsync(cancellationToken);

            _cache.Remove($"idempotency:r{user.RestaurantId}:create-user:{user.UserName}");
        }
    }
}
