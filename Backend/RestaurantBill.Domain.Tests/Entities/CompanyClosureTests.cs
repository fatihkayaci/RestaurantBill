using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Domain.Tests.Entities;

public class CompanyClosureTests
{
    private static Company NewCompany() => Company.Create("Test", User.Create("Sahip", "s@test.com", "5550000000"));

    [Fact]
    public void Close_SchedulesDeletionAfterGracePeriod_AndCancelRestores()
    {
        Company company = NewCompany();
        DateTime now = new(2026, 11, 17, 10, 0, 0, DateTimeKind.Utc);

        company.Close(now);

        Assert.True(company.IsClosed);
        Assert.Equal(now.AddDays(Company.ClosureGraceDays), company.DeletionScheduledAt);
        Assert.False(company.IsDueForDeletion(now.AddDays(29)));
        Assert.True(company.IsDueForDeletion(now.AddDays(30)));
        Assert.Throws<DomainException>(() => company.Close(now));

        company.CancelClosure();

        Assert.False(company.IsClosed);
        Assert.Null(company.DeletionScheduledAt);
        Assert.False(company.IsDueForDeletion(now.AddDays(60)));
        Assert.Throws<DomainException>(() => company.CancelClosure());
    }

    [Theory]
    [InlineData("products/0f0e0d0c0b0a09080706050403020100/", true)]
    [InlineData("site/0f0e0d0c0b0a09080706050403020100/", true)]
    [InlineData("shared/0f0e0d0c0b0a09080706050403020100/", false)]
    [InlineData("shared/stock/", false)]
    [InlineData("products/", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    [InlineData("products/00000000000000000000000000000000/", false)]
    [InlineData("products/0f0e0d0c0b0a09080706050403020100", false)]
    [InlineData("products/0f0e0d0c0b0a09080706050403020100/x.webp", false)]
    [InlineData("other/0f0e0d0c0b0a09080706050403020100/", false)]
    public void IsOwnFolder_OnlyAcceptsExactUploadFolderOfOneId(string? folder, bool expected)
    {
        Assert.Equal(expected, StorageKeys.IsOwnFolder(folder));
    }
}
