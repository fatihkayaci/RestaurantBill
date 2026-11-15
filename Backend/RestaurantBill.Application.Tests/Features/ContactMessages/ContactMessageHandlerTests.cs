using RestaurantBill.Application.Features.ContactMessages;
using RestaurantBill.Application.Features.ContactMessages.Public;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.ContactMessages;

public class ContactMessageHandlerTests : ApplicationTestBase
{
    private const string Slug = "test-restoran";

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    // Şirket (slug) → ana şube (CurrentUser.BranchId) + ikinci şube.
    private async Task<(Branch Main, Branch Other)> SeedRestaurantAsync()
    {
        User owner = await SeedActorAsync();
        Company company = Company.Create("Test Restoran", owner);
        company.Slug = Slug;
        DbContext.Companies.Add(company);
        await DbContext.SaveChangesAsync();

        Branch main = Branch.Create(company.Id, "Merkez", "", "", "", "İstanbul", "Fatih", "", 10m);
        SetId(main, CurrentUser.BranchId);
        DbContext.Branches.Add(main);
        await DbContext.SaveChangesAsync();

        Branch other = Branch.Create(company.Id, "Kadıköy", "", "", "", "İstanbul", "Kadıköy", "", 10m);
        DbContext.Branches.Add(other);
        await DbContext.SaveChangesAsync();

        return (main, other);
    }

    private SubmitContactMessageCommandHandler SubmitHandler() => new(Db, _tenant);

    private static SubmitContactMessageCommand Command(Guid? branchId = null) => new()
    {
        BranchId = branchId,
        Name = "Ayşe Kaya",
        Contact = "ayse@example.com",
        Type = ContactMessageType.Sikayet,
        Message = "Siparişim 40 dakika gecikti."
    };

    private async Task<ContactMessage> SeedMessageAsync(Guid branchId, string text = "Garsonlar çok ilgiliydi.", bool read = false)
    {
        ContactMessage message = ContactMessage.Create(branchId, "Ali", null, ContactMessageType.Oneri, text);
        if (read)
            message.MarkAsRead(DateTime.UtcNow);
        DbContext.ContactMessages.Add(message);
        await DbContext.SaveChangesAsync();
        return message;
    }

    [Fact]
    public async Task Submit_SavesUnreadMessageToRequestedBranch()
    {
        var (_, other) = await SeedRestaurantAsync();

        var result = await SubmitHandler().Handle(Command(other.Id), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        ContactMessage saved = Assert.Single(DbContext.ContactMessages);
        Assert.Equal(other.Id, saved.BranchId);
        Assert.Equal("Ayşe Kaya", saved.Name);
        Assert.Equal("ayse@example.com", saved.Contact);
        Assert.Equal(ContactMessageType.Sikayet, saved.Type);
        Assert.False(saved.IsRead);
    }

    [Fact]
    public async Task Submit_WithoutBranch_UsesCompanysFirstBranch()
    {
        var (main, _) = await SeedRestaurantAsync();

        var result = await SubmitHandler().Handle(Command(), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(main.Id, Assert.Single(DbContext.ContactMessages).BranchId);
    }

    [Fact]
    public async Task Submit_Honeypot_SavesNothing()
    {
        await SeedRestaurantAsync();
        SubmitContactMessageCommand command = Command();
        command.Website = "http://spam.example";

        var result = await SubmitHandler().Handle(command, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(SubmitContactMessageCommandHandler.HoneypotMessage, result.Error);
        Assert.Empty(DbContext.ContactMessages);
    }

    [Fact]
    public async Task Submit_BranchOfAnotherCompany_IsRejected()
    {
        await SeedRestaurantAsync();
        Branch foreign = Branch.Create(Guid.NewGuid(), "Başka", "", "", "", "Ankara", "Çankaya", "", 10m);
        DbContext.Branches.Add(foreign);
        await DbContext.SaveChangesAsync();

        var result = await SubmitHandler().Handle(Command(foreign.Id), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Empty(DbContext.ContactMessages);
    }

    [Fact]
    public async Task Submit_UnknownSlug_IsRejected()
    {
        await SeedRestaurantAsync();
        var handler = new SubmitContactMessageCommandHandler(Db, new FakeTenantResolver { Slug = "yok" });

        var result = await handler.Handle(Command(), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(SubmitContactMessageCommandHandler.RestaurantNotFoundMessage, result.Error);
    }

    [Fact]
    public void Validator_RejectsEmptyMessageAndTooLongText()
    {
        var validator = new SubmitContactMessageCommandValidator();

        SubmitContactMessageCommand empty = Command();
        empty.Message = "";
        SubmitContactMessageCommand tooLong = Command();
        tooLong.Message = new string('a', ContactMessage.MessageMaxLength + 1);
        SubmitContactMessageCommand badType = Command();
        badType.Type = (ContactMessageType)42;

        Assert.False(validator.Validate(empty).IsValid);
        Assert.False(validator.Validate(tooLong).IsValid);
        Assert.False(validator.Validate(badType).IsValid);
        Assert.True(validator.Validate(Command()).IsValid);
    }

    [Fact]
    public async Task List_ReturnsOnlyCurrentBranch_NewestFirst()
    {
        var (main, other) = await SeedRestaurantAsync();
        ContactMessage older = await SeedMessageAsync(main.Id, "İlk mesajım burada.");
        await Task.Delay(5);
        ContactMessage newer = await SeedMessageAsync(main.Id, "İkinci mesajım burada.");
        await SeedMessageAsync(other.Id, "Diğer şubenin mesajı.");

        var result = await new GetContactMessagesQueryHandler(Db, CurrentUser)
            .Handle(new GetContactMessagesQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal([newer.Id, older.Id], result.Value!.Select(m => m.Id));
    }

    [Fact]
    public async Task List_UnreadOnly_AndCount_SkipReadAndDeleted()
    {
        var (main, _) = await SeedRestaurantAsync();
        ContactMessage unread = await SeedMessageAsync(main.Id);
        await SeedMessageAsync(main.Id, read: true);
        ContactMessage deleted = await SeedMessageAsync(main.Id);
        deleted.MarkAsDeleted();
        await DbContext.SaveChangesAsync();

        var list = await new GetContactMessagesQueryHandler(Db, CurrentUser)
            .Handle(new GetContactMessagesQuery { UnreadOnly = true }, CancellationToken.None);
        var count = await new GetUnreadContactMessageCountQueryHandler(Db, CurrentUser)
            .Handle(new GetUnreadContactMessageCountQuery(), CancellationToken.None);

        Assert.Equal(unread.Id, Assert.Single(list.Value!).Id);
        Assert.Equal(1, count.Value!.Count);
    }

    [Fact]
    public async Task MarkRead_SetsReadAndDecreasesUnreadCount()
    {
        var (main, _) = await SeedRestaurantAsync();
        ContactMessage message = await SeedMessageAsync(main.Id);

        var result = await new MarkContactMessageReadCommandHandler(Db, CurrentUser, TimeProvider.System)
            .Handle(new MarkContactMessageReadCommand { Id = message.Id }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        ContactMessage saved = DbContext.ContactMessages.Single();
        Assert.True(saved.IsRead);
        Assert.NotNull(saved.ReadAt);
        var count = await new GetUnreadContactMessageCountQueryHandler(Db, CurrentUser)
            .Handle(new GetUnreadContactMessageCountQuery(), CancellationToken.None);
        Assert.Equal(0, count.Value!.Count);
    }

    [Fact]
    public async Task MarkRead_MessageOfAnotherBranch_IsNotFound()
    {
        var (_, other) = await SeedRestaurantAsync();
        ContactMessage message = await SeedMessageAsync(other.Id);

        var result = await new MarkContactMessageReadCommandHandler(Db, CurrentUser, TimeProvider.System)
            .Handle(new MarkContactMessageReadCommand { Id = message.Id }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.False(DbContext.ContactMessages.Single().IsRead);
    }

    [Fact]
    public async Task Delete_SoftDeletesOwnBranchMessage_AndRejectsOtherBranch()
    {
        var (main, other) = await SeedRestaurantAsync();
        ContactMessage own = await SeedMessageAsync(main.Id);
        ContactMessage foreign = await SeedMessageAsync(other.Id);
        var handler = new DeleteContactMessageCommandHandler(Db, CurrentUser);

        var ok = await handler.Handle(new DeleteContactMessageCommand { Id = own.Id }, CancellationToken.None);
        var denied = await handler.Handle(new DeleteContactMessageCommand { Id = foreign.Id }, CancellationToken.None);

        Assert.True(ok.IsSuccess, ok.Error);
        Assert.True(denied.IsFailure);
        Assert.True(DbContext.ContactMessages.Single(m => m.Id == own.Id).IsDeleted);
        Assert.False(DbContext.ContactMessages.Single(m => m.Id == foreign.Id).IsDeleted);
    }
}
