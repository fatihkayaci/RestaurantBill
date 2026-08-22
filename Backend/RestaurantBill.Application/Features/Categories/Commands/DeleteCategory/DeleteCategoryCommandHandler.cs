using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Categories.Commands.DeleteCategory
{
    public class DeleteCategoryCommandHandler(IAppDbContext db, ICurrentUserService currentUser) : IRequestHandler<DeleteCategoryCommand, Result>
    {
        public async Task<Result> Handle(DeleteCategoryCommand command, CancellationToken cancellationToken)
        {
            Category? category = await db.Categories
                .FirstOrDefaultAsync(c => c.Id == command.Id, cancellationToken);
            if (category is null) return Result.Failure("Böyle bir kategori bulunamadı");

            List<Product> linkedProducts = await db.Products
                .Where(p => p.CategoryId == command.Id)
                .ToListAsync(cancellationToken);
            category.EnsureCanBeDeleted(linkedProducts);

            db.Categories.Remove(category);

            User? actor = await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Product,
                AuditLogSeverity.Warning,
                "CategoryDeleted",
                $"{actor?.FullName} {category.Name} kategorisini sildi.",
                nameof(Category),
                category.Id);
            db.AuditLogs.Add(log);

            await db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
