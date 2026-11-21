using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Features.Stats;
using RestaurantBill.Application.Features.Stats.Commands.UpdateDashboardLayout;
using RestaurantBill.Application.Features.Stats.Commands.UpdateOwnerDashboardLayout;
using RestaurantBill.Application.Features.Stats.Queries.GetDashboardLayout;
using RestaurantBill.Application.Features.Stats.Queries.GetOwnerDashboardLayout;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;

namespace RestaurantBill.Application.Tests.Features.Stats;

// Panel kart sırası kullanıcı başına saklanır: bir kullanıcının sürükle-bırak düzeni diğerini etkilemez.
public class DashboardLayoutTests : ApplicationTestBase
{
    private Task<Domain.Shared.Result<List<string>>> GetOwnerLayout(FakeCurrentUserService user) =>
        new GetOwnerDashboardLayoutQueryHandler(Db, user).Handle(new GetOwnerDashboardLayoutQuery(), CancellationToken.None);

    private Task<Domain.Shared.Result<List<string>>> SaveOwnerLayout(FakeCurrentUserService user, List<string>? widgets) =>
        new UpdateOwnerDashboardLayoutCommandHandler(Db, user).Handle(new UpdateOwnerDashboardLayoutCommand { Widgets = widgets }, CancellationToken.None);

    [Fact]
    public async Task OwnerLayout_NotSaved_ReturnsDefaultOrder()
    {
        await SeedActorAsync();

        var result = await GetOwnerLayout(CurrentUser);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(OwnerDashboardWidgets.All, result.Value);
    }

    [Fact]
    public async Task OwnerLayout_Save_DropsUnknownAndAppendsMissing()
    {
        await SeedActorAsync();

        var saved = await SaveOwnerLayout(CurrentUser, ["auditLogs", "eskiKart", "trend"]);

        Assert.True(saved.IsSuccess, saved.Error);
        Assert.Equal("auditLogs", saved.Value![0]);
        Assert.Equal("trend", saved.Value[1]);
        Assert.DoesNotContain("eskiKart", saved.Value);
        Assert.Equal(OwnerDashboardWidgets.All.Count, saved.Value.Count);

        // Saklanan liste yalnızca bilinen kimlikleri içerir; eksikler okurken katalog sırasıyla sona eklenir.
        var stored = await DbContext.Users.AsNoTracking().SingleAsync(u => u.Id == CurrentUser.UserId);
        Assert.Equal(["auditLogs", "trend"], stored.OwnerDashboardWidgets);

        var read = await GetOwnerLayout(CurrentUser);
        Assert.Equal(saved.Value, read.Value);
        Assert.Equal(OwnerDashboardWidgets.All.Except(["auditLogs", "trend"]), read.Value!.Skip(2));
    }

    [Fact]
    public async Task OwnerLayout_IsPerUser()
    {
        await SeedActorAsync("Birinci");
        var other = new FakeCurrentUserService();
        await SeedActorAsync("İkinci", other.UserId);

        await SaveOwnerLayout(CurrentUser, ["payments", "revenue"]);

        var mine = await GetOwnerLayout(CurrentUser);
        var theirs = await GetOwnerLayout(other);
        Assert.Equal("payments", mine.Value![0]);
        Assert.Equal(OwnerDashboardWidgets.All, theirs.Value);

        var otherUser = await DbContext.Users.AsNoTracking().SingleAsync(u => u.Id == other.UserId);
        Assert.Null(otherUser.OwnerDashboardWidgets);
    }

    [Fact]
    public async Task OwnerLayout_SaveNull_ResetsToDefault()
    {
        await SeedActorAsync();
        await SaveOwnerLayout(CurrentUser, ["payments"]);

        var reset = await SaveOwnerLayout(CurrentUser, null);

        Assert.Equal(OwnerDashboardWidgets.All, reset.Value);
        var stored = await DbContext.Users.AsNoTracking().SingleAsync(u => u.Id == CurrentUser.UserId);
        Assert.Null(stored.OwnerDashboardWidgets);
    }

    [Fact]
    public async Task OwnerLayout_UnknownUser_Fails()
    {
        var result = await SaveOwnerLayout(CurrentUser, ["revenue"]);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task OwnerLayout_DoesNotTouchBranchOverviewLayout()
    {
        await SeedActorAsync();
        await new UpdateDashboardLayoutCommandHandler(Db, CurrentUser)
            .Handle(new UpdateDashboardLayoutCommand { Cards = ["top", "revenue"] }, CancellationToken.None);

        await SaveOwnerLayout(CurrentUser, ["trend"]);

        var branch = await new GetDashboardLayoutQueryHandler(Db, CurrentUser).Handle(new GetDashboardLayoutQuery(), CancellationToken.None);
        Assert.Equal(["top", "revenue"], branch.Value);
    }

    [Theory]
    [InlineData("revenue,revenue")]
    [InlineData("revenue, ")]
    public void OwnerLayoutValidator_RejectsDuplicatesAndBlankIds(string csv)
    {
        var validation = new UpdateOwnerDashboardLayoutCommandValidator().Validate(new UpdateOwnerDashboardLayoutCommand { Widgets = [.. csv.Split(',')] });

        Assert.False(validation.IsValid);
    }

    [Fact]
    public void OwnerLayoutValidator_RejectsTooManyIds()
    {
        var widgets = Enumerable.Range(0, UpdateOwnerDashboardLayoutCommandValidator.MaxWidgets + 1).Select(i => $"k{i}").ToList();

        var validation = new UpdateOwnerDashboardLayoutCommandValidator().Validate(new UpdateOwnerDashboardLayoutCommand { Widgets = widgets });

        Assert.False(validation.IsValid);
    }

    [Fact]
    public void OwnerLayoutValidator_AcceptsNullAndUnknownIds()
    {
        var validator = new UpdateOwnerDashboardLayoutCommandValidator();

        Assert.True(validator.Validate(new UpdateOwnerDashboardLayoutCommand { Widgets = null }).IsValid);
        Assert.True(validator.Validate(new UpdateOwnerDashboardLayoutCommand { Widgets = ["revenue", "yeniKart"] }).IsValid);
    }

    [Fact]
    public async Task BranchOverviewLayout_IsPerUser()
    {
        await SeedActorAsync("Birinci");
        var other = new FakeCurrentUserService();
        await SeedActorAsync("İkinci", other.UserId);

        await new UpdateDashboardLayoutCommandHandler(Db, CurrentUser)
            .Handle(new UpdateDashboardLayoutCommand { Cards = ["hourly", "revenue"] }, CancellationToken.None);

        var mine = await new GetDashboardLayoutQueryHandler(Db, CurrentUser).Handle(new GetDashboardLayoutQuery(), CancellationToken.None);
        var theirs = await new GetDashboardLayoutQueryHandler(Db, other).Handle(new GetDashboardLayoutQuery(), CancellationToken.None);
        Assert.Equal(["hourly", "revenue"], mine.Value);
        Assert.Equal(DashboardCards.Default, theirs.Value);
    }
}
