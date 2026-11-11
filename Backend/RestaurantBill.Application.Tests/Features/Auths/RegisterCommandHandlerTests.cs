using Microsoft.Extensions.Configuration;
using RestaurantBill.Application.Features.Auths.Commands.Register;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Auths;

public class RegisterCommandHandlerTests : ApplicationTestBase
{
    private RegisterCommandHandler CreateHandler()
        => new(Db, new FakePasswordHasher(), new FakeJwtTokenGenerator(), new ConfigurationBuilder().Build());

    [Fact]
    public async Task Handle_CreatesCompanyWithFirstBranch_AndTokenScopedToThatBranch()
    {
        var result = await CreateHandler().Handle(new RegisterCommand
        {
            FullName = "Fatih Kayacı",
            RestaurantName = "Lezzet Durağı",
            PhoneNumber = "05001234567",
            Email = "owner@mail.com",
            Password = "sifre123"
        }, CancellationToken.None);

        Assert.True(result.IsSuccess);

        Company company = DbContext.Companies.Single();
        Branch branch = DbContext.Branches.Single();
        User owner = DbContext.Users.Single();

        Assert.Equal(company.Id, branch.CompanyId);
        Assert.Equal("Lezzet Durağı", branch.BranchName);
        Assert.Equal($"token:{owner.Id}:{branch.Id}:Owner:owner@mail.com:{company.Id}", result.Value!.Token);

        RefreshToken refresh = DbContext.RefreshTokens.Single();
        Assert.Equal(branch.Id, refresh.BranchId);
        Assert.Equal(UserRole.Owner, refresh.Role);
    }
}
