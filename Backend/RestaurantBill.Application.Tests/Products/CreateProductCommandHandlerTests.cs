using Moq;
using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Products;

public class CreateProductCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly CreateProductCommandHandler _handler;

    public CreateProductCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockCurrentUser = new Mock<ICurrentUserService>();
        _mockCurrentUser.Setup(s => s.RestaurantId).Returns(1);
        _handler = new CreateProductCommandHandler(_mockUow.Object, _mockCurrentUser.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidCommand_ShouldAddProductAndSaveChanges()
    {
        // --- ARRANGE ---
        var command = new CreateProductCommand
        {
            Name = "Lahmacun",
            Price = 120,
            IsActive = true,
            CategoryId = 1,
            ImageUrl = "lahmacun.jpg"
        };

        _mockUow.Setup(u => u.Product.AddAsync(It.IsAny<Product>())).Returns(Task.CompletedTask);

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        _mockUow.Verify(u => u.Product.AddAsync(It.Is<Product>(p =>
            p.Name == "Lahmacun" &&
            p.Price == 120 &&
            p.IsActive == true)), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion
}
