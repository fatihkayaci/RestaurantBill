using RestaurantBill.Application.Features.Categories.Commands.CreateCategory;
using RestaurantBill.Application.Features.Categories.Commands.DeleteCategory;
using RestaurantBill.Application.Features.Categories.Commands.UpdateCategory;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Tests.Features.Categories;

public class CategoryCommandHandlerTests
{
    public class CreateCategoryHandlerTests
    {
        [Fact]
        public async Task Handle_WithValidCommand_AddsCategoryAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Guid branchId = Guid.NewGuid();
            var handler = new CreateCategoryCommandHandler(uow, new FakeCurrentUserService { BranchId = branchId });
            var command = new CreateCategoryCommand { Name = "İçecekler" };

            var result = await handler.Handle(command, CancellationToken.None);
            Assert.True(result.IsSuccess);

            Assert.Single(uow.CategoryRepo.Added);
            Assert.Equal(branchId, uow.CategoryRepo.Added[0].BranchId);
            Assert.True(uow.SaveChangesCalled);
        }
    }

    public class UpdateCategoryHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingCategory_RenamesAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Category existing = Category.Create("Eski Ad", Guid.NewGuid());
            await uow.CategoryRepo.AddAsync(existing);

            var handler = new UpdateCategoryCommandHandler(uow);
            var command = new UpdateCategoryCommand { Id = existing.Id, Name = "Yeni Ad" };

            var result = await handler.Handle(command, CancellationToken.None);
            Assert.True(result.IsSuccess);
            Assert.Equal("Yeni Ad", existing.Name);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingCategory_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new UpdateCategoryCommandHandler(uow);
            var command = new UpdateCategoryCommand { Id = Guid.NewGuid(), Name = "Ad" };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class DeleteCategoryHandlerTests
    {
        [Fact]
        public async Task Handle_WithNoLinkedProducts_DeletesAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Category existing = Category.Create("İçecekler", Guid.NewGuid());
            await uow.CategoryRepo.AddAsync(existing);

            var handler = new DeleteCategoryCommandHandler(uow);
            var command = new DeleteCategoryCommand { Id = existing.Id };

            await handler.Handle(command, CancellationToken.None);

            Assert.Empty(uow.CategoryRepo.Added);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithLinkedProducts_ThrowsDomainException()
        {
            var uow = new FakeUnitOfWork();
            Category existing = Category.Create("İçecekler", Guid.NewGuid());
            await uow.CategoryRepo.AddAsync(existing);
            await uow.ProductRepo.AddAsync(Product.Create("Çay", 10m, "img.png", Guid.NewGuid()));

            var handler = new DeleteCategoryCommandHandler(uow);
            var command = new DeleteCategoryCommand { Id = existing.Id };

            await Assert.ThrowsAsync<DomainException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_WithNonExistingCategory_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new DeleteCategoryCommandHandler(uow);
            var command = new DeleteCategoryCommand { Id = Guid.NewGuid() };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
