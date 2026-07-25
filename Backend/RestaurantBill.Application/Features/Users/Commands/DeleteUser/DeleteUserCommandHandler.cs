using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Commands.DeleteUser
{
    public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, Result>
    {
        private readonly IUnitOfWork _uow;

        public DeleteUserCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<Result> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
        {
            User? user = await _uow.User.GetByIdAsync(request.UserId, true);
            if (user is null)
            {
                return Result.Failure("Kullanıcı bulunamadı.");
            }

            user.MarkAsDeleted();
            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
