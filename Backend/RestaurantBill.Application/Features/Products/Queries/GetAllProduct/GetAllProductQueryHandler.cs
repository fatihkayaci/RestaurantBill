using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Exceptions;
namespace RestaurantBill.Application.Features.Products.Queries.GetAllProduct
{
    public class GetAllProductQueryHandler : IRequestHandler<GetAllProductQuery, List<ProductDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUser;
        public GetAllProductQueryHandler(IUnitOfWork uow, IMapper mapper, ICurrentUserService currentUser)
        {
            _uow = uow;
            _mapper = mapper;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Retrieves all products from the database asynchronously, including their associated category details.
        /// Maps the retrieved entity objects into a list of Data Transfer Objects (DTOs) before returning.
        /// </summary>
        /// <param name="request">The query request to retrieve all products.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>A list of <see cref="ProductDto"/> representing the products with their category information.</returns>
        public async Task<List<ProductDto>> Handle(GetAllProductQuery request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;
        if(restaurantId <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");
            var entities = await _uow.Product.GetAllAsync(p => p.RestaurantId == restaurantId, includeProperties: "Category");

            return _mapper.Map<List<ProductDto>>(entities.OrderBy(p => p.Name));
        }
    }
}