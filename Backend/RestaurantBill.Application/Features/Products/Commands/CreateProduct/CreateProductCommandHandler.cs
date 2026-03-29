using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Exceptions;
using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Products.Commands.CreateProduct
{
    public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public CreateProductCommandHandler(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }
        /// <summary>
        /// Closes the order, marks it as Paid and sets the table status to Available.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if order ID is zero or less, or if the order is not found.</exception>
        public async Task Handle(CreateProductCommand request, CancellationToken cancellationToken)
        {
            var product = _mapper.Map<Product>(request);
            await _uow.Product.AddAsync(product);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}