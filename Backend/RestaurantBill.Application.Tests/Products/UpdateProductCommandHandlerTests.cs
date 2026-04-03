using Moq;
using AutoMapper;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Products.Commands.UpdateProduct;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Products;

public class UpdateProductCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly UpdateProductCommandHandler _handler;

    public UpdateProductCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _handler = new UpdateProductCommandHandler(_mockUow.Object, _mockMapper.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidCommand_ShouldMapAndSaveChanges()
    {
        // --- ARRANGE ---
        var command = new UpdateProductCommand { Id = 1, Name = "Güncellendi", Price = 150, IsActive = true, CategoryId = 2 };
        var product = new Product { Id = 1, Name = "Eski", Price = 100, IsActive = false };

        _mockUow.Setup(u => u.Product.GetByIdAsync(command.Id, true))
                .ReturnsAsync(product);

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        _mockMapper.Verify(m => m.Map(command, product), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region sad paths

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenIdIsZeroOrNegative_ShouldThrowBusinessException(int invalidId)
    {
        // --- ARRANGE ---
        var command = new UpdateProductCommand { Id = invalidId, Name = "Test", Price = 100 };

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("id 0 dan küçük veya eşit olamaz", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenProductNotFound_ShouldThrowNotFoundException()
    {
        // --- ARRANGE ---
        var command = new UpdateProductCommand { Id = 999, Name = "Test", Price = 100 };

        _mockUow.Setup(u => u.Product.GetByIdAsync(command.Id, true))
                .ReturnsAsync((Product?)null);

        // --- ACT & ASSERT ---
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    #endregion
}
