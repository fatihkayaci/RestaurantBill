using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.SetBranchSlug
{
    public class SetBranchSlugCommandHandler : IRequestHandler<SetBranchSlugCommand, Result<string>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public SetBranchSlugCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result<string>> Handle(SetBranchSlugCommand request, CancellationToken cancellationToken)
        {
            Company? company = await _uow.Company.GetByIdAsync(request.RestaurantId, true);
            if (company is null || company.OwnerUserId != _currentUser.UserId)
                return Result<string>.Failure("Şube bulunamadı.");

            string slug = SlugHelper.Slugify(request.Slug);
            if (string.IsNullOrWhiteSpace(slug))
                return Result<string>.Failure("Geçersiz adres.");

            bool slugExists = (await _uow.Company.GetAllAsync(c => c.Slug == slug && c.Id != request.RestaurantId && !c.IsDeleted, false)).Any();
            if (slugExists)
                return Result<string>.Failure("Bu adres zaten kullanımda, başka bir adres deneyin.");

            company.Slug = slug;

            await _uow.SaveChangesAsync(cancellationToken);
            return Result<string>.Success(slug);
        }
    }
}
