using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
namespace RestaurantBill.Application.Features.Categories.Queries.GetAllCategories
{
    public class GetAllOrdersQueryHandler : IRequestHandler<GetAllCategoryQuery, List<CategoryDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public GetAllOrdersQueryHandler(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }
        /// <summary>
        /// Returns all orders including their items and product details.
        /// </summary>
        public async Task<List<CategoryDto>> Handle(GetAllCategoryQuery request, CancellationToken cancellationToken)
        {
            var entities = await _uow.Category.GetAllAsync(null, false, null);
            
            return _mapper.Map<List<CategoryDto>>(entities.OrderBy(c => c.Name));
        }
    }
}