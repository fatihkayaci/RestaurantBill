using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Categories.Commands.DeleteCategory
{
    public class DeleteCategoryCommandHandler(IUnitOfWork uow) : IRequestHandler<DeleteCategoryCommand>
    {
        public async Task Handle(DeleteCategoryCommand command, CancellationToken cancellationToken)
        {
            if (command.Id <= 0) throw new BusinessException("Kategori ID değeri 0 veya negatif olamaz.");
            Category? category = await uow.Category.GetByIdAsync(command.Id);
            Guard.AgainstNull(category, "Böyle bir kategori bulunamadı");

            IEnumerable<Product> linkedProducts = await uow.Product.GetAllAsync(p => p.CategoryId == command.Id);
            if (linkedProducts.Any())
                throw new BusinessException("Bu kategoriye bağlı ürünler bulunmaktadır. Lütfen silmeden önce ilgili ürünlerin kategorisini güncelleyin.");

            uow.Category.Delete(category);
            await uow.SaveChangesAsync(cancellationToken);
        }
    }
}
