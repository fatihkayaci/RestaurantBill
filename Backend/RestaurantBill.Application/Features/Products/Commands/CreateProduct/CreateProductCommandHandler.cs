using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.CreateProduct
{
    public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, Result>
    {
        private readonly IUnitOfWork _uow;

        public CreateProductCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<Result> Handle(CreateProductCommand request, CancellationToken cancellationToken)
        {
            bool nameExistsInCategory = (await _uow.Product.GetAllAsync(p => p.Name == request.Name && p.CategoryId == request.CategoryId, false)).Any();
            if (nameExistsInCategory)
                return Result.Failure("Bu kategoride bu isimde bir ürün zaten mevcut.");

            Product product = Product.Create(request.Name, request.Price, request.IsActive, request.ImageUrl, request.CategoryId);
            await _uow.Product.AddAsync(product);
            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
