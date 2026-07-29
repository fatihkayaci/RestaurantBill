using RestaurantBill.Domain.Entities;
using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.SetRestaurantSlug
{
    public class SetRestaurantSlugCommandHandler : IRequestHandler<SetRestaurantSlugCommand, Result<string>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public SetRestaurantSlugCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result<string>> Handle(SetRestaurantSlugCommand request, CancellationToken cancellationToken)
        {
            int restaurantId = _currentUser.RestaurantId;

            Restaurant? restaurant = await _uow.Restaurant.GetByIdAsync(restaurantId, true);
            if (restaurant is null)
                return Result<string>.Failure("Restoran bulunamadı.");

            string slug = SlugHelper.Slugify(request.Slug);
            if (string.IsNullOrWhiteSpace(slug))
                return Result<string>.Failure("Geçersiz adres.");

            bool slugExists = (await _uow.Restaurant.GetAllAsync(r => r.Slug == slug && r.Id != restaurantId && !r.IsDeleted, false)).Any();
            if (slugExists)
                return Result<string>.Failure("Bu adres zaten kullanımda, başka bir adres deneyin.");

            restaurant.AssignSlug(slug);

            await _uow.SaveChangesAsync(cancellationToken);
            return Result<string>.Success(slug);
        }
    }
}
