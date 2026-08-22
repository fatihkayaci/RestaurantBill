using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.UpdateProduct
{
    public class UpdateProductCommandHandler : IRequestHandler<UpdateProductCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public UpdateProductCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
        {
            Product? product = await _db.Products
                .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);
            if (product is null)
                return Result.Failure("Böyle bir ürün bulunamadı.");

            product.Update(request.Name, request.Price, request.IsActive, request.CategoryId);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                _currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Product,
                AuditLogSeverity.Info,
                "ProductUpdated",
                $"{actor?.FullName} {product.Name} ürününü güncelledi.",
                nameof(Product),
                product.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
