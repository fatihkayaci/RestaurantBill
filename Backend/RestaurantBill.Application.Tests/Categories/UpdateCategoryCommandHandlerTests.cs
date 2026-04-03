using Moq;
using AutoMapper;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Categories.Commands.UpdateCategory;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Categories;

public class UpdateCategoryCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly UpdateCategoryCommandHandler _handler;

    public UpdateCategoryCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _handler = new UpdateCategoryCommandHandler(_mockUow.Object, _mockMapper.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidCommand_ShouldMapAndSaveChanges()
    {
        // --- ARRANGE ---
        var command = new UpdateCategoryCommand { Id = 1, Name = "Yeni İsim" };
        var category = new Category { Id = 1, Name = "Eski İsim" };

        _mockUow.Setup(u => u.Category.GetByIdAsync(command.Id, true))
                .ReturnsAsync(category);

        // --- ACT ---
        await _handler.Handle(command, CancellationToken.None);

        // --- ASSERT ---
        _mockMapper.Verify(m => m.Map(command, category), Times.Once);
        _mockUow.Verify(u => u.Category.UpdateAsync(category), Times.Once);
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
        var command = new UpdateCategoryCommand { Id = invalidId, Name = "Test" };

        // --- ACT & ASSERT ---
        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(command, CancellationToken.None));

        Assert.Equal("Güncellenecek ID 0 veya negatif olamaz.", exception.Message);
    }

    [Fact]
    public async Task Handle_WhenCategoryNotFound_ShouldThrowNotFoundException()
    {
        // --- ARRANGE ---
        var command = new UpdateCategoryCommand { Id = 999, Name = "Test" };

        _mockUow.Setup(u => u.Category.GetByIdAsync(command.Id, true))
                .ReturnsAsync((Category?)null);

        // --- ACT & ASSERT ---
        await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(command, CancellationToken.None));
    }

    #endregion
}
