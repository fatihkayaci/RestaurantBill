using Microsoft.Extensions.Configuration;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Auths.Commands.Refresh;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Auths;

public class RefreshTokenCommandHandlerTests : ApplicationTestBase
{
    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private RefreshTokenCommandHandler CreateHandler()
        => new(Db, new FakeJwtTokenGenerator(), new ConfigurationBuilder().Build());

    private async Task<(User Owner, Company Company)> SeedOwnerAsync()
    {
        User owner = User.Create("Fatih", "owner@mail.com", "05001234567");
        SetId(owner, Guid.NewGuid());
        owner.SetPasswordHash("hashed_sifre123");
        DbContext.Users.Add(owner);

        Company company = Company.Create("Test Restoran", owner);
        DbContext.Companies.Add(company);

        await DbContext.SaveChangesAsync();
        return (owner, company);
    }

    private async Task<string> SeedRefreshTokenAsync(Guid userId, Guid branchId, UserRole role, bool revoked = false, DateTime? expiresAt = null, bool rememberMe = false)
    {
        string rawToken = RefreshTokenHasher.GenerateRawToken();
        string hash = RefreshTokenHasher.Hash(rawToken);
        DateTime expires = expiresAt ?? DateTime.UtcNow.AddDays(1);

        RefreshToken token = RefreshToken.Create(userId, branchId, role, hash, expires, expires, rememberMe, null, null);
        if (revoked)
            token.Revoke();

        DbContext.RefreshTokens.Add(token);
        await DbContext.SaveChangesAsync();
        return rawToken;
    }

    [Fact]
    public async Task Handle_ValidOwnerToken_RotatesAndReturnsNewAccessToken()
    {
        (User owner, Company company) = await SeedOwnerAsync();
        string rawToken = await SeedRefreshTokenAsync(owner.Id, company.Id, UserRole.Owner);

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand { RefreshToken = rawToken }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.StartsWith("token:", result.Value!.AccessToken);
        Assert.NotEqual(rawToken, result.Value.RefreshToken);

        RefreshToken oldToken = DbContext.RefreshTokens.Single(rt => rt.TokenHash == RefreshTokenHasher.Hash(rawToken));
        Assert.NotNull(oldToken.RevokedAt);
        Assert.Equal(RefreshTokenHasher.Hash(result.Value.RefreshToken), oldToken.ReplacedByTokenHash);
    }

    [Fact]
    public async Task Handle_UnknownToken_ReturnsFailure()
    {
        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand { RefreshToken = "not-a-real-token" }, CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Handle_ExpiredToken_ReturnsFailure()
    {
        (User owner, Company company) = await SeedOwnerAsync();
        string rawToken = await SeedRefreshTokenAsync(owner.Id, company.Id, UserRole.Owner, expiresAt: DateTime.UtcNow.AddMinutes(-1));

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand { RefreshToken = rawToken }, CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Handle_RevokedTokenReused_RevokesWholeChainAndLogsAudit()
    {
        (User owner, Company company) = await SeedOwnerAsync();
        string rawToken = await SeedRefreshTokenAsync(owner.Id, company.Id, UserRole.Owner);

        var handler = CreateHandler();

        // İlk refresh: token rotate edilir (zincirde bir sonraki halkayı oluşturur).
        var firstResult = await handler.Handle(new RefreshTokenCommand { RefreshToken = rawToken }, CancellationToken.None);
        Assert.True(firstResult.IsSuccess);

        // Aynı (artık revoke edilmiş) token tekrar kullanılmaya çalışılırsa, reuse tespit edilmeli.
        var reuseResult = await handler.Handle(new RefreshTokenCommand { RefreshToken = rawToken }, CancellationToken.None);
        Assert.False(reuseResult.IsSuccess);

        // Zincirdeki yeni token da (henüz kullanılmamış olsa dahi) revoke edilmiş olmalı.
        RefreshToken rotatedToken = DbContext.RefreshTokens.Single(rt => rt.TokenHash == RefreshTokenHasher.Hash(firstResult.Value!.RefreshToken));
        Assert.NotNull(rotatedToken.RevokedAt);

        bool hasAuditLog = DbContext.AuditLogs.Any(a => a.Action == "RefreshTokenReuseDetected");
        Assert.True(hasAuditLog);
    }

    [Fact]
    public async Task Handle_EmployeeRoleChangedInDb_RevokesAllTokensAndFails()
    {
        (User owner, Company company) = await SeedOwnerAsync();

        Branch branch = Branch.Create(company.Id, "Merkez Şube", "Yönetici", "111", "b@mail.com", "İstanbul", "Kadıköy", "Adres", 0);
        SetId(branch, Guid.NewGuid());
        DbContext.Branches.Add(branch);

        User employee = User.Create("Çalışan", "", "");
        SetId(employee, Guid.NewGuid());
        employee.SetPasswordHash("hashed_sifre456");
        DbContext.Users.Add(employee);

        UserBranch membership = UserBranch.Create(employee, branch, "calisan", "USR01", UserRole.Waiter);
        DbContext.UserBranches.Add(membership);
        await DbContext.SaveChangesAsync();

        // Token, çalışan Kitchen rolündeyken üretilmiş gibi davranıyoruz; DB'deki güncel rol Waiter.
        string rawToken = await SeedRefreshTokenAsync(employee.Id, branch.Id, UserRole.Kitchen);

        var handler = CreateHandler();
        var result = await handler.Handle(new RefreshTokenCommand { RefreshToken = rawToken }, CancellationToken.None);

        Assert.False(result.IsSuccess);

        RefreshToken storedToken = DbContext.RefreshTokens.Single(rt => rt.TokenHash == RefreshTokenHasher.Hash(rawToken));
        Assert.NotNull(storedToken.RevokedAt);
    }
}
