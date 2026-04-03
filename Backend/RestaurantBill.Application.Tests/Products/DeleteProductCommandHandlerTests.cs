using Moq;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Products.Commands.DeleteProduct;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using System.Linq.Expressions;

namespace RestaurantBill.Application.Tests.Products;

public class DeleteProductCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly DeleteCommandHandler _handler;

    public DeleteProductCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _handler = new DeleteCommandHandler(_mockUow.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidId_ShouldDeleteProductAndSaveChanges()
    {
        // --- ARRANGE ---
        var command = new DeleteProductCommand { Id = 1 };
        var product = new Product { Id = 1, Name = "Lahmacun", Price = 120 };

        _mockUow.Setup(u => u.Product.GetByIdAsync(command.Id, false))
                .ReturnsAsync(product);

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        _mockUow.Verify(u => u.Product.Delete(product), Times.Once);
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
        var command = new DeleteProductCommand { Id = invalidId };

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Ürün'ün ID değeri 0 veya negatif olamaz.", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenProductNotFound_ShouldThrowNotFoundException()
    {
        // --- ARRANGE ---
        var command = new DeleteProductCommand { Id = 999 };

        _mockUow.Setup(u => u.Product.GetByIdAsync(command.Id, false))
                .ReturnsAsync((Product?)null);

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Böyle bir ürün bulunamadı.", exception.Message);
    }

    #endregion
}
