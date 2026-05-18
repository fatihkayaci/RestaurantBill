using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Features.Products.Commands.UpdateProduct
{
    public class UpdateProductCommandHandler : IRequestHandler<UpdateProductCommand>
    {
        private readonly IUnitOfWork _uow;

        public UpdateProductCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task Handle(UpdateProductCommand request, CancellationToken cancellationToken)
        {
            Product? product = await _uow.Product.GetByIdAsync(request.Id, true);
            Guard.AgainstNull(product, "Böyle bir ürün bulunamadı.");

            product.Update(request.Name, request.Price, request.IsActive, request.CategoryId);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
