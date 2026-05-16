using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Users.Queries.GetUserByRestaurantId
{
    public class GetUserByRestaurantIdCommandHandler : IRequestHandler<GetUserByRestaurantIdCommand, IEnumerable<UserDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUser;

        public GetUserByRestaurantIdCommandHandler(IUnitOfWork uow, IMapper mapper, ICurrentUserService currentUser)
        {
            _uow = uow;
            _mapper = mapper;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Retrieves all users associated with the current user's restaurant asynchronously. 
        /// The restaurant ID is dynamically extracted from the HTTP context claims, and the retrieved entities are mapped to a collection of DTOs.
        /// </summary>
        /// <param name="request">The request object to retrieve the users associated with the restaurant.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>An enumerable collection of <see cref="UserDto"/> representing the users of the restaurant.</returns>
        /// <exception cref="BusinessException">Thrown when the extracted restaurant ID from the claims is zero or negative.</exception>
        public async Task<IEnumerable<UserDto>> Handle(GetUserByRestaurantIdCommand request, CancellationToken cancellationToken)
        {
            var restaurantId = _currentUser.RestaurantId;
            if(restaurantId <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");

            var currentUserId = _currentUser.UserId;
            var users = await _uow.User.GetAllAsync(x => x.RestaurantId == restaurantId && x.Id != currentUserId, false);
            return _mapper.Map<IEnumerable<UserDto>>(users.OrderBy(u => u.FullName));
        }
    }
}