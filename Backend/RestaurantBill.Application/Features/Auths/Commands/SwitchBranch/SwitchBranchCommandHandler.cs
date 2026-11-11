using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.SwitchBranch;

public class SwitchBranchCommandHandler : IRequestHandler<SwitchBranchCommand, Result<RefreshTokenResponseDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly RefreshTokenSettings _refreshTokenSettings;

    public SwitchBranchCommandHandler(
        IAppDbContext db,
        ICurrentUserService currentUser,
        IJwtTokenGenerator jwtTokenGenerator,
        IConfiguration configuration)
    {
        _db = db;
        _currentUser = currentUser;
        _jwtTokenGenerator = jwtTokenGenerator;
        _refreshTokenSettings = RefreshTokenSettings.FromConfiguration(configuration);
    }

    public async Task<Result<RefreshTokenResponseDto>> Handle(SwitchBranchCommand request, CancellationToken cancellationToken)
    {
        User? user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == _currentUser.UserId && !u.IsDeleted && u.IsActive, cancellationToken);
        if (user is null)
            return Result<RefreshTokenResponseDto>.Failure("Kullanıcı bulunamadı.");

        Guid scopeId;
        Guid companyId;
        UserRole role;
        string userName;

        if (_currentUser.Role == nameof(UserRole.Owner))
        {
            if (request.BranchId is Guid branchId)
            {
                Branch? branch = await _db.Branches
                    .AsNoTracking()
                    .FirstOrDefaultAsync(b => b.Id == branchId && !b.IsDeleted && b.Company.OwnerUserId == user.Id && !b.Company.IsDeleted, cancellationToken);
                if (branch is null)
                    return Result<RefreshTokenResponseDto>.Failure("Bu şubeye erişim yetkiniz yok.");

                scopeId = branch.Id;
                companyId = branch.CompanyId;
            }
            else
            {
                bool ownsCompany = await _db.Companies
                    .AnyAsync(c => c.Id == _currentUser.CompanyId && c.OwnerUserId == user.Id && !c.IsDeleted, cancellationToken);
                if (!ownsCompany)
                    return Result<RefreshTokenResponseDto>.Failure("Şirket bulunamadı.");

                scopeId = _currentUser.CompanyId;
                companyId = _currentUser.CompanyId;
            }

            role = UserRole.Owner;
            userName = user.Email ?? string.Empty;
        }
        else if (_currentUser.Role == nameof(UserRole.Admin))
        {
            if (request.BranchId is not Guid branchId)
                return Result<RefreshTokenResponseDto>.Failure("Şube seçilmelidir.");

            UserBranch? membership = await _db.UserBranches
                .AsNoTracking()
                .Include(ub => ub.Branch)
                .FirstOrDefaultAsync(ub => ub.UserId == user.Id && ub.BranchId == branchId && !ub.IsDeleted && ub.IsActive && !ub.Branch.IsDeleted, cancellationToken);
            if (membership is null)
                return Result<RefreshTokenResponseDto>.Failure("Bu şubeye erişim yetkiniz yok.");

            scopeId = membership.BranchId;
            companyId = membership.Branch.CompanyId;
            role = membership.Role;
            userName = membership.UserName;
        }
        else
        {
            // Garson/mutfak/kasiyer ortak cihazda tek şubede çalışır; şube değiştirme onlara açık değil.
            return Result<RefreshTokenResponseDto>.Failure("Bu işlem için yetkiniz yok.");
        }

        bool rememberMe = false;
        if (!string.IsNullOrEmpty(request.CurrentRefreshToken))
        {
            string currentHash = RefreshTokenHasher.Hash(request.CurrentRefreshToken);
            RefreshToken? current = await _db.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.TokenHash == currentHash && rt.UserId == user.Id, cancellationToken);
            if (current is not null && current.RevokedAt is null)
            {
                rememberMe = current.RememberMe;
                current.Revoke();
            }
        }

        (string rawRefreshToken, DateTime refreshExpiresAt) = RefreshTokenIssuer.Issue(
            _db, _refreshTokenSettings, user.Id, scopeId, role, rememberMe);
        await _db.SaveChangesAsync(cancellationToken);

        return Result<RefreshTokenResponseDto>.Success(new RefreshTokenResponseDto
        {
            AccessToken = _jwtTokenGenerator.GenerateToken(user, scopeId, role, userName, companyId),
            RefreshToken = rawRefreshToken,
            RefreshTokenExpiresAt = refreshExpiresAt,
            RememberMe = rememberMe
        });
    }
}
