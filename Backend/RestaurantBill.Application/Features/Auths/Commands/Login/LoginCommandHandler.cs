using RestaurantBill.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.Login
{
    public class LoginCommandHandler : IRequestHandler<LoginCommand, Result<LoginResponseDto>>
    {
        private readonly IAppDbContext _db;
        private readonly IPasswordHasher<User> _passwordHasher;
        private readonly IJwtTokenGenerator _jwtTokenGenerator;
        private readonly ITenantResolver _tenantResolver;

        public LoginCommandHandler(IAppDbContext db, IPasswordHasher<User> passwordHasher, IJwtTokenGenerator jwtTokenGenerator, ITenantResolver tenantResolver)
        {
            _db = db;
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

                return await LoginAsOwnerWithoutSlugAsync(request, cancellationToken);
            }

            Company? company = await _db.Companies
                .FirstOrDefaultAsync(c => c.Slug == slug && !c.IsDeleted, cancellationToken);

            if (company is null)
                return Result<LoginResponseDto>.Failure("Böyle bir Restaurant bulunamadı. Url i değiştirip tekrar deneyiniz");

            if (!string.IsNullOrWhiteSpace(request.UserName))
                return await LoginAsEmployeeAsync(request, company, cancellationToken);

            return await LoginAsOwnerAsync(request, company, cancellationToken);
        }

        private async Task<Result<LoginResponseDto>> LoginAsOwnerWithoutSlugAsync(LoginCommand request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            User? emailUser = await _db.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email && !u.IsDeleted, cancellationToken);

            if (emailUser is null)
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            if (_passwordHasher.VerifyHashedPassword(emailUser, emailUser.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            List<Company> owneds = await _db.Companies
                .Where(c => c.OwnerUserId == emailUser.Id && !c.IsDeleted)
                .ToListAsync(cancellationToken);

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

        private async Task<Result<LoginResponseDto>> LoginAsEmployeeAsync(LoginCommand request, Company company, CancellationToken cancellationToken)
        {
            UserBranch? membership = await _db.UserBranches
                .Include(ur => ur.User)
                .FirstOrDefaultAsync(
                    ur => ur.Branch.CompanyId == company.Id
                       && ur.UserName == request.UserName
                       && !ur.IsDeleted
                       && !ur.User.IsDeleted,
                    cancellationToken);

            if (membership is null)
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            if (_passwordHasher.VerifyHashedPassword(membership.User, membership.User.PasswordHash, request.Password) == PasswordVerificationResult.Failed)
            {
                AuditLog failedLog = AuditLog.Create(
                    membership.BranchId,
                    membership.User.FullName,
                    AuditLogCategory.Auth,
                    AuditLogSeverity.Warning,
                    "EmployeeLoginFailed",
                    $"{membership.User.FullName} için hatalı şifre denemesi.",
                    nameof(User),
                    membership.UserId);
                _db.AuditLogs.Add(failedLog);
                await _db.SaveChangesAsync(cancellationToken);

                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");
            }

            if (!membership.IsActive)
                return Result<LoginResponseDto>.Failure("Hesabınız pasif durumda. Giriş yapabilmek için yöneticinizle iletişime geçin.");

            AuditLog log = AuditLog.Create(
                membership.BranchId,
                membership.User.FullName,
                AuditLogCategory.Auth,
                AuditLogSeverity.Info,
                "EmployeeLogin",
                $"{membership.User.FullName} giriş yaptı.",
                nameof(User),
                membership.UserId);
            _db.AuditLogs.Add(log);
            await _db.SaveChangesAsync(cancellationToken);

            return Result<LoginResponseDto>.Success(new LoginResponseDto
            {
                Token = _jwtTokenGenerator.GenerateToken(membership.User, membership.BranchId, membership.Role, membership.UserName)
            });
        }

        private async Task<Result<LoginResponseDto>> LoginAsOwnerAsync(LoginCommand request, Company company, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.Email))
                return Result<LoginResponseDto>.Failure("Kullanıcı adı, email veya şifre hatalı!");

            User? user = await _db.Users
                .FirstOrDefaultAsync(u => u.Email == request.Email && !u.IsDeleted, cancellationToken);

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
