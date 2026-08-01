using RestaurantBill.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.Login
{
    public class LoginCommandHandler : IRequestHandler<LoginCommand, Result<LoginResponseDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;
        private readonly ITenantResolver _tenantResolver;

        public LoginCommandHandler(IUnitOfWork uow, IPasswordHasher<User> passwordHasher, IJwtTokenGenerator jwtTokenGenerator, ITenantResolver tenantResolver)
        {
            _uow = uow;
            _passwordHasher = passwordHasher;
            _jwtTokenGenerator = jwtTokenGenerator;
            _tenantResolver = tenantResolver;
        }

        public async Task<Result<LoginResponseDto>> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            string? slug = _tenantResolver.Slug;

            if (string.IsNullOrWhiteSpace(slug))
            {
                if (!string.IsNullOrWhiteSpace(request.UserName))
                    return Result<LoginResponseDto>.Failure("Kullanıcı adıyla giriş yapabilmek için restoran belirlenmelidir.");

                return await LoginAsOwnerWithoutSlugAsync(request);
            }

            Company? company = (await _uow.Company
                .GetAllAsync(c => c.Slug == slug && !c.IsDeleted, false)).FirstOrDefault();

            if (company is null)
                return Result<LoginResponseDto>.Failure("Böyle bir Restaurant bulunamadı. Url i değiştirip tekrar deneyiniz");

            if (!string.IsNullOrWhiteSpace(request.UserName))
                return await LoginAsEmployeeAsync(request, company);

            return await LoginAsOwnerAsync(request, company);
        }

        private async Task<Result<LoginResponseDto>> LoginAsOwnerWithoutSlugAsync(LoginCommand request)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            User? emailUser = (await _uow.User.GetAllAsync(u => u.Email == request.Email && !u.IsDeleted, false)).FirstOrDefault();

            if (emailUser is null)
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            if (_passwordHasher.VerifyHashedPassword(emailUser, emailUser.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            IEnumerable<Company> owneds = await _uow.Company.GetAllAsync(c => c.OwnerUserId == emailUser.Id && !c.IsDeleted, false);

            var accessible = new Dictionary<Guid, (Company Company, UserRole Role, string UserName)>();
            foreach (Company owned in owneds)
                accessible[owned.Id] = (owned, UserRole.Owner, emailUser.Email!);

            if (accessible.Count == 0)
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            var single = accessible.Values.First();
            return Result<LoginResponseDto>.Success(new LoginResponseDto
            {
                Token = _jwtTokenGenerator.GenerateToken(emailUser, single.Company.Id, single.Role, single.UserName),
                NeedsSlugSetup = string.IsNullOrWhiteSpace(single.Company.Slug)
            });
        }

        private async Task<Result<LoginResponseDto>> LoginAsEmployeeAsync(LoginCommand request, Company company)
        {
            UserBranch? membership = (await _uow.UserBranch.GetAllAsync(
                ur => ur.Branch.CompanyId == company.Id
                   && ur.UserName == request.UserName
                   && !ur.IsDeleted
                   && !ur.User.IsDeleted,
                false, nameof(User))).FirstOrDefault();

            if (membership is null)
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            if (_passwordHasher.VerifyHashedPassword(membership.User, membership.User.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            if (!membership.IsActive)
                return Result<LoginResponseDto>.Failure("Hesabınız pasif durumda. Giriş yapabilmek için yöneticinizle iletişime geçin.");

            return Result<LoginResponseDto>.Success(new LoginResponseDto
            {
                Token = _jwtTokenGenerator.GenerateToken(membership.User, membership.BranchId, membership.Role, membership.UserName)
            });
        }

        private async Task<Result<LoginResponseDto>> LoginAsOwnerAsync(LoginCommand request, Company company)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            User? user = (await _uow.User.GetAllAsync(u => u.Email == request.Email && !u.IsDeleted, false)).FirstOrDefault();

            if (user is null)
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            if (_passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            if (company.OwnerUserId != user.Id)
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            return Result<LoginResponseDto>.Success(new LoginResponseDto
            {
                Token = _jwtTokenGenerator.GenerateToken(user, company.Id, UserRole.Owner, user.Email!)
            });
        }
    }
}
