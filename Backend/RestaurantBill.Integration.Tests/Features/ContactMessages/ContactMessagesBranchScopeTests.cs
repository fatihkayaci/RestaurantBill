using RestaurantBill.Application.Features.ContactMessages;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Integration.Tests.Infrastructure;

namespace RestaurantBill.Integration.Tests.Features.ContactMessages;

// "Şikayet ve Öneriler": admin yalnızca kendi şubesinin mesajlarını görür ve okundu işaretleyebilir.
public class ContactMessagesBranchScopeTests : IntegrationTestBase
{
    private async Task<(ContactMessage Own, ContactMessage Other)> SeedAsync()
    {
        ContactMessage own = ContactMessage.Create(RestaurantId, "Ali", "0532 000 00 00", ContactMessageType.Oneri, "Vejetaryen seçenek ekleyin.");
        ContactMessage other = ContactMessage.Create(OtherRestaurantId, "Veli", null, ContactMessageType.Sikayet, "Masa çok sallanıyordu.");
        DbContext.ContactMessages.AddRange(own, other);
        await DbContext.SaveChangesAsync();
        return (own, other);
    }

    [Fact]
    public async Task List_ReturnsOnlyCurrentBranchMessages()
    {
        var (own, _) = await SeedAsync();

        var result = await new GetContactMessagesQueryHandler(AppDb, CurrentUser)
            .Handle(new GetContactMessagesQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        var item = Assert.Single(result.Value!);
        Assert.Equal(own.Id, item.Id);
        Assert.Equal(ContactMessageType.Oneri, item.Type);
        Assert.Equal("0532 000 00 00", item.Contact);
    }

    [Fact]
    public async Task MarkRead_OnlyWorksForCurrentBranch()
    {
        var (own, other) = await SeedAsync();
        var handler = new MarkContactMessageReadCommandHandler(AppDb, CurrentUser, TimeProvider.System);

        var ok = await handler.Handle(new MarkContactMessageReadCommand { Id = own.Id }, CancellationToken.None);
        var denied = await handler.Handle(new MarkContactMessageReadCommand { Id = other.Id }, CancellationToken.None);

        Assert.True(ok.IsSuccess);
        Assert.True(denied.IsFailure);
        Assert.True(DbContext.ContactMessages.Single(m => m.Id == own.Id).IsRead);
        Assert.False(DbContext.ContactMessages.Single(m => m.Id == other.Id).IsRead);
    }
}
