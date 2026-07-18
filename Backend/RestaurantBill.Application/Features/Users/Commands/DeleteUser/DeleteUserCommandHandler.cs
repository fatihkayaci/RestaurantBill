using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Users.Commands.DeleteUser
{
    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand>
    {
        private readonly IUnitOfWork _uow;

        public DeleteUserCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            User user = await _uow.User.GetByIdAsync(request.UserId, true)
                ?? throw new NotFoundException("Kullanıcı bulunamadı.");

            user.MarkAsDeleted();
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
