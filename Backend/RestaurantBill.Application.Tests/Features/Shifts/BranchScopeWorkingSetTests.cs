using RestaurantBill.Application.Common;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Tests.Features.Shifts;

// Owner şube modundayken Gün Sonu gibi listeler yalnızca seçili şubeyi görmeli; "Tümü" modunda hepsini.
// Erişim kapsamı ise owner için her iki modda da tüm şubelerdir (admin atama gibi işler için).
public class BranchScopeWorkingSetTests : ApplicationTestBase
{
    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private async Task<(User Owner, Company Company, Branch First, Branch Second)> SeedAsync()
    {
        User owner = User.Create("Sahip", "owner@mail.com", "05001234567");
        SetId(owner, Guid.NewGuid());
        owner.SetPasswordHash("hashed_x");
        DbContext.Users.Add(owner);

        Company company = Company.Create("Test Restoran", owner);
        DbContext.Companies.Add(company);

        Branch first = Branch.Create(company.Id, "Merkez", "Y", "111", "a@mail.com", "İstanbul", "Kadıköy", "Adres", 0);
        SetId(first, Guid.NewGuid());
        Branch second = Branch.Create(company.Id, "Teras", "Y", "222", "b@mail.com", "İstanbul", "Beşiktaş", "Adres", 0);
        SetId(second, Guid.NewGuid());
        DbContext.Branches.AddRange(first, second);

        await DbContext.SaveChangesAsync();
        return (owner, company, first, second);
    }

    [Fact]
    public async Task Owner_InBranchMode_WorkingScope_IsOnlyThatBranch_ButAccessIsAllBranches()
    {
        var (owner, company, first, second) = await SeedAsync();
        var currentUser = new FakeCurrentUserService { UserId = owner.Id, Role = "Owner", BranchId = first.Id, CompanyId = company.Id };

        List<Guid> working = await Db.GetWorkingBranchIdsAsync(currentUser, CancellationToken.None);
        List<Guid> accessible = await Db.GetAccessibleBranchIdsAsync(currentUser, CancellationToken.None);

        Assert.Equal([first.Id], working);
        Assert.Equal(2, accessible.Count);
        Assert.Contains(second.Id, accessible);
    }

    [Fact]
    public async Task Owner_InCompanyMode_WorkingScope_IsAllBranches()
    {
        var (owner, company, first, second) = await SeedAsync();
        var currentUser = new FakeCurrentUserService { UserId = owner.Id, Role = "Owner", BranchId = company.Id, CompanyId = company.Id };

        List<Guid> working = await Db.GetWorkingBranchIdsAsync(currentUser, CancellationToken.None);

        Assert.Equal(2, working.Count);
        Assert.Contains(first.Id, working);
        Assert.Contains(second.Id, working);
    }

    [Fact]
    public async Task Admin_WorkingScope_IsOwnBranch()
    {
        var (_, company, first, _) = await SeedAsync();
        var currentUser = new FakeCurrentUserService { UserId = Guid.NewGuid(), Role = "Admin", BranchId = first.Id, CompanyId = company.Id };

        List<Guid> working = await Db.GetWorkingBranchIdsAsync(currentUser, CancellationToken.None);

        Assert.Equal([first.Id], working);
    }
}
