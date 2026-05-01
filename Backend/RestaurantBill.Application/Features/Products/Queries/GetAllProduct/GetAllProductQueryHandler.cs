using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
namespace RestaurantBill.Application.Features.Products.Queries.GetAllProduct
{
    public class GetAllProductQueryHandler : IRequestHandler<GetAllProductQuery, List<ProductDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public GetAllProductQueryHandler(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
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
            var entities = await _uow.Product.GetAllAsync(includeProperties: "Category");

            return _mapper.Map<List<ProductDto>>(entities.OrderBy(p => p.Name));
        }
    }
}