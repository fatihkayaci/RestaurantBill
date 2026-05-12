using RestaurantBill.Domain.Entities;
using MediatR;
using RestaurantBill.Domain.Interfaces;
using AutoMapper;
using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Restaurants.Commands.CreateRestaurant
{
    public class CreateRestaurantCommandHandler : IRequestHandler<CreateRestaurantCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUser;
        private readonly UserManager<User> _userManager;

        public CreateRestaurantCommandHandler(IUnitOfWork uow, IMapper mapper, ICurrentUserService currentUser, UserManager<User> userManager)
        {
            _uow = uow;
            _mapper = mapper;
            _currentUser = currentUser;
            _userManager = userManager;
        }
        /// <summary>
        /// Creates a new restaurant in the database, associates it with the authenticated user,
        /// and updates the user's RestaurantId so subsequent JWT tokens carry the correct value.
        /// </summary>
        /// <param name="request">The command containing the details for the new restaurant.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        public async Task Handle(CreateRestaurantCommand request, CancellationToken cancellationToken)
        {
            string userId = _currentUser.UserId;

            Restaurant restaurant = _mapper.Map<Restaurant>(request);
            restaurant.UserId = userId;

            await _uow.Restaurant.AddAsync(restaurant);
            await _uow.SaveChangesAsync();

            User user = await _userManager.FindByIdAsync(userId)
                ?? throw new NotFoundException("Kullanıcı bulunamadı.");

            user.RestaurantId = restaurant.Id;
            await _userManager.UpdateAsync(user);
        }
    }
}