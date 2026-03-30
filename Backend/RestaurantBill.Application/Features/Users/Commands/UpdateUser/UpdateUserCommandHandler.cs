using MediatR;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Users.Commands.UpdateUser
{
    public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand>
    {
        
        private readonly IUnitOfWork _uow;
        public UpdateUserCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }
        public async Task Handle(UpdateUserCommand request, CancellationToken cancellationToken)
        {
            
        }
    }
}