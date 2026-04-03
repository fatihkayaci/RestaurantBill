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
        /// Adds a new product to the database based on the provided command.
        /// </summary>
        /// <param name="request">The command containing the details for the new product.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        public async Task Handle(CreateProductCommand request, CancellationToken cancellationToken)
        {
            var product = _mapper.Map<Product>(request);
            await _uow.Product.AddAsync(product);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}