using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Categories.Commands.CreateCategory
{
    public class CreateCategoryCommandHandler : IRequestHandler<CreateCategoryCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _userService;

        public CreateCategoryCommandHandler(IAppDbContext db, ICurrentUserService userService)
        {
            _db = db;
            _userService = userService;
        }

        public async Task<Result> Handle(CreateCategoryCommand command, CancellationToken cancellationToken)
        {
            Guid restaurantId = _userService.BranchId;

            bool nameExists = await _db.Categories
                .AnyAsync(c => c.Name == command.Name && c.BranchId == restaurantId, cancellationToken);
            if (nameExists)
                return Result.Failure("Bu isimde bir kategori zaten mevcut.");

            Category category = Category.Create(command.Name, restaurantId, command.TaxRate);
            _db.Categories.Add(category);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _userService.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                restaurantId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Product,
                AuditLogSeverity.Info,
                "CategoryCreated",
                $"{actor?.FullName} {category.Name} adında yeni bir kategori ekledi.",
                nameof(Category),
                category.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
