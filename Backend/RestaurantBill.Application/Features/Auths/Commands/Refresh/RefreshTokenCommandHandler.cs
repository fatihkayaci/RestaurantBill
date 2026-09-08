using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Auths.Commands.Refresh;

public class RefreshTokenCommandHandler : IRequestHandler<RefreshTokenCommand, Result<RefreshTokenResponseDto>>
{
    private const string InvalidSessionError = "Oturum geçersiz, tekrar giriş yapın.";

    private readonly IAppDbContext _db;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;
    private readonly RefreshTokenSettings _refreshTokenSettings;

    public RefreshTokenCommandHandler(IAppDbContext db, IJwtTokenGenerator jwtTokenGenerator, IConfiguration configuration)
    {
        _db = db;
        _jwtTokenGenerator = jwtTokenGenerator;
        _refreshTokenSettings = RefreshTokenSettings.FromConfiguration(configuration);
    }

    public async Task<Result<RefreshTokenResponseDto>> Handle(RefreshTokenCommand request, CancellationToken cancellationToken)
    {
        string incomingHash = RefreshTokenHasher.Hash(request.RefreshToken);

        RefreshToken? stored = await _db.RefreshTokens
            .FirstOrDefaultAsync(rt => rt.TokenHash == incomingHash, cancellationToken);

        if (stored is null)
            return Result<RefreshTokenResponseDto>.Failure(InvalidSessionError);

        if (stored.RevokedAt is not null)
        {
            await RevokeChainAsync(stored, cancellationToken);
            await LogReuseAsync(stored, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
            return Result<RefreshTokenResponseDto>.Failure(InvalidSessionError);
        }

        if (stored.ExpiresAt <= DateTime.UtcNow)
            return Result<RefreshTokenResponseDto>.Failure(InvalidSessionError);

        User? user = await _db.Users
            .FirstOrDefaultAsync(u => u.Id == stored.UserId && !u.IsDeleted && u.IsActive, cancellationToken);

        if (user is null)
        {
            await RevokeAllForUserAsync(stored.UserId, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
            return Result<RefreshTokenResponseDto>.Failure(InvalidSessionError);
        }

        string userName;
        UserRole currentRole;

        if (stored.Role == UserRole.Owner)
        {
            Company? company = await _db.Companies
                .FirstOrDefaultAsync(c => c.Id == stored.BranchId && c.OwnerUserId == user.Id && !c.IsDeleted, cancellationToken);

            if (company is null)
            {
                await RevokeAllForUserAsync(stored.UserId, cancellationToken);
                await _db.SaveChangesAsync(cancellationToken);
                return Result<RefreshTokenResponseDto>.Failure(InvalidSessionError);
            }

            userName = user.Email;
            currentRole = UserRole.Owner;
        }
        else
        {
            UserBranch? membership = await _db.UserBranches
                .FirstOrDefaultAsync(ub => ub.UserId == stored.UserId && ub.BranchId == stored.BranchId && !ub.IsDeleted, cancellationToken);

            if (membership is null || !membership.IsActive)
            {
                await RevokeAllForUserAsync(stored.UserId, cancellationToken);
                await _db.SaveChangesAsync(cancellationToken);
                return Result<RefreshTokenResponseDto>.Failure(InvalidSessionError);
            }

            userName = membership.UserName;
            currentRole = membership.Role;
        }

        // Rol değiştiyse (ör. Admin bir çalışanı azaltmış/yetkisini almış) tüm oturumlar kapatılır.
        if (currentRole != stored.Role)
        {
            await RevokeAllForUserAsync(stored.UserId, cancellationToken);
            await _db.SaveChangesAsync(cancellationToken);
            return Result<RefreshTokenResponseDto>.Failure("Yetkileriniz değişti, tekrar giriş yapın.");
        }

        DateTime now = DateTime.UtcNow;
        DateTime candidateExpiresAt = now.Add(_refreshTokenSettings.LifetimeFor(stored.RememberMe));
        DateTime newExpiresAt = candidateExpiresAt < stored.AbsoluteExpiresAt ? candidateExpiresAt : stored.AbsoluteExpiresAt;

        string newRawToken = RefreshTokenHasher.GenerateRawToken();
        string newHash = RefreshTokenHasher.Hash(newRawToken);

        RefreshToken newToken = RefreshToken.Create(
            stored.UserId, stored.BranchId, currentRole, newHash, newExpiresAt, stored.AbsoluteExpiresAt,
            stored.RememberMe, request.IpAddress, request.UserAgent);

        stored.ReplaceWith(newHash);
        _db.RefreshTokens.Add(newToken);
        await _db.SaveChangesAsync(cancellationToken);

        string accessToken = _jwtTokenGenerator.GenerateToken(user, stored.BranchId, currentRole, userName);

        return Result<RefreshTokenResponseDto>.Success(new RefreshTokenResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = newRawToken,
            RefreshTokenExpiresAt = newExpiresAt,
            RememberMe = stored.RememberMe
        });
    }

    private async Task RevokeChainAsync(RefreshToken startToken, CancellationToken cancellationToken)
    {
        RefreshToken? current = startToken;

        while (current is not null)
        {
            current.Revoke();

            if (string.IsNullOrEmpty(current.ReplacedByTokenHash))
                break;

            current = await _db.RefreshTokens
                .FirstOrDefaultAsync(rt => rt.TokenHash == current.ReplacedByTokenHash, cancellationToken);
        }
    }

    private async Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        List<RefreshToken> tokens = await _db.RefreshTokens
            .Where(rt => rt.UserId == userId && rt.RevokedAt == null)
            .ToListAsync(cancellationToken);

        foreach (RefreshToken token in tokens)
            token.Revoke();
    }

    private async Task LogReuseAsync(RefreshToken stored, CancellationToken cancellationToken)
    {
        User? user = await _db.Users.FirstOrDefaultAsync(u => u.Id == stored.UserId, cancellationToken);

        AuditLog log = AuditLog.Create(
            stored.BranchId,
            user?.FullName ?? "Bilinmeyen kullanıcı",
            AuditLogCategory.Auth,
            AuditLogSeverity.Warning,
            "RefreshTokenReuseDetected",
            $"Daha önce kullanılmış/iptal edilmiş bir refresh token tekrar kullanılmaya çalışıldı. UserId: {stored.UserId}",
            nameof(RefreshToken),
            stored.Id);

        _db.AuditLogs.Add(log);
    }
}
