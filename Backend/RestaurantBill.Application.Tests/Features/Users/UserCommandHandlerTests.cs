using RestaurantBill.Application.Features.Users.Commands.CreateUser;
using RestaurantBill.Application.Features.Users.Commands.DeleteUser;
using RestaurantBill.Application.Features.Users.Commands.UpdateUser;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Users;

public class UserCommandHandlerTests
{
    public class CreateUserHandlerTests
    {
        [Fact]
        public async Task Handle_WithValidCommand_AddsUserAndSaves()
        {
            var uow = new FakeUnitOfWork();
            var handler = new CreateUserCommandHandler(uow, new FakePasswordHasher(), new FakeCurrentUserService { RestaurantId = 1 });
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
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithDuplicateUserName_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            User existing = User.Create("Ali Veli", "fatih", null, null, "USR01", UserRole.Waiter, restaurantId: 1);
            await uow.UserRepo.AddAsync(existing);

            var handler = new CreateUserCommandHandler(uow, new FakePasswordHasher(), new FakeCurrentUserService());
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
            User user = User.Create("Fatih", "fatih", null, null, "USR01", UserRole.Waiter, restaurantId: 1);
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

            var result = await handler.Handle(new DeleteUserCommand { UserId = 99 }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class UpdateUserHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingUser_UpdatesAndSaves()
        {
            var uow = new FakeUnitOfWork();
            User user = User.Create("Eski Ad", "eski", null, null, "OLD01", UserRole.Waiter, restaurantId: 1);
            await uow.UserRepo.AddAsync(user);

            var handler = new UpdateUserCommandHandler(uow, new FakePasswordHasher());
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
            Assert.Equal(UserRole.Admin, user.Role);
            Assert.True(user.IsActive);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithPassword_HashesAndSetsPassword()
        {
            var uow = new FakeUnitOfWork();
            User user = User.Create("Fatih", "fatih", null, null, "USR01", UserRole.Waiter, restaurantId: 1);
            await uow.UserRepo.AddAsync(user);

            var handler = new UpdateUserCommandHandler(uow, new FakePasswordHasher());
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
            var handler = new UpdateUserCommandHandler(uow, new FakePasswordHasher());

            var result = await handler.Handle(new UpdateUserCommand { UserId = 99, FullName = "Ad", UserName = "un", UserCode = "UC" }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
