using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Shared;
namespace RestaurantBill.Application.Features.Products.Queries.GetAllProduct
{
    public class GetAllProductQueryHandler : IRequestHandler<GetAllProductQuery, Result<List<ProductDto>>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;
        public GetAllProductQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        /// <summary>
        /// Retrieves all products from the database asynchronously, including their associated category details.
        /// Maps the retrieved entity objects into a list of Data Transfer Objects (DTOs) before returning.
        /// </summary>
        /// <param name="request">The query request to retrieve all products.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <returns>A list of <see cref="ProductDto"/> representing the products with their category information.</returns>
        public async Task<Result<List<ProductDto>>> Handle(GetAllProductQuery request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;
            if (restaurantId == Guid.Empty)
                return Result<List<ProductDto>>.Failure("ID değeri 0 veya negatif olamaz.");

            var entities = await _uow.Product.GetAllAsync(p => p.Category.BranchId == restaurantId, includeProperties: "Category");

            return Result<List<ProductDto>>.Success(entities.OrderBy(p => p.Name).Select(p => p.ToDto()).ToList());
        }
    }
}