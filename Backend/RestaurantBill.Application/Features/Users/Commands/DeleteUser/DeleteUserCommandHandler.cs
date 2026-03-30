using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Features.Users.Commands.DeleteUser
{
    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand>
    {
        private readonly IUnitOfWork _uow;

        public DeleteUserCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        /// <summary>
        /// Creates a new table with the given name.
        /// </summary>
        public async Task Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            var user = await _uow.User.GetByIdAsync(request.UserId, true);
            Guard.AgainstNull(user, "Kullanıcı bulunamadı.");
            _uow.User.Delete(user);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}