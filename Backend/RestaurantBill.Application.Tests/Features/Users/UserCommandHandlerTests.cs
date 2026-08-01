using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Application.Features.Users.Commands.DeleteUser;
using RestaurantBill.Application.Features.Users.Commands.UpdateUser;
using RestaurantBill.Application.Tests.Fakes;
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

    public class CreateUserHandlerTests
    {
        [Fact]
        public async Task Handle_WithValidCommand_AddsUserAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Guid branchId = Guid.NewGuid();
            await uow.RestaurantRepo.AddAsync(CreateBranchWithId(branchId));

            var handler = new CreateUserCommandHandler(uow, new FakePasswordHasher(), new FakeCurrentUserService { BranchId = branchId });
            var command = new CreateUserCommand
            {
                FullName = "Fatih Kayacı",
                UserName = "fatih",
                UserCode = "USR01",
                PasswordHash = "123456",
                Role = UserRole.Waiter
            };

            await handler.Handle(command, CancellationToken.None);

            Assert.Single(uow.UserRepo.Added);
            Assert.Equal("hashed_123456", uow.UserRepo.Added[0].PasswordHash);
            Assert.Single(uow.UserRestaurantRepo.Added);
            Assert.Equal("fatih", uow.UserRestaurantRepo.Added[0].UserName);
            Assert.Equal(UserRole.Waiter, uow.UserRestaurantRepo.Added[0].Role);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithDuplicateUserName_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            Guid branchId = Guid.NewGuid();
            Branch branch = CreateBranchWithId(branchId);
            await uow.RestaurantRepo.AddAsync(branch);

            User existing = User.Create("Ali Veli", null, null);
            await uow.UserRepo.AddAsync(existing);
            await uow.UserRestaurantRepo.AddAsync(UserBranch.Create(existing, branch, "fatih", "USR01", UserRole.Waiter));

            var handler = new CreateUserCommandHandler(uow, new FakePasswordHasher(), new FakeCurrentUserService { BranchId = branchId });
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

    public class DeleteUserHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingUser_MarksAsDeletedAndSaves()
        {
            var uow = new FakeUnitOfWork();
            User user = User.Create("Fatih", null, null);
            await uow.UserRepo.AddAsync(user);

            var handler = new DeleteUserCommandHandler(uow);
            await handler.Handle(new DeleteUserCommand { UserId = user.Id }, CancellationToken.None);

            Assert.True(user.IsDeleted);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingUser_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new DeleteUserCommandHandler(uow);

            var result = await handler.Handle(new DeleteUserCommand { UserId = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class UpdateUserHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingUser_UpdatesAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Branch branch = CreateBranchWithId(Guid.NewGuid());
            User user = User.Create("Eski Ad", null, null);
            await uow.UserRepo.AddAsync(user);
            UserBranch userBranch = UserBranch.Create(user, branch, "eski", "OLD01", UserRole.Waiter);
            await uow.UserRestaurantRepo.AddAsync(userBranch);

            var handler = new UpdateUserCommandHandler(uow, new FakePasswordHasher(), new FakeCurrentUserService());
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
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithPassword_HashesAndSetsPassword()
        {
            var uow = new FakeUnitOfWork();
            Branch branch = CreateBranchWithId(Guid.NewGuid());
            User user = User.Create("Fatih", null, null);
            await uow.UserRepo.AddAsync(user);
            await uow.UserRestaurantRepo.AddAsync(UserBranch.Create(user, branch, "fatih", "USR01", UserRole.Waiter));

            var handler = new UpdateUserCommandHandler(uow, new FakePasswordHasher(), new FakeCurrentUserService());
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
            var uow = new FakeUnitOfWork();
            var handler = new UpdateUserCommandHandler(uow, new FakePasswordHasher(), new FakeCurrentUserService());

            var result = await handler.Handle(new UpdateUserCommand { UserId = Guid.NewGuid(), FullName = "Ad", UserName = "un", UserCode = "UC" }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
