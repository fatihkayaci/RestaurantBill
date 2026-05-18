using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Common;
using MediatR;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Products.Commands.DeleteProduct
{
    public class DeleteProductCommandHandler : IRequestHandler<DeleteProductCommand>
    {
        private readonly IUnitOfWork _uow;

        public DeleteProductCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task Handle(DeleteProductCommand request, CancellationToken cancellationToken)
        {
            Product? product = await _uow.Product.GetByIdAsync(request.Id, false);
            Guard.AgainstNull(product, "Böyle bir ürün bulunamadı.");

            _uow.Product.Delete(product);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
