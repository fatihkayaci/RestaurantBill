using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Products.Commands.UpdateProductImageFocus
{
    public class UpdateProductImageFocusCommandHandler : IRequestHandler<UpdateProductImageFocusCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public UpdateProductImageFocusCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(UpdateProductImageFocusCommand request, CancellationToken cancellationToken)
        {
            Product? product = await _db.Products
                .Include(p => p.Category)
                .FirstOrDefaultAsync(p => p.Id == request.ProductId, cancellationToken);
            if (product is null)
                return Result.Failure("Böyle bir ürün bulunamadı.");

            if (product.Category.BranchId != _currentUser.BranchId)
                return Result.Failure("Bu ürüne erişim yetkiniz yok.");

            product.UpdateImageFocus(request.ImageFocus);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
