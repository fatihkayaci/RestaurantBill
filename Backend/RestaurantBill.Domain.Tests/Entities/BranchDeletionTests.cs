using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Tests.Entities;

public class BranchDeletionTests
{
    private static Branch NewBranch()
        => Branch.Create(Guid.NewGuid(), "Kadıköy", "Yönetici", "111", "b@mail.com", "İstanbul", "Kadıköy", "Adres", 0);

    [Fact]
    public void Delete_WithAnotherBranchAndNoBlockers_MarksAsDeleted()
    {
        Branch branch = NewBranch();

        branch.Delete(new BranchDeletionBlockers(OtherActiveBranchCount: 1));

        Assert.True(branch.IsDeleted);
        Assert.NotNull(branch.UpdatedAt);
    }

    [Fact]
    public void Delete_LastBranch_Throws()
    {
        Branch branch = NewBranch();

        DomainException ex = Assert.Throws<DomainException>(() => branch.Delete(new BranchDeletionBlockers(OtherActiveBranchCount: 0)));

        Assert.Contains("son şubesi", ex.Message);
        Assert.False(branch.IsDeleted);
    }

    [Fact]
    public void Delete_AlreadyDeleted_Throws()
    {
        Branch branch = NewBranch();
        branch.Delete(new BranchDeletionBlockers(1));

        Assert.Throws<DomainException>(() => branch.Delete(new BranchDeletionBlockers(1)));
    }

    [Theory]
    [InlineData(2, 0, 0, 0, 0, "2 personel")]
    [InlineData(0, 3, 0, 0, 0, "3 açık adisyon")]
    [InlineData(0, 0, 1, 0, 0, "1 açık vardiya")]
    [InlineData(0, 0, 0, 4, 0, "4 sonuçlanmamış paket")]
    [InlineData(0, 0, 0, 0, 5, "5 yaklaşan rezervasyon")]
    public void Delete_WithOngoingWork_ThrowsWithReason(int staff, int orders, int shifts, int deliveries, int reservations, string expected)
    {
        Branch branch = NewBranch();

        DomainException ex = Assert.Throws<DomainException>(() =>
            branch.Delete(new BranchDeletionBlockers(1, staff, orders, shifts, deliveries, reservations)));

        Assert.StartsWith("Şube silinemedi:", ex.Message);
        Assert.Contains(expected, ex.Message);
        Assert.False(branch.IsDeleted);
    }

    [Fact]
    public void Delete_WithSeveralBlockers_ListsAllOfThem()
    {
        Branch branch = NewBranch();

        DomainException ex = Assert.Throws<DomainException>(() =>
            branch.Delete(new BranchDeletionBlockers(1, StaffCount: 2, OpenShiftCount: 1)));

        Assert.Contains("2 personel", ex.Message);
        Assert.Contains("1 açık vardiya", ex.Message);
    }
}
