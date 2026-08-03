using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.CreateProduct
{
    public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public CreateProductCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(CreateProductCommand request, CancellationToken cancellationToken)
        {
            bool nameExistsInCategory = (await _uow.Product.GetAllAsync(p => p.Name == request.Name && p.CategoryId == request.CategoryId, false)).Any();
            if (nameExistsInCategory)
                return Result.Failure("Bu kategoride bu isimde bir ürün zaten mevcut.");

            Product product = Product.Create(request.Name, request.Price, request.ImageUrl, request.CategoryId);
            await _uow.Product.AddAsync(product);

            User? actor = await _uow.User.GetByIdAsync(_currentUser.UserId);
            AuditLog log = AuditLog.Create(
                _currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.Product,
                AuditLogSeverity.Info,
                "ProductCreated",
                $"{actor?.FullName} {product.Name} adında yeni bir ürün ekledi.",
                nameof(Product),
                product.Id);
            await _uow.AuditLog.AddAsync(log);

            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
