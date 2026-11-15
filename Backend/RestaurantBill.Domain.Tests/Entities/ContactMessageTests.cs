using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class ContactMessageTests
{
    private static readonly Guid BranchId = Guid.NewGuid();

    [Fact]
    public void Create_TrimsFieldsAndStartsUnread()
    {
        ContactMessage message = ContactMessage.Create(BranchId, "  Ayşe Kaya ", " 0532 123 45 67 ", ContactMessageType.Oneri, "  Tatlı menüsü genişlesin.  ");

        Assert.Equal(BranchId, message.BranchId);
        Assert.Equal("Ayşe Kaya", message.Name);
        Assert.Equal("0532 123 45 67", message.Contact);
        Assert.Equal(ContactMessageType.Oneri, message.Type);
        Assert.Equal("Tatlı menüsü genişlesin.", message.Message);
        Assert.False(message.IsRead);
        Assert.Null(message.ReadAt);
    }

    [Fact]
    public void Create_WithoutContact_StoresEmpty()
    {
        ContactMessage message = ContactMessage.Create(BranchId, "Ali", null, ContactMessageType.Diger, "Teşekkürler, çok güzeldi.");

        Assert.Equal(string.Empty, message.Contact);
    }

    [Fact]
    public void Create_EmptyBranch_Throws()
    {
        Assert.Throws<DomainException>(() => ContactMessage.Create(Guid.Empty, "Ali", null, ContactMessageType.Sikayet, "Yemek soğuk geldi."));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_EmptyName_Throws(string name)
    {
        Assert.Throws<DomainException>(() => ContactMessage.Create(BranchId, name, null, ContactMessageType.Sikayet, "Yemek soğuk geldi."));
    }

    [Fact]
    public void Create_TooLongName_Throws()
    {
        string name = new('a', ContactMessage.NameMaxLength + 1);
        Assert.Throws<DomainException>(() => ContactMessage.Create(BranchId, name, null, ContactMessageType.Sikayet, "Yemek soğuk geldi."));
    }

    [Fact]
    public void Create_TooLongContact_Throws()
    {
        string contact = new('5', ContactMessage.ContactMaxLength + 1);
        Assert.Throws<DomainException>(() => ContactMessage.Create(BranchId, "Ali", contact, ContactMessageType.Sikayet, "Yemek soğuk geldi."));
    }

    [Theory]
    [InlineData("")]
    [InlineData("    ")]
    [InlineData("kısa")]
    public void Create_EmptyOrTooShortMessage_Throws(string text)
    {
        Assert.Throws<DomainException>(() => ContactMessage.Create(BranchId, "Ali", null, ContactMessageType.Sikayet, text));
    }

    [Fact]
    public void Create_TooLongMessage_Throws()
    {
        string text = new('a', ContactMessage.MessageMaxLength + 1);
        Assert.Throws<DomainException>(() => ContactMessage.Create(BranchId, "Ali", null, ContactMessageType.Sikayet, text));
    }

    [Fact]
    public void Create_MessageAtMaxLength_Succeeds()
    {
        string text = new('a', ContactMessage.MessageMaxLength);
        ContactMessage message = ContactMessage.Create(BranchId, "Ali", null, ContactMessageType.Sikayet, text);
        Assert.Equal(ContactMessage.MessageMaxLength, message.Message.Length);
    }

    [Fact]
    public void Create_UnknownType_Throws()
    {
        Assert.Throws<DomainException>(() => ContactMessage.Create(BranchId, "Ali", null, (ContactMessageType)99, "Yemek soğuk geldi."));
    }

    [Fact]
    public void MarkAsRead_KeepsFirstReadTime()
    {
        ContactMessage message = ContactMessage.Create(BranchId, "Ali", null, ContactMessageType.Oneri, "Kahvaltı da olsun.");
        DateTime first = new(2026, 11, 15, 10, 0, 0, DateTimeKind.Utc);

        message.MarkAsRead(first);
        message.MarkAsRead(first.AddHours(1));

        Assert.True(message.IsRead);
        Assert.Equal(first, message.ReadAt);
    }
}
