using Moq;
using AutoMapper;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.Categories.Queries.GetAllCategories;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Categories;

public class GetAllCategoryQueryHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly GetAllOrdersQueryHandler _handler;

    public GetAllCategoryQueryHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _handler = new GetAllOrdersQueryHandler(_mockUow.Object, _mockMapper.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenCategoriesExist_ShouldReturnMappedDtos()
    {
        // --- ARRANGE ---
        var categories = new List<Category>
        {
            new() { Id = 1, Name = "İçecekler" },
            new() { Id = 2, Name = "Yiyecekler" }
        };
        var expectedDtos = new List<CategoryDto>
        {
            new() { Id = 1, Name = "İçecekler" },
            new() { Id = 2, Name = "Yiyecekler" }
        };

        _mockUow.Setup(u => u.Category.GetAllAsync(null, false, null))
                .ReturnsAsync(categories);
        _mockMapper.Setup(m => m.Map<List<CategoryDto>>(categories))
                   .Returns(expectedDtos);

        // --- ACT ---
        var result = await _handler.Handle(new GetAllCategoryQuery(), CancellationToken.None);

        // --- ASSERT ---
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.Equal("İçecekler", result[0].Name);
    }

    [Fact]
    public async Task Handle_WhenNoCategoriesExist_ShouldReturnEmptyList()
    {
        // --- ARRANGE ---
        _mockUow.Setup(u => u.Category.GetAllAsync(null, false, null))
                .ReturnsAsync(new List<Category>());
        _mockMapper.Setup(m => m.Map<List<CategoryDto>>(It.IsAny<IEnumerable<Category>>()))
                   .Returns(new List<CategoryDto>());

        // --- ACT ---
        var result = await _handler.Handle(new GetAllCategoryQuery(), CancellationToken.None);

        // --- ASSERT ---
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #endregion
}
