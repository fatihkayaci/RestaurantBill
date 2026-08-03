using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Categories.Commands.DeleteCategory
{
    public class DeleteCategoryCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser) : IRequestHandler<DeleteCategoryCommand, Result>
    {
        public async Task<Result> Handle(DeleteCategoryCommand command, CancellationToken cancellationToken)
        {
            Category? category = await uow.Category.GetByIdAsync(command.Id);
            if (category is null) return Result.Failure("Böyle bir kategori bulunamadı");

            IEnumerable<Product> linkedProducts = await uow.Product.GetAllAsync(p => p.CategoryId == command.Id);
            category.EnsureCanBeDeleted(linkedProducts);

            uow.Category.Delete(category);

            User? actor = await uow.User.GetByIdAsync(currentUser.UserId);
            AuditLog log = AuditLog.Create(
                currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Product,
                AuditLogSeverity.Warning,
                "CategoryDeleted",
                $"{actor?.FullName} {category.Name} kategorisini sildi.",
                nameof(Category),
                category.Id);
            await uow.AuditLog.AddAsync(log);

            await uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
