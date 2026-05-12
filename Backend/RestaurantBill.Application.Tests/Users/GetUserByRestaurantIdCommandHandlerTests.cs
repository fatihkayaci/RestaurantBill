using Moq;
using AutoMapper;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.Users.Queries.GetUserByRestaurantId;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using System.Linq.Expressions;

namespace RestaurantBill.Application.Tests.Users;

public class GetUserByRestaurantIdCommandHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly GetUserByRestaurantIdCommandHandler _handler;

    public GetUserByRestaurantIdCommandHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _mockCurrentUser = new Mock<ICurrentUserService>();
        _handler = new GetUserByRestaurantIdCommandHandler(_mockUow.Object, _mockMapper.Object, _mockCurrentUser.Object);
    }

    #region happy paths

    [Fact]
    public async Task Handle_WhenUsersExist_ShouldReturnMappedDtos()
    {
        _mockCurrentUser.Setup(u => u.RestaurantId).Returns(5);

        var users = new List<User>
        {
            new() { Id = "guid-001", FullName = "Garson Ali", UserName = "ali", UserCode = "WTR001", RestaurantId = 5 },
            new() { Id = "guid-002", FullName = "Garson Veli", UserName = "veli", UserCode = "WTR002", RestaurantId = 5 }
        };
        var expectedDtos = new List<UserDto>
        {
            new() { Id = "guid-001", FullName = "Garson Ali", UserName = "ali", UserCode = "WTR001", PhoneNumber = "" },
            new() { Id = "guid-002", FullName = "Garson Veli", UserName = "veli", UserCode = "WTR002", PhoneNumber = "" }
        };

        _mockUow.Setup(u => u.User.GetAllAsync(It.IsAny<Expression<Func<User, bool>>>(), false, null))
                .ReturnsAsync(users);
        _mockMapper.Setup(m => m.Map<IEnumerable<UserDto>>(users))
                   .Returns(expectedDtos);

        var result = await _handler.Handle(new GetUserByRestaurantIdCommand(), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal(2, result.Count());
    }

    [Fact]
    public async Task Handle_WhenNoUsersExist_ShouldReturnEmptyList()
    {
        _mockCurrentUser.Setup(u => u.RestaurantId).Returns(5);

        _mockUow.Setup(u => u.User.GetAllAsync(It.IsAny<Expression<Func<User, bool>>>(), false, null))
                .ReturnsAsync(new List<User>());
        _mockMapper.Setup(m => m.Map<IEnumerable<UserDto>>(It.IsAny<IEnumerable<User>>()))
                   .Returns(new List<UserDto>());

        var result = await _handler.Handle(new GetUserByRestaurantIdCommand(), CancellationToken.None);

        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #endregion

    #region sad paths

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task Handle_WhenRestaurantIdIsZeroOrNegative_ShouldThrowBusinessException(int invalidRestaurantId)
    {
        _mockCurrentUser.Setup(u => u.RestaurantId).Returns(invalidRestaurantId);

        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            _handler.Handle(new GetUserByRestaurantIdCommand(), CancellationToken.None));

        Assert.Equal("ID değeri 0 veya negatif olamaz.", exception.Message);
    }

    #endregion
}
