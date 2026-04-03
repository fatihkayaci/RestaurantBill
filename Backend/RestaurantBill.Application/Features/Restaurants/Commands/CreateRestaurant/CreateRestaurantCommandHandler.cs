using RestaurantBill.Domain.Entities;
using MediatR;
using RestaurantBill.Domain.Interfaces;
using AutoMapper;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace RestaurantBill.Application.Features.Restaurants.Commands.CreateRestaurant
{
    public class CreateRestaurantCommandHandler : IRequestHandler<CreateRestaurantCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CreateRestaurantCommandHandler(IUnitOfWork uow, IMapper mapper, IHttpContextAccessor httpContextAccessor)
        {
            _uow = uow;
            _mapper = mapper;
            _httpContextAccessor = httpContextAccessor;
        }
        /// <summary>
        /// Creates a new restaurant in the database and associates it with the currently authenticated user.
        /// The user ID is dynamically extracted from the current HTTP context claims.
        /// </summary>
        /// <param name="request">The command containing the details for the new restaurant.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        public async Task Handle(CreateRestaurantCommand request, CancellationToken cancellationToken)
        {
            var userId = _httpContextAccessor.HttpContext!.User
            .FindFirst(ClaimTypes.NameIdentifier)!.Value;

            var restaurant = _mapper.Map<Restaurant>(request);
            restaurant.UserId = userId;

            await _uow.Restaurant.AddAsync(restaurant);
            await _uow.SaveChangesAsync();
        }
    }
}