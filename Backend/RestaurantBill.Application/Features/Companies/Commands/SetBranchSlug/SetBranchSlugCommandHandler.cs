using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Companies.Commands.SetBranchSlug
{
    public class SetBranchSlugCommandHandler : IRequestHandler<SetBranchSlugCommand, Result<string>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public SetBranchSlugCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<string>> Handle(SetBranchSlugCommand request, CancellationToken cancellationToken)
        {
            Company? company = await _db.Companies
                .FirstOrDefaultAsync(c => c.Id == request.RestaurantId, cancellationToken);
            if (company is null || company.OwnerUserId != _currentUser.UserId)
                return Result<string>.Failure("Şube bulunamadı.");

            string slug = SlugHelper.Slugify(request.Slug);
            if (string.IsNullOrWhiteSpace(slug))
                return Result<string>.Failure("Geçersiz adres.");

            bool slugExists = await _db.Companies
                .AnyAsync(c => c.Slug == slug && c.Id != request.RestaurantId && !c.IsDeleted, cancellationToken);
            if (slugExists)
                return Result<string>.Failure("Bu adres zaten kullanımda, başka bir adres deneyin.");

            company.Slug = slug;

            await _db.SaveChangesAsync(cancellationToken);
            return Result<string>.Success(slug);
        }
    }
}
