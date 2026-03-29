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
        /// Returns all tables.
        /// </summary>
        public async Task<List<ProductDto>> Handle(GetAllProductQuery request, CancellationToken cancellationToken)
        {
            var entities = await _uow.Product.GetAllAsync();
            
            return _mapper.Map<List<ProductDto>>(entities);
        }
    }
}