using RestaurantBill.Domain.Interfaces;

using MediatR;
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
        /// Deletes a user from the database based on the specified ID in the command.
        /// Ensures the user exists before performing the deletion.
        /// </summary>
        /// <param name="request">The command containing the ID of the user to delete.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <exception cref="Exception">Thrown when the specified user cannot be found.</exception>
        public async Task Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            var user = await _uow.User.GetByIdAsync(request.UserId, true);
            Guard.AgainstNull(user, "Kullanıcı bulunamadı.");
            _uow.User.Delete(user);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}