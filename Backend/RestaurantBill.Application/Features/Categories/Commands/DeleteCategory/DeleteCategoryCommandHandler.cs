using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Categories.Commands.DeleteCategory
{
    public class DeleteCategoryCommandHandler(IUnitOfWork uow) : IRequestHandler<DeleteCategoryCommand, Result>
    {
        public async Task<Result> Handle(DeleteCategoryCommand command, CancellationToken cancellationToken)
        {
            Category? category = await uow.Category.GetByIdAsync(command.Id);
            if (category is null) return Result.Failure("Böyle bir kategori bulunamadı");

            IEnumerable<Product> linkedProducts = await uow.Product.GetAllAsync(p => p.CategoryId == command.Id);
            category.EnsureCanBeDeleted(linkedProducts);

            uow.Category.Delete(category);
            await uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
