using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.CreateProduct
{
    public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public CreateProductCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(CreateProductCommand request, CancellationToken cancellationToken)
        {
            bool nameExistsInCategory = await _db.Products
                .AnyAsync(p => p.Name == request.Name && p.CategoryId == request.CategoryId, cancellationToken);
            if (nameExistsInCategory)
                return Result.Failure("Bu kategoride bu isimde bir ürün zaten mevcut.");

            Product product = Product.Create(request.Name, request.Price, request.ImageUrl, request.CategoryId);
            _db.Products.Add(product);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                _currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Product,
                AuditLogSeverity.Info,
                "ProductCreated",
                $"{actor?.FullName} {product.Name} adında yeni bir ürün ekledi.",
                nameof(Product),
                product.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
