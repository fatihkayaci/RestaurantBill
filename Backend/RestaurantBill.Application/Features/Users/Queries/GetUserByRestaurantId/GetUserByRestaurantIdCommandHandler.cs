using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Exceptions;
using Microsoft.AspNetCore.Http;

namespace RestaurantBill.Application.Features.Users.Queries.GetUserByRestaurantId
{
    public class GetUserByRestaurantIdCommandHandler : IRequestHandler<GetUserByRestaurantIdCommand, IEnumerable<UserDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public GetUserByRestaurantIdCommandHandler(IUnitOfWork uow, IMapper mapper, IHttpContextAccessor httpContextAccessor)
        {
            _uow = uow;
            _mapper = mapper;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Returns a single table by its ID.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if the table is not found.</exception>
        public async Task<IEnumerable<UserDto>> Handle(GetUserByRestaurantIdCommand request, CancellationToken cancellationToken)
        {
            var restaurantId = int.Parse(_httpContextAccessor.HttpContext!.User
            .FindFirst("RestaurantId")!.Value);

            if(restaurantId <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");

            var users = await _uow.User.GetAllAsync(x => x.RestaurantId == restaurantId, false);
            return _mapper.Map<IEnumerable<UserDto>>(users);
        }
    }
}