using Moq;
using AutoMapper;
using RestaurantBill.Application.Features.Products.Commands.CreateProduct;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Products;

public class CreateProductCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly CreateProductCommandHandler _handler;

    public CreateProductCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _mockCurrentUser = new Mock<ICurrentUserService>();
        _mockCurrentUser.Setup(s => s.RestaurantId).Returns(1);
        _handler = new CreateProductCommandHandler(_mockUow.Object, _mockMapper.Object, _mockCurrentUser.Object);
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
        var product = new Product { Name = "Lahmacun", Price = 120, IsActive = true };

        _mockMapper.Setup(m => m.Map<Product>(command)).Returns(product);
        _mockUow.Setup(u => u.Product.AddAsync(product)).Returns(Task.CompletedTask);

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        _mockUow.Verify(u => u.Product.AddAsync(product), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion
}
