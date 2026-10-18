using RestaurantBill.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Shared;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Auths.Commands.Register
{
    public class RegisterCommandHandler : IRequestHandler<RegisterCommand, Result<RegisterResponseDto>>
    {
        private readonly IAppDbContext _db;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;
        private readonly RefreshTokenSettings _refreshTokenSettings;
        public RegisterCommandHandler(IAppDbContext db, IPasswordHasher<User> passwordHasher, IJwtTokenGenerator jwtTokenGenerator, IConfiguration configuration)
        {
            _db = db;
            _passwordHasher = passwordHasher;
            _jwtTokenGenerator = jwtTokenGenerator;
            _refreshTokenSettings = RefreshTokenSettings.FromConfiguration(configuration);
        }

        public async Task<Result<RegisterResponseDto>> Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            bool phoneNumberExists = await _db.Users
                .AnyAsync(u => u.PhoneNumber == request.PhoneNumber && !u.IsDeleted, cancellationToken);
            if (phoneNumberExists)
                return Result<RegisterResponseDto>.Failure("Bu Telefon Numarası zaten kullanımda.");

            bool emailExists = await _db.Users
                .AnyAsync(u => u.Email == request.Email && !u.IsDeleted, cancellationToken);
            if (emailExists)
                return Result<RegisterResponseDto>.Failure("Bu e-posta adresi zaten kullanımda.");

            User user = User.Create(request.FullName, request.Email, request.PhoneNumber);
            user.SetPasswordHash(_passwordHasher.HashPassword(user, request.Password));
            Company company = Company.Create(request.RestaurantName, user);

            _db.Users.Add(user);
            _db.Companies.Add(company);
            (string rawRefreshToken, DateTime refreshExpiresAt) = RefreshTokenIssuer.Issue(
                _db, _refreshTokenSettings, user.Id, company.Id, UserRole.Owner, rememberMe: false);
            await _db.SaveChangesAsync(cancellationToken);

            return Result<RegisterResponseDto>.Success(
                new RegisterResponseDto
                {
                    Token = _jwtTokenGenerator.GenerateToken(user, company.Id, UserRole.Owner, user.Email!),
                    NeedsSlugSetup = string.IsNullOrWhiteSpace(company.Slug),
                    RefreshToken = rawRefreshToken,
                    RefreshTokenExpiresAt = refreshExpiresAt
                }
            );
        }
    }
}
