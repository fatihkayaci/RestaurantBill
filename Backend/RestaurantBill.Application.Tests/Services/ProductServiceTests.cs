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

    [Fact]
    public async Task GetByIdAsync_WhenProductDoesNotExist_ShouldThrowNotFoundException()
    {
        int fakeProductId = 999;
        
        _mockProductRepo.Setup(repo => repo.GetByIdAsync(
                fakeProductId, 
                It.IsAny<bool>(), 
                It.IsAny<Expression<Func<Product, object>>[]>()
            ))
            .ReturnsAsync((Product?)null);

        await Assert.ThrowsAsync<NotFoundException>(async () => 
            await _productService.GetByIdAsync(fakeProductId));
    }
    [Fact]
    public async Task GetByIdAsync_WhenProductExists_ShouldReturnProductDto()
    {
        int validProductId = 1;
        var existingProduct = new Product 
        { 
            Id = validProductId, 
            Name = "İskender", 
            Price = 300 
        };
        var expectedDto = new ProductDto 
        { 
            Id = validProductId, 
            Name = "İskender", 
            Price = 300 
        };
        _mockProductRepo.Setup(repo => repo.GetByIdAsync(validProductId, It.IsAny<bool>(), It.IsAny<Expression<Func<Product, object>>[]>()))
                        .ReturnsAsync(existingProduct);
        _mockMapper.Setup(m => m.Map<ProductDto>(existingProduct))
                .Returns(expectedDto);
        var result = await _productService.GetByIdAsync(validProductId);
        Assert.NotNull(result);

        Assert.Equal(expectedDto.Id, result.Id);
        Assert.Equal(expectedDto.Name, result.Name);
    }
}