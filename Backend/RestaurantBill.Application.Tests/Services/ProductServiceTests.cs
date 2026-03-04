using Moq;
using RestaurantBill.Application.Services;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using AutoMapper;
using RestaurantBill.Application.DTOs;
using System.Linq.Expressions;

namespace RestaurantBill.Application.Tests.Services;

public class ProductServiceTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IProductRepository> _mockProductRepo;
    private readonly Mock<IMapper> _mockMapper;
    private readonly ProductService _productService;

    public ProductServiceTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockProductRepo = new Mock<IProductRepository>();
        _mockMapper = new Mock<IMapper>();
        _mockUow.Setup(uow => uow.Product).Returns(_mockProductRepo.Object);
        _productService = new ProductService(_mockMapper.Object, _mockUow.Object);
    }

    #region CreateAsync

    [Fact]
    public async Task CreateAsync_WhenValidDto_ShouldAddProductAndSaveChanges()
    {
        var dto = new CreateProductDto { Name = "Lahmacun", Price = 120, CategoryId = 1 };
        var entity = new Product { Name = "Lahmacun", Price = 120 };

        _mockMapper.Setup(m => m.Map<Product>(dto)).Returns(entity);

        await _productService.CreateAsync(dto, CancellationToken.None);

        _mockProductRepo.Verify(r => r.AddAsync(entity), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region UpdateAsync

    [Fact]
    public async Task UpdateAsync_WhenDtoIsNull_ShouldThrowBusinessException()
    {
        await Assert.ThrowsAsync<BusinessException>(() =>
            _productService.UpdateAsync(null!, CancellationToken.None));
    }

    [Fact]
    public async Task UpdateAsync_WhenIdIsZeroOrNegative_ShouldThrowBusinessException()
    {
        var dto = new UpdateProductDto { Id = 0, Name = "Test", Price = 100 };

        await Assert.ThrowsAsync<BusinessException>(() =>
            _productService.UpdateAsync(dto, CancellationToken.None));
    }

    [Fact]
    public async Task UpdateAsync_WhenProductNotFound_ShouldThrowNotFoundException()
    {
        var dto = new UpdateProductDto { Id = 99, Name = "Yok", Price = 100 };

        _mockProductRepo.Setup(r => r.GetByIdAsync(
                dto.Id,
                It.IsAny<bool>(),
                It.IsAny<Expression<Func<Product, object>>[]>()
            ))
            .ReturnsAsync((Product?)null);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _productService.UpdateAsync(dto, CancellationToken.None));
    }

    [Fact]
    public async Task UpdateAsync_WhenValidDto_ShouldMapAndSaveChanges()
    {
        var dto = new UpdateProductDto { Id = 1, Name = "Güncellendi", Price = 350 };
        var existingProduct = new Product { Id = 1, Name = "Eski İsim", Price = 200 };

        _mockProductRepo.Setup(r => r.GetByIdAsync(
                dto.Id,
                It.IsAny<bool>(),
                It.IsAny<Expression<Func<Product, object>>[]>()
            ))
            .ReturnsAsync(existingProduct);

        await _productService.UpdateAsync(dto, CancellationToken.None);

        _mockMapper.Verify(m => m.Map(dto, existingProduct), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region DeleteAsync

    [Fact]
    public async Task DeleteAsync_WhenIdIsZeroOrNegative_ShouldThrowBusinessException()
    {
        await Assert.ThrowsAsync<BusinessException>(() =>
            _productService.DeleteAsync(0, CancellationToken.None));

        await Assert.ThrowsAsync<BusinessException>(() =>
            _productService.DeleteAsync(-1, CancellationToken.None));
    }

    [Fact]
    public async Task DeleteAsync_WhenProductNotFound_ShouldThrowNotFoundException()
    {
        int fakeId = 999;

        _mockProductRepo.Setup(r => r.GetByIdAsync(
                fakeId,
                It.IsAny<bool>(),
                It.IsAny<Expression<Func<Product, object>>[]>()
            ))
            .ReturnsAsync((Product?)null);

        await Assert.ThrowsAsync<NotFoundException>(() =>
            _productService.DeleteAsync(fakeId, CancellationToken.None));
    }

    [Fact]
    public async Task DeleteAsync_WhenProductExists_ShouldDeleteAndSaveChanges()
    {
        int validId = 1;
        var existingProduct = new Product { Id = validId, Name = "Silinecek Ürün", Price = 100 };

        _mockProductRepo.Setup(r => r.GetByIdAsync(
                validId,
                It.IsAny<bool>(),
                It.IsAny<Expression<Func<Product, object>>[]>()
            ))
            .ReturnsAsync(existingProduct);

        await _productService.DeleteAsync(validId, CancellationToken.None);

        _mockProductRepo.Verify(r => r.Delete(existingProduct), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion
}
