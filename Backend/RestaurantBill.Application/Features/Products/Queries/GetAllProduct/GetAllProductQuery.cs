using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Products.Queries.GetAllProduct
{
    public class GetAllProductQuery : IRequest<List<ProductDto>> 
    {
    }
}