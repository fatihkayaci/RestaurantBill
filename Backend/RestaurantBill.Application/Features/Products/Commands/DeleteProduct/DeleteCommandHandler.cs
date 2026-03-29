using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;
using MediatR;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Products.Commands.DeleteProduct
{
    public class DeleteCommandHandler : IRequestHandler<DeleteProductCommand>
    {
        private readonly IUnitOfWork _uow;

        public DeleteCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }
        /// <summary>
        /// Closes the order, marks it as Paid and sets the table status to Available.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if order ID is zero or less, or if the order is not found.</exception>
        public async Task Handle(DeleteProductCommand request, CancellationToken cancellationToken)
        {         
            if (request.Id <= 0) throw new BusinessException("Ürün'ün ID değeri 0 veya negatif olamaz.");
            var product = await _uow.Product.GetByIdAsync(request.Id, false);
            Guard.AgainstNull(product, "Böyle bir ürün bulunamadı.");
            
            _uow.Product.Delete(product);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}