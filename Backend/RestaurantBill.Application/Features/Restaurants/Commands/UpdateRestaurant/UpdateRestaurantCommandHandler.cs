using RestaurantBill.Domain.Entities;
using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Restaurants.Commands.UpdateRestaurant
{
    public class UpdateRestaurantCommandHandler : IRequestHandler<UpdateRestaurantCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public UpdateRestaurantCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task Handle(UpdateRestaurantCommand request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;

            Restaurant restaurant = await _uow.Restaurant.GetByIdAsync(restaurantId)
                ?? throw new NotFoundException("Restoran bulunamadı.");

            restaurant.Update(request.Name, request.PhoneNumber, request.MobilePhoneNumber, request.Email, request.City, request.District);

            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
