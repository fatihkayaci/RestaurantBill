using RestaurantBill.Domain.Entities;
using MediatR;
using RestaurantBill.Domain.Interfaces;
using AutoMapper;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Restaurants.Commands.UpdateRestaurant
{
    public class UpdateRestaurantCommandHandler : IRequestHandler<UpdateRestaurantCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUser;

        public UpdateRestaurantCommandHandler(IUnitOfWork uow, IMapper mapper, ICurrentUserService currentUser)
        {
            _uow = uow;
            _mapper = mapper;
            _currentUser = currentUser;
        }

        public async Task Handle(UpdateRestaurantCommand request, CancellationToken cancellationToken)
        {
            string userId = _currentUser.UserId;

            IEnumerable<Restaurant> restaurants = await _uow.Restaurant.GetAllAsync(x => x.UserId == userId, trackChanges: true);
            Restaurant restaurant = restaurants.FirstOrDefault()
                ?? throw new NotFoundException("Restoran bulunamadı.");

            _mapper.Map(request, restaurant);

            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
