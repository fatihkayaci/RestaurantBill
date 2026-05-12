using Moq;
using AutoMapper;
using RestaurantBill.Application.Features.Categories.Commands.CreateCategory;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.Categories;

public class CreateCategoryCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly CreateCategoryCommandHandler _handler;

    public CreateCategoryCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _mockCurrentUser = new Mock<ICurrentUserService>();
        _mockCurrentUser.Setup(u => u.RestaurantId).Returns(1);
        _handler = new CreateCategoryCommandHandler(_mockUow.Object, _mockMapper.Object, _mockCurrentUser.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenValidCommand_ShouldAddCategoryAndSaveChanges()
    {
        var command = new CreateCategoryCommand { Name = "İçecekler" };
        var category = new Category { Name = "İçecekler" };

        _mockMapper.Setup(m => m.Map<Category>(command)).Returns(category);
        _mockUow.Setup(u => u.Category.AddAsync(category)).Returns(Task.CompletedTask);

        await _handler.Handle(command, CancellationToken.None);

        _mockUow.Verify(u => u.Category.AddAsync(category), Times.Once);
        _mockUow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion
}
