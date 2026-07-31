using RestaurantBill.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Auths.Commands.Register
{
    public class RegisterCommandHandler : IRequestHandler<RegisterCommand, Result<RegisterResponseDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;
        public RegisterCommandHandler(IUnitOfWork uow, IPasswordHasher<User> passwordHasher, IJwtTokenGenerator jwtTokenGenerator)
        {
            _uow = uow;
            _passwordHasher = passwordHasher;
            _jwtTokenGenerator = jwtTokenGenerator;
        }

        public async Task<Result<RegisterResponseDto>> Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            bool phoneNumberExists = (await _uow.User.GetAllAsync(u => u.PhoneNumber == request.PhoneNumber && !u.IsDeleted, false)).Any();
            if (phoneNumberExists)
                return Result<RegisterResponseDto>.Failure("Bu Telefon Numarası zaten kullanımda.");

            bool emailExists = (await _uow.User.GetAllAsync(u => u.Email == request.Email && !u.IsDeleted, false)).Any();
            if (emailExists)
                return Result<RegisterResponseDto>.Failure("Bu e-posta adresi zaten kullanımda.");

            User user = User.Create(request.FullName, request.Email, request.PhoneNumber);
            user.SetPasswordHash(_passwordHasher.HashPassword(user, request.Password));
            Restaurant restaurant = Restaurant.Create(request.RestaurantName, user);

            await _uow.User.AddAsync(user);
            await _uow.Restaurant.AddAsync(restaurant);
            await _uow.SaveChangesAsync(cancellationToken);

            return Result<RegisterResponseDto>.Success(
                new RegisterResponseDto
                {
                    Token = _jwtTokenGenerator.GenerateTransitionToken(user.Id, UserRole.Owner),
                }
            );
        }
    }
}
