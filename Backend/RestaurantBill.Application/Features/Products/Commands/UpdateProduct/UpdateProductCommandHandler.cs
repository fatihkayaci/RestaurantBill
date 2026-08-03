using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.UpdateProduct
{
    public class UpdateProductCommandHandler : IRequestHandler<UpdateProductCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public UpdateProductCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
        {
            Product? product = await _uow.Product.GetByIdAsync(request.Id, true);
            if (product is null)
                return Result.Failure("Böyle bir ürün bulunamadı.");

            product.Update(request.Name, request.Price, request.IsActive, request.CategoryId);

            User? actor = await _uow.User.GetByIdAsync(_currentUser.UserId);
            AuditLog log = AuditLog.Create(
                _currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Product,
                AuditLogSeverity.Info,
                "ProductUpdated",
                $"{actor?.FullName} {product.Name} ürününü güncelledi.",
                nameof(Product),
                product.Id);
            await _uow.AuditLog.AddAsync(log);

            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
