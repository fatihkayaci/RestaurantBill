using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Features.Products.Commands.DeleteProduct;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
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
                CategoryId = Guid.NewGuid()
            };

            var result = await handler.Handle(command, CancellationToken.None);
            Assert.True(result.IsSuccess);
            Assert.Single(DbContext.Products.ToList());
        }
    }

    public class UpdateProductHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingProduct_UpdatesAndSaves()
        {
            Product existing = Product.Create("Eski", 10m, "img.png", Guid.NewGuid());
            DbContext.Products.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new UpdateProductCommandHandler(Db, CurrentUser);
            var command = new UpdateProductCommand { Id = existing.Id, Name = "Yeni", Price = 25m, IsActive = false, CategoryId = Guid.NewGuid() };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal("Yeni", existing.Name);
            Assert.Equal(25m, existing.Price);
        }

        [Fact]
        public async Task Handle_WithNonExistingProduct_ReturnsFailureResult()
        {
            var handler = new UpdateProductCommandHandler(Db, CurrentUser);

            var result = await handler.Handle(new UpdateProductCommand { Id = Guid.NewGuid(), Name = "Ad", Price = 10m, CategoryId = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class DeleteProductHandlerTests : ApplicationTestBase
    {
        [Fact]
        public async Task Handle_WithExistingProduct_DeletesAndSaves()
        {
            Product existing = Product.Create("Çay", 15m, "img.png", Guid.NewGuid());
            DbContext.Products.Add(existing);
            await DbContext.SaveChangesAsync();
            await SeedActorAsync();

            var handler = new DeleteProductCommandHandler(Db, CurrentUser);
            await handler.Handle(new DeleteProductCommand { Id = existing.Id }, CancellationToken.None);

            Assert.Empty(DbContext.Products.ToList());
        }

        [Fact]
        public async Task Handle_WithNonExistingProduct_ReturnsFailureResult()
        {
            var handler = new DeleteProductCommandHandler(Db, CurrentUser);

            var result = await handler.Handle(new DeleteProductCommand { Id = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
