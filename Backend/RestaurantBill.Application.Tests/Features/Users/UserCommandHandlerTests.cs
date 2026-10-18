using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Application.Features.Users.Commands.DeleteUser;
using RestaurantBill.Application.Features.Users.Commands.UpdateUser;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Users;

public class UserCommandHandlerTests
{
    private static Branch CreateBranchWithId(Guid id)
    {
        Branch branch = Branch.Create("Test Restoran");
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(branch, id);
        return branch;
    }

    public class CreateUserHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithValidCommand_AddsUserAndSaves()
        {
            Branch branch = CreateBranchWithId(CurrentUser.BranchId);
            DbContext.Branches.Add(branch);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new CreateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);
            var command = new CreateUserCommand
            {
                FullName = "Fatih Kayacı",
                UserName = "fatih",
                UserCode = "USR01",
                PasswordHash = "123456",
                Role = UserRole.Waiter
            };

            await handler.Handle(command, CancellationToken.None);

            User createdUser = Assert.Single(DbContext.Users.Where(u => u.FullName == "Fatih Kayacı"));
            Assert.Equal("hashed_123456", createdUser.PasswordHash);
            UserBranch userBranch = Assert.Single(DbContext.UserBranches.ToList());
            Assert.Equal("fatih", userBranch.UserName);
            Assert.Equal(UserRole.Waiter, userBranch.Role);
        }

        [Fact]
        public async Task Handle_WithDuplicateUserName_ReturnsFailureResult()
        {
            Branch branch = CreateBranchWithId(CurrentUser.BranchId);
            DbContext.Branches.Add(branch);

            User existing = User.Create("Ali Veli", "", "");
            DbContext.Users.Add(existing);
            DbContext.UserBranches.Add(UserBranch.Create(existing, branch, "fatih", "USR01", UserRole.Waiter));
            await DbContext.SaveChangesAsync();

            var handler = new CreateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);
            var command = new CreateUserCommand
            {
                FullName = "Başka Biri",
                UserName = "fatih",
                UserCode = "USR02",
                PasswordHash = "123456"
            };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class DeleteUserHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingUser_MarksAsDeletedAndSaves()
        {
            Branch branch = CreateBranchWithId(CurrentUser.BranchId);
            DbContext.Branches.Add(branch);
            User user = User.Create("Fatih", "", "");
            DbContext.Users.Add(user);
            DbContext.UserBranches.Add(UserBranch.Create(user, branch, "fatih", "USR01", UserRole.Waiter));
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new DeleteUserCommandHandler(Db, CurrentUser);
            await handler.Handle(new DeleteUserCommand { UserId = user.Id }, CancellationToken.None);

            Assert.True(user.IsDeleted);
        }

        [Fact]
        public async Task Handle_WithNonExistingUser_ReturnsFailureResult()
        {
            var handler = new DeleteUserCommandHandler(Db, CurrentUser);

            var result = await handler.Handle(new DeleteUserCommand { UserId = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }

        [Fact]
        public async Task Handle_WithUserFromAnotherBranch_ReturnsFailureAndKeepsUser()
        {
            Branch otherBranch = CreateBranchWithId(Guid.NewGuid());
            DbContext.Branches.Add(otherBranch);
            User user = User.Create("Başka Şube", "", "");
            DbContext.Users.Add(user);
            DbContext.UserBranches.Add(UserBranch.Create(user, otherBranch, "baska", "USR02", UserRole.Waiter));
            await DbContext.SaveChangesAsync();

            var handler = new DeleteUserCommandHandler(Db, CurrentUser);
            var result = await handler.Handle(new DeleteUserCommand { UserId = user.Id }, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.False(user.IsDeleted);
        }

        [Fact]
        public async Task Handle_WithOwnerAccount_ReturnsFailureAndKeepsOwner()
        {
            User ownerUser = User.Create("Başka Owner", "owner@test.com", "");
            DbContext.Users.Add(ownerUser);
            DbContext.Companies.Add(Company.Create("Başka Şirket", ownerUser));
            await DbContext.SaveChangesAsync();

            var handler = new DeleteUserCommandHandler(Db, CurrentUser);
            var result = await handler.Handle(new DeleteUserCommand { UserId = ownerUser.Id }, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.False(ownerUser.IsDeleted);
        }
    }

    public class UpdateUserHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingUser_UpdatesAndSaves()
        {
            var owner = new FakeCurrentUserService { Role = "Owner" };
            User ownerUser = await SeedActorAsync(userId: owner.UserId);
            Company company = Company.Create("Şirket", ownerUser);
            DbContext.Companies.Add(company);
            Branch branch = Branch.Create(company.Id, "Test Restoran", "", "", "", "", "", "", 0m);
            DbContext.Branches.Add(branch);
            User user = User.Create("Eski Ad", "", "");
            DbContext.Users.Add(user);
            UserBranch userBranch = UserBranch.Create(user, branch, "eski", "OLD01", UserRole.Waiter);
            DbContext.UserBranches.Add(userBranch);
            await DbContext.SaveChangesAsync();

            var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), owner);
            var command = new UpdateUserCommand
            {
                UserId = user.Id,
                FullName = "Yeni Ad",
                UserName = "yeni",
                UserCode = "NEW01",
                Role = UserRole.Admin
            };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal("Yeni Ad", user.FullName);
            Assert.Equal(UserRole.Admin, userBranch.Role);
            Assert.True(user.IsActive);
        }

        [Fact]
        public async Task Handle_WithPassword_HashesAndSetsPassword()
        {
            Branch branch = CreateBranchWithId(CurrentUser.BranchId);
            DbContext.Branches.Add(branch);
            User user = User.Create("Fatih", "", "");
            DbContext.Users.Add(user);
            DbContext.UserBranches.Add(UserBranch.Create(user, branch, "fatih", "USR01", UserRole.Waiter));
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);
            var command = new UpdateUserCommand
            {
                UserId = user.Id,
                FullName = "Fatih",
                UserName = "fatih",
                UserCode = "USR01",
                Password = "yenisifre"
            };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal("hashed_yenisifre", user.PasswordHash);
        }

        [Fact]
        public async Task Handle_WithNonExistingUser_ReturnsFailureResult()
        {
            var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);

            var result = await handler.Handle(new UpdateUserCommand { UserId = Guid.NewGuid(), FullName = "Ad", UserName = "un", UserCode = "UC" }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }

        [Fact]
        public async Task Handle_AdminChangingAnotherOwnersPassword_ReturnsFailureAndKeepsPassword()
        {
            User ownerUser = User.Create("Başka Owner", "owner@test.com", "");
            ownerUser.SetPasswordHash("original_hash");
            DbContext.Users.Add(ownerUser);
            DbContext.Companies.Add(Company.Create("Başka Şirket", ownerUser));
            await DbContext.SaveChangesAsync();

            var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);
            var result = await handler.Handle(new UpdateUserCommand
            {
                UserId = ownerUser.Id,
                FullName = "Ele Geçirildi",
                UserName = "x",
                UserCode = "X",
                Password = "yenisifre",
                Role = UserRole.Owner
            }, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("original_hash", ownerUser.PasswordHash);
        }

        [Fact]
        public async Task Handle_WithUserFromAnotherBranch_ReturnsFailure()
        {
            Branch otherBranch = CreateBranchWithId(Guid.NewGuid());
            DbContext.Branches.Add(otherBranch);
            User user = User.Create("Başka Şube", "", "");
            DbContext.Users.Add(user);
            DbContext.UserBranches.Add(UserBranch.Create(user, otherBranch, "baska", "USR02", UserRole.Waiter));
            await DbContext.SaveChangesAsync();

            var handler = new UpdateUserCommandHandler(Db, new FakePasswordHasher(), CurrentUser);
            var result = await handler.Handle(new UpdateUserCommand { UserId = user.Id, FullName = "Yeni", UserName = "yeni", UserCode = "Y1", Role = UserRole.Waiter }, CancellationToken.None);

            Assert.True(result.IsFailure);
            Assert.Equal("Başka Şube", user.FullName);
        }
    }
}
