using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Categories.Commands.DeleteCategory
{
    public class DeleteCategoryCommandHandler(IUnitOfWork uow) : IRequestHandler<DeleteCategoryCommand>
    {
        public async Task Handle(DeleteCategoryCommand command, CancellationToken cancellationToken)
        {
            Category? category = await uow.Category.GetByIdAsync(command.Id);
            Guard.AgainstNull(category, "Böyle bir kategori bulunamadı");

            IEnumerable<Product> linkedProducts = await uow.Product.GetAllAsync(p => p.CategoryId == command.Id);
            category.EnsureCanBeDeleted(linkedProducts);

            uow.Category.Delete(category);
            await uow.SaveChangesAsync(cancellationToken);
        }
    }
}
