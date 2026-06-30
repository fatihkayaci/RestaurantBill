using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Products.Commands.CreateProduct
{
    public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public CreateProductCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task Handle(CreateProductCommand request, CancellationToken cancellationToken)
        {
            Product product = Product.Create(request.Name, request.Price, request.IsActive, request.ImageUrl, request.CategoryId);
            await _uow.Product.AddAsync(product);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
