using Moq;
using AutoMapper;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Products.Queries.GetAllProduct;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Products;

public class GetAllProductQueryHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly GetAllProductQueryHandler _handler;

    public GetAllProductQueryHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _handler = new GetAllProductQueryHandler(_mockUow.Object, _mockMapper.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenProductsExist_ShouldReturnMappedDtos()
    {
        // --- ARRANGE ---
        var products = new List<Product>
        {
            new() { Id = 1, Name = "Lahmacun", Price = 120 },
            new() { Id = 2, Name = "Ayran", Price = 30 }
        };
        var expectedDtos = new List<ProductDto>
        {
            new() { Id = 1, Name = "Lahmacun", Price = 120 },
            new() { Id = 2, Name = "Ayran", Price = 30 }
        };

        _mockUow.Setup(u => u.Product.GetAllAsync(null, false, "Category"))
                .ReturnsAsync(products);
        _mockMapper.Setup(m => m.Map<List<ProductDto>>(It.IsAny<object>()))
                   .Returns(expectedDtos);

        // --- ACT ---
        var result = await _handler.Handle(new GetAllProductQuery(), CancellationToken.None);

        // --- ASSERT ---
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Equal("Lahmacun", result[0].Name);
    }

    [Fact]
    public async Task Handle_WhenNoProductsExist_ShouldReturnEmptyList()
    {
        // --- ARRANGE ---
        _mockUow.Setup(u => u.Product.GetAllAsync(null, false, "Category"))
                .ReturnsAsync(new List<Product>());
        _mockMapper.Setup(m => m.Map<List<ProductDto>>(It.IsAny<IEnumerable<Product>>()))
                   .Returns(new List<ProductDto>());

        // --- ACT ---
        var result = await _handler.Handle(new GetAllProductQuery(), CancellationToken.None);

        // --- ASSERT ---
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #endregion
}
