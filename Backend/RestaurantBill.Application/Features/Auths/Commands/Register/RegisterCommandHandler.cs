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
    public class RegisterCommandHandler : IRequestHandler<RegisterCommand, Result<int>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IPasswordHasher<User> _passwordHasher;

        public RegisterCommandHandler(IUnitOfWork uow, IPasswordHasher<User> passwordHasher)
        {
            _uow = uow;
            _passwordHasher = passwordHasher;
        }

        public async Task<Result<int>> Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            bool phoneNumberExists = (await _uow.User.GetAllAsync(u => u.PhoneNumber == request.PhoneNumber && !u.IsDeleted, false)).Any();
            if (phoneNumberExists)
                return Result<int>.Failure("Bu Telefon Numarası zaten kullanımda.");

            bool emailExists = (await _uow.User.GetAllAsync(u => u.Email == request.Email && !u.IsDeleted, false)).Any();
            if (emailExists)
                return Result<int>.Failure("Bu e-posta adresi zaten kullanımda.");

            User user = User.Create(request.FullName, request.Email, request.PhoneNumber);
            user.SetPasswordHash(_passwordHasher.HashPassword(user, request.Password));
            Restaurant restaurant = Restaurant.Create(request.RestaurantName, user);
            Membership membership = Membership.Create(restaurant, MembershipPlanType.Free, DateTime.UtcNow, DateTime.UtcNow.AddDays(14));

            await _uow.User.AddAsync(user);
            await _uow.Restaurant.AddAsync(restaurant);
            await _uow.Membership.AddAsync(membership);
            await _uow.SaveChangesAsync(cancellationToken);
            
            return Result<int>.Success(user.Id);
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
