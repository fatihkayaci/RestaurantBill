using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Exceptions;
namespace RestaurantBill.Application.Features.Categories.Queries.GetAllCategories
{
    public class GetAllOrdersQueryHandler : IRequestHandler<GetAllCategoryQuery, List<CategoryDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUser;

        public GetAllOrdersQueryHandler(IUnitOfWork uow, IMapper mapper, ICurrentUserService currentUser)
        {
            _uow = uow;
            _mapper = mapper;
            _currentUser = currentUser;
        }
        /// <summary>
        /// Returns all orders including their items and product details.
        /// </summary>
        public async Task<List<CategoryDto>> Handle(GetAllCategoryQuery request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;
            if(restaurantId <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");
            var entities = await _uow.Category.GetAllAsync(c => c.RestaurantId == restaurantId, false, null);
            
            return _mapper.Map<List<CategoryDto>>(entities.OrderBy(c => c.Name));
        }
    }
}