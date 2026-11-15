using RestaurantBill.Application.DTOs.Delivery;
using RestaurantBill.Application.Features.Delivery.Staff;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.Delivery;

// Panodaki "Online siparişe kapalı" anahtarı durumu bu uçtan okur (kasiyer ayarları okuyamaz).
public class OnlineOrderingStatusTests : DeliveryTestBase
{
    private Task<Result<OnlineOrderingPauseDto>> StatusAsync()
        => new GetOnlineOrderingStatusQueryHandler(Db, CurrentUser)
            .Handle(new GetOnlineOrderingStatusQuery(), CancellationToken.None);

    [Fact]
    public async Task Status_ReflectsPauseAndEnabled()
    {
        await SeedAsync();

        Result<OnlineOrderingPauseDto> before = await StatusAsync();
        Assert.True(before.IsSuccess, before.Error);
        Assert.Equal(Branch.Id, before.Value!.BranchId);
        Assert.True(before.Value.Enabled);
        Assert.False(before.Value.Paused);

        Result<OnlineOrderingPauseDto> paused = await new SetOnlineOrderingPausedCommandHandler(Db, CurrentUser)
            .Handle(new SetOnlineOrderingPausedCommand { Paused = true }, CancellationToken.None);
        Assert.True(paused.IsSuccess, paused.Error);
        Assert.True(paused.Value!.Enabled);

        Result<OnlineOrderingPauseDto> after = await StatusAsync();
        Assert.True(after.Value!.Paused);
    }

    [Fact]
    public async Task Status_WhenSettingsDisabled_ReportsNotEnabled()
    {
        await SeedAsync(Settings(enabled: false));

        Result<OnlineOrderingPauseDto> status = await StatusAsync();

        Assert.True(status.IsSuccess, status.Error);
        Assert.False(status.Value!.Enabled);
    }
}
