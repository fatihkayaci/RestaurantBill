using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.UpdateBranch
{
    public class UpdateBranchCommandHandler : IRequestHandler<UpdateBranchCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public UpdateBranchCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(UpdateBranchCommand request, CancellationToken cancellationToken)
        {
            Restaurant? restaurant = await _uow.Restaurant.GetByIdAsync(request.RestaurantId, true);
            if (restaurant is null || restaurant.OwnerUserId != _currentUser.UserId)
                return Result.Failure("Şube bulunamadı.");

            restaurant.Update(request.Name, request.PhoneNumber, request.Email, request.City, request.District);

            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
