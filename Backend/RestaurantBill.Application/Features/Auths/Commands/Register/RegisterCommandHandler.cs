using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.Register
{
    public class RegisterCommandHandler : IRequestHandler<RegisterCommand, Result<string>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IPasswordHasher<User> _passwordHasher;

        public RegisterCommandHandler(IUnitOfWork uow, IPasswordHasher<User> passwordHasher)
        {
            _uow = uow;
            _passwordHasher = passwordHasher;
        }

        public async Task<Result<string>> Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            bool userNameExists = (await _uow.User.GetAllAsync(u => u.UserName == request.UserName && !u.IsDeleted, false)).Any();
            if (userNameExists)
                return Result<string>.Failure("Bu kullanıcı adı zaten kullanımda.");

            bool emailExists = (await _uow.User.GetAllAsync(u => u.Email == request.Email && !u.IsDeleted, false)).Any();
            if (emailExists)
                return Result<string>.Failure("Bu e-posta adresi zaten kullanımda.");

            Restaurant restaurant = Restaurant.Create(request.RestaurantName);
            restaurant.AssignSlug(await GenerateUniqueSlugAsync(request.RestaurantName));

            string userCode = $"USR-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
            User user = User.Create(request.FullName, request.UserName, request.Email, null, userCode, UserRole.Admin, restaurant);
            user.SetPasswordHash(_passwordHasher.HashPassword(user, request.Password));

            Membership membership = Membership.Create(restaurant, MembershipPlanType.Free, DateTime.UtcNow, DateTime.UtcNow.AddDays(14));

            await _uow.Restaurant.AddAsync(restaurant);
            await _uow.User.AddAsync(user);
            await _uow.Membership.AddAsync(membership);
            await _uow.SaveChangesAsync(cancellationToken);

            return Result<string>.Success(restaurant.Slug);
        }

        private async Task<string> GenerateUniqueSlugAsync(string restaurantName)
        {
            string baseSlug = SlugHelper.Slugify(restaurantName);
            string candidate = baseSlug;
            int suffix = 2;
            while ((await _uow.Restaurant.GetAllAsync(r => r.Slug == candidate, false)).Any())
            {
                candidate = $"{baseSlug}-{suffix}";
                suffix++;
            }
            return candidate;
        }
    }
}
