using RestaurantBill.Application.Features.Categories.Commands.CreateCategory;
using RestaurantBill.Application.Features.Categories.Commands.DeleteCategory;
using RestaurantBill.Application.Features.Categories.Commands.UpdateCategory;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Tests.Features.Categories;

public class CategoryCommandHandlerTests
{
    public class CreateCategoryHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithValidCommand_AddsCategoryAndSaves()
        {
            await SeedActorAsync();
            var handler = new CreateCategoryCommandHandler(Db, CurrentUser);
            var command = new CreateCategoryCommand { Name = "İçecekler" };

            var result = await handler.Handle(command, CancellationToken.None);
            Assert.True(result.IsSuccess);

            Category saved = Assert.Single(DbContext.Categories.ToList());
            Assert.Equal(CurrentUser.BranchId, saved.BranchId);
        }
    }

    public class UpdateCategoryHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingCategory_RenamesAndSaves()
        {
            Category existing = Category.Create("Eski Ad", CurrentUser.BranchId);
            DbContext.Categories.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new UpdateCategoryCommandHandler(Db, CurrentUser);
            var command = new UpdateCategoryCommand { Id = existing.Id, Name = "Yeni Ad" };

            var result = await handler.Handle(command, CancellationToken.None);
            Assert.True(result.IsSuccess);
            Assert.Equal("Yeni Ad", existing.Name);
        }

        [Fact]
        public async Task Handle_WithNonExistingCategory_ReturnsFailureResult()
        {
            var handler = new UpdateCategoryCommandHandler(Db, CurrentUser);
            var command = new UpdateCategoryCommand { Id = Guid.NewGuid(), Name = "Ad" };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class DeleteCategoryHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithNoLinkedProducts_DeletesAndSaves()
        {
            Category existing = Category.Create("İçecekler", CurrentUser.BranchId);
            DbContext.Categories.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new DeleteCategoryCommandHandler(Db, CurrentUser);
            var command = new DeleteCategoryCommand { Id = existing.Id };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Empty(DbContext.Categories.ToList());
        }

        [Fact]
        public async Task Handle_WithLinkedProducts_ThrowsDomainException()
        {
            Category existing = Category.Create("İçecekler", CurrentUser.BranchId);
            DbContext.Categories.Add(existing);
            DbContext.Products.Add(Product.Create("Çay", 10m, "img.png", existing.Id));
            await DbContext.SaveChangesAsync();

            var handler = new DeleteCategoryCommandHandler(Db, CurrentUser);
            var command = new DeleteCategoryCommand { Id = existing.Id };

            await Assert.ThrowsAsync<DomainException>(() => handler.Handle(command, CancellationToken.None));
        }

        [Fact]
        public async Task Handle_WithNonExistingCategory_ReturnsFailureResult()
        {
            var handler = new DeleteCategoryCommandHandler(Db, CurrentUser);
            var command = new DeleteCategoryCommand { Id = Guid.NewGuid() };

            var result = await handler.Handle(command, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
