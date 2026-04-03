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
        /// Deletes a product from the database based on the specified ID in the command.
        /// Validates the ID and ensures the product exists before performing the deletion.
        /// </summary>
        /// <param name="request">The command containing the ID of the product to delete.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <exception cref="BusinessException">Thrown when the product ID is zero or negative.</exception>
        /// <exception cref="Exception">Thrown when the specified product cannot be found.</exception>
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