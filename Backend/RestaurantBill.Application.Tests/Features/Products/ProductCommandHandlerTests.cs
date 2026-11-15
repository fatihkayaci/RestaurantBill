using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Features.Products.Commands.DeleteProduct;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Application.Features.Products.Commands.UploadProductImage;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Tests.Features.Products;

public class ProductCommandHandlerTests
{
    public class CreateProductHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithValidCommand_AddsProductAndSaves()
        {
            await SeedActorAsync();
            var handler = new CreateProductCommandHandler(Db, CurrentUser);
            var command = new CreateProductCommand
            {
                Name = "Çay",
                Price = 15m,
                IsActive = true,
                ImageUrl = "img.png",
                CategoryId = await DefaultCategoryIdAsync()
            };

            var result = await handler.Handle(command, CancellationToken.None);
            Assert.True(result.IsSuccess);
            Assert.Single(DbContext.Products.ToList());
        }

        [Fact]
        public async Task Handle_WithCost_SavesCost()
        {
            await SeedActorAsync();
            var handler = new CreateProductCommandHandler(Db, CurrentUser);
            var command = new CreateProductCommand
            {
                Name = "Çay",
                Price = 15m,
                Cost = 4.5m,
                IsActive = true,
                CategoryId = await DefaultCategoryIdAsync()
            };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal(4.5m, DbContext.Products.Single().Cost);
        }

        [Fact]
        public async Task Handle_WithoutCost_SavesZeroCost()
        {
            await SeedActorAsync();
            var handler = new CreateProductCommandHandler(Db, CurrentUser);
            var command = new CreateProductCommand { Name = "Çay", Price = 15m, IsActive = true, CategoryId = await DefaultCategoryIdAsync() };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal(0m, DbContext.Products.Single().Cost);
        }
    }

    public class CreateProductValidatorTests
    {
        private static CreateProductCommand ValidCommand(decimal cost) => new()
        {
            Name = "Çay",
            Price = 15m,
            Cost = cost,
            CategoryId = Guid.NewGuid()
        };

        [Theory]
        [InlineData(0.0)]
        [InlineData(4.5)]
        public void Validate_WithZeroOrPositiveCost_IsValid(double cost)
        {
            var result = new CreateProductCommandValidator().Validate(ValidCommand((decimal)cost));

            Assert.True(result.IsValid);
        }

        [Fact]
        public void Validate_WithNegativeCost_ReturnsTurkishError()
        {
            var result = new CreateProductCommandValidator().Validate(ValidCommand(-1m));

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.ErrorMessage == "Maliyet 0'dan küçük olamaz.");
        }
    }

    public class UpdateProductHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingProduct_UpdatesAndSaves()
        {
            Product existing = Product.Create("Eski", 10m, "img.png", await DefaultCategoryIdAsync());
            DbContext.Products.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new UpdateProductCommandHandler(Db, CurrentUser);
            var command = new UpdateProductCommand { Id = existing.Id, Name = "Yeni", Price = 25m, IsActive = false, CategoryId = await DefaultCategoryIdAsync() };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal("Yeni", existing.Name);
            Assert.Equal(25m, existing.Price);
        }

        [Fact]
        public async Task Handle_WithCost_UpdatesCost()
        {
            Product existing = Product.Create("Çay", 15m, "img.png", await DefaultCategoryIdAsync());
            DbContext.Products.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new UpdateProductCommandHandler(Db, CurrentUser);
            var command = new UpdateProductCommand { Id = existing.Id, Name = "Çay", Price = 15m, Cost = 6m, IsActive = true, CategoryId = existing.CategoryId };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal(6m, existing.Cost);
        }

        [Fact]
        public async Task Handle_WithoutCost_KeepsExistingCost()
        {
            Product existing = Product.Create("Çay", 15m, "img.png", await DefaultCategoryIdAsync());
            existing.SetCost(6m);
            DbContext.Products.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new UpdateProductCommandHandler(Db, CurrentUser);
            var command = new UpdateProductCommand { Id = existing.Id, Name = "Çay", Price = 20m, IsActive = true, CategoryId = existing.CategoryId };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal(6m, existing.Cost);
        }

        [Fact]
        public async Task Handle_WithNonExistingProduct_ReturnsFailureResult()
        {
            var handler = new UpdateProductCommandHandler(Db, CurrentUser);

            var result = await handler.Handle(new UpdateProductCommand { Id = Guid.NewGuid(), Name = "Ad", Price = 10m, CategoryId = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class UpdateProductValidatorTests
    {
        private static UpdateProductCommand ValidCommand(decimal? cost) => new()
        {
            Id = Guid.NewGuid(),
            Name = "Çay",
            Price = 15m,
            Cost = cost,
            CategoryId = Guid.NewGuid()
        };

        [Theory]
        [InlineData(null)]
        [InlineData(0.0)]
        [InlineData(4.5)]
        public void Validate_WithMissingZeroOrPositiveCost_IsValid(double? cost)
        {
            var result = new UpdateProductCommandValidator().Validate(ValidCommand((decimal?)cost));

            Assert.True(result.IsValid);
        }

        [Fact]
        public void Validate_WithNegativeCost_ReturnsTurkishError()
        {
            var result = new UpdateProductCommandValidator().Validate(ValidCommand(-1m));

            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.ErrorMessage == "Maliyet 0'dan küçük olamaz.");
        }
    }

    public class DeleteProductHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingProduct_DeletesAndSaves()
        {
            Product existing = Product.Create("Çay", 15m, "img.png", await DefaultCategoryIdAsync());
            DbContext.Products.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new DeleteProductCommandHandler(Db, CurrentUser, new FakeImageStorageService());
            await handler.Handle(new DeleteProductCommand { Id = existing.Id }, CancellationToken.None);

            Assert.Empty(DbContext.Products.ToList());
        }

        [Fact]
        public async Task Handle_WithExistingProductImage_DeletesImageFromStorage()
        {
            Product existing = Product.Create("Çay", 15m, "products/img.webp", await DefaultCategoryIdAsync());
            DbContext.Products.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var imageStorage = new FakeImageStorageService();
            var handler = new DeleteProductCommandHandler(Db, CurrentUser, imageStorage);
            await handler.Handle(new DeleteProductCommand { Id = existing.Id }, CancellationToken.None);

            Assert.Contains("products/img.webp", imageStorage.DeletedKeys);
        }

        [Fact]
        public async Task Handle_WithNonExistingProduct_ReturnsFailureResult()
        {
            var handler = new DeleteProductCommandHandler(Db, CurrentUser, new FakeImageStorageService());

            var result = await handler.Handle(new DeleteProductCommand { Id = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class UploadProductImageHandlerTests : ApplicationTestBase
    {
        private static IOptions<BunnyStorageOptions> Options() =>
            Microsoft.Extensions.Options.Options.Create(new BunnyStorageOptions { CdnBaseUrl = "https://cdn.test" });

        [Fact]
        public async Task Handle_WithExistingProduct_UploadsAndUpdatesImageUrl()
        {
            Category category = Category.Create("İçecekler", CurrentUser.BranchId);
            DbContext.Categories.Add(category);
            Product existing = Product.Create("Çay", 15m, "", category.Id);
            DbContext.Products.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var imageStorage = new FakeImageStorageService { NextKey = "products/new-key.webp" };
            var handler = new UploadProductImageCommandHandler(Db, CurrentUser, imageStorage, Options());

            var result = await handler.Handle(new UploadProductImageCommand
            {
                ProductId = existing.Id,
                Content = new MemoryStream([1, 2, 3]),
                ContentType = "image/png",
                Length = 3
            }, CancellationToken.None);

            Assert.True(result.IsSuccess);
            Assert.Equal("https://cdn.test/products/new-key.webp", result.Value);
            Assert.Equal("products/new-key.webp", existing.ImageUrl);
            Assert.Equal(CurrentUser.BranchId, imageStorage.LastBranchId);
        }

        [Fact]
        public async Task Handle_WithExistingImage_DeletesOldImageAfterUpload()
        {
            Category category = Category.Create("İçecekler", CurrentUser.BranchId);
            DbContext.Categories.Add(category);
            Product existing = Product.Create("Çay", 15m, "products/old-key.webp", category.Id);
            DbContext.Products.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var imageStorage = new FakeImageStorageService { NextKey = "products/new-key.webp" };
            var handler = new UploadProductImageCommandHandler(Db, CurrentUser, imageStorage, Options());

            await handler.Handle(new UploadProductImageCommand
            {
                ProductId = existing.Id,
                Content = new MemoryStream([1, 2, 3]),
                ContentType = "image/png",
                Length = 3
            }, CancellationToken.None);

            Assert.Contains("products/old-key.webp", imageStorage.DeletedKeys);
        }

        [Fact]
        public async Task Handle_WithProductFromOtherBranch_ReturnsFailureResult()
        {
            Category category = Category.Create("İçecekler", Guid.NewGuid());
            DbContext.Categories.Add(category);
            Product existing = Product.Create("Çay", 15m, "", category.Id);
            DbContext.Products.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new UploadProductImageCommandHandler(Db, CurrentUser, new FakeImageStorageService(), Options());

            var result = await handler.Handle(new UploadProductImageCommand
            {
                ProductId = existing.Id,
                Content = new MemoryStream([1, 2, 3]),
                ContentType = "image/png",
                Length = 3
            }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }

        [Fact]
        public async Task Handle_WithNonExistingProduct_ReturnsFailureResult()
        {
            var handler = new UploadProductImageCommandHandler(Db, CurrentUser, new FakeImageStorageService(), Options());

            var result = await handler.Handle(new UploadProductImageCommand
            {
                ProductId = Guid.NewGuid(),
                Content = new MemoryStream([1, 2, 3]),
                ContentType = "image/png",
                Length = 3
            }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }

        [Fact]
        public async Task Handle_WhenStorageThrows_ReturnsFailureResult()
        {
            Category category = Category.Create("İçecekler", CurrentUser.BranchId);
            DbContext.Categories.Add(category);
            Product existing = Product.Create("Çay", 15m, "", category.Id);
            DbContext.Products.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var imageStorage = new FakeImageStorageService { ThrowOnUpload = true };
            var handler = new UploadProductImageCommandHandler(Db, CurrentUser, imageStorage, Options());

            var result = await handler.Handle(new UploadProductImageCommand
            {
                ProductId = existing.Id,
                Content = new MemoryStream([1, 2, 3]),
                ContentType = "image/png",
                Length = 3
            }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
