using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Auths.Commands.Logout;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Auths;

public class LogoutCommandHandlerTests : ApplicationTestBase
{
    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    [Fact]
    public async Task Handle_ValidToken_RevokesIt()
    {
        User owner = User.Create("Fatih", "owner@mail.com", "05001234567");
        SetId(owner, Guid.NewGuid());
        DbContext.Users.Add(owner);
        Company company = Company.Create("Test Restoran", owner);
        DbContext.Companies.Add(company);

        string rawToken = RefreshTokenHasher.GenerateRawToken();
        string hash = RefreshTokenHasher.Hash(rawToken);
        DateTime expires = DateTime.UtcNow.AddDays(1);
        RefreshToken token = RefreshToken.Create(owner.Id, company.Id, UserRole.Owner, hash, expires, expires, false, null, null);
        DbContext.RefreshTokens.Add(token);
        await DbContext.SaveChangesAsync();

        var handler = new LogoutCommandHandler(Db);
        var result = await handler.Handle(new LogoutCommand { RefreshToken = rawToken }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        RefreshToken stored = DbContext.RefreshTokens.Single(rt => rt.TokenHash == hash);
        Assert.NotNull(stored.RevokedAt);
    }

    [Fact]
    public async Task Handle_UnknownToken_StillSucceeds()
    {
        var handler = new LogoutCommandHandler(Db);
        var result = await handler.Handle(new LogoutCommand { RefreshToken = "unknown" }, CancellationToken.None);

        Assert.True(result.IsSuccess);
    }
}
