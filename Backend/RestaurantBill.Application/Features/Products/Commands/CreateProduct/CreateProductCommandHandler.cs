using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Exceptions;
using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Products.Commands.CreateProduct
{
    public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _currentUser;
        

        public CreateProductCommandHandler(IUnitOfWork uow, IMapper mapper, ICurrentUserService currentUser)
        {
            _uow = uow;
            _mapper = mapper;
            _currentUser = currentUser;
        }
        /// <summary>
        /// Adds a new product to the database based on the provided command.
        /// </summary>
        /// <param name="request">The command containing the details for the new product.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        public async Task Handle(CreateProductCommand request, CancellationToken cancellationToken)
        {
            var restaurantId = _currentUser.RestaurantId;
            if(restaurantId <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");
            var product = _mapper.Map<Product>(request);
            product.RestaurantId = restaurantId;
            await _uow.Product.AddAsync(product);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}