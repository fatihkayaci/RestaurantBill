using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Features.Products.Commands.DeleteProduct;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Tests.Features.Products;

public class ProductCommandHandlerTests
{
    public class CreateProductHandlerTests
    {
        [Fact]
        public async Task Handle_WithValidCommand_AddsProductAndSaves()
        {
            var uow = new FakeUnitOfWork();
            var currentUser = new FakeCurrentUserService();
            TestActor.Seed(uow, currentUser.UserId);
            var handler = new CreateProductCommandHandler(uow, currentUser);
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
            Assert.Single(uow.ProductRepo.Added);
            Assert.True(uow.SaveChangesCalled);
        }
    }

    public class UpdateProductHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingProduct_UpdatesAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Product existing = Product.Create("Eski", 10m, "img.png", Guid.NewGuid());
            await uow.ProductRepo.AddAsync(existing);

            var currentUser = new FakeCurrentUserService();
            TestActor.Seed(uow, currentUser.UserId);
            var handler = new UpdateProductCommandHandler(uow, currentUser);
            var command = new UpdateProductCommand { Id = existing.Id, Name = "Yeni", Price = 25m, IsActive = false, CategoryId = Guid.NewGuid() };

            await handler.Handle(command, CancellationToken.None);

            Assert.Equal("Yeni", existing.Name);
            Assert.Equal(25m, existing.Price);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingProduct_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new UpdateProductCommandHandler(uow, new FakeCurrentUserService());

            var result = await handler.Handle(new UpdateProductCommand { Id = Guid.NewGuid(), Name = "Ad", Price = 10m, CategoryId = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }

    public class DeleteProductHandlerTests
    {
        [Fact]
        public async Task Handle_WithExistingProduct_DeletesAndSaves()
        {
            var uow = new FakeUnitOfWork();
            Product existing = Product.Create("Çay", 15m, "img.png", Guid.NewGuid());
            await uow.ProductRepo.AddAsync(existing);

            var currentUser = new FakeCurrentUserService();
            TestActor.Seed(uow, currentUser.UserId);
            var handler = new DeleteProductCommandHandler(uow, currentUser);
            await handler.Handle(new DeleteProductCommand { Id = existing.Id }, CancellationToken.None);

            Assert.Empty(uow.ProductRepo.Added);
            Assert.True(uow.SaveChangesCalled);
        }

        [Fact]
        public async Task Handle_WithNonExistingProduct_ReturnsFailureResult()
        {
            var uow = new FakeUnitOfWork();
            var handler = new DeleteProductCommandHandler(uow, new FakeCurrentUserService());

            var result = await handler.Handle(new DeleteProductCommand { Id = Guid.NewGuid() }, CancellationToken.None);

            Assert.True(result.IsFailure);
        }
    }
}
