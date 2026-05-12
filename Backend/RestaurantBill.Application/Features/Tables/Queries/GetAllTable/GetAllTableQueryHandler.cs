using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Exceptions;

namespace RestaurantBill.Application.Features.Tables.Queries.GetAll
{
    public class GetAllTableQueryHandler : IRequestHandler<GetAllTableQuery, List<TableDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUser;

        public GetAllTableQueryHandler(IUnitOfWork uow, IMapper mapper, ICurrentUserService currentUser)
        {
            _uow = uow;
            _mapper = mapper;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Returns all tables belonging to the authenticated user's restaurant.
        /// </summary>
        public async Task<List<TableDto>> Handle(GetAllTableQuery request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;
            if(restaurantId <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");
            var entities = await _uow.Table.GetAllAsync(t => t.RestaurantId == restaurantId);

            return _mapper.Map<List<TableDto>>(entities.OrderBy(t => t.Name));
        }
    }
}