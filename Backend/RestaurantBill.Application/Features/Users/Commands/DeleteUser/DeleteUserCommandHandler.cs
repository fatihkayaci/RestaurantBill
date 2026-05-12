using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.Exceptions;

namespace RestaurantBill.Application.Features.Users.Commands.DeleteUser
{
    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly UserManager<User> _userManager;

        public DeleteUserCommandHandler(IUnitOfWork uow, UserManager<User> userManager)
        {
            _uow = uow;
            _userManager = userManager;
        }

        /// <summary>
        /// Deletes a user from the database based on the specified ID in the command.
        /// </summary>
        public async Task Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            User user = await _userManager.FindByIdAsync(request.UserId)
                ?? throw new NotFoundException("Kullanıcı bulunamadı.");

            _uow.User.Delete(user);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
