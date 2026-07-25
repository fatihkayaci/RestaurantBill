using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Common;
using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.DeleteProduct
{
    public class DeleteProductCommandHandler : IRequestHandler<DeleteProductCommand, Result>
    {
        private readonly IUnitOfWork _uow;

        public DeleteProductCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<Result> Handle(DeleteProductCommand request, CancellationToken cancellationToken)
        {
            Product? product = await _uow.Product.GetByIdAsync(request.Id, false);
            if (product is null)
                return Result.Failure("Böyle bir ürün bulunamadı.");

            IEnumerable<OrderItem> linkedOrderItems = await _uow.OrderItem.GetAllAsync(oi => oi.ProductId == request.Id, false);
            product.EnsureCanBeDeleted(linkedOrderItems);

            _uow.Product.Delete(product);
            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
