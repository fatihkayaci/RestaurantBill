using AutoMapper;
using Moq;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.CashRegisters.Queries.GetAllCashRegister;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using System.Linq.Expressions;

namespace RestaurantBill.Application.Tests.CashRegisters;

public class GetAllCashRegisterHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly Mock<ICurrentUserService> _mockCurrentUser;
    private readonly GetAllCashRegisterHandler _handler;

    public GetAllCashRegisterHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _mockCurrentUser = new Mock<ICurrentUserService>();
        _mockCurrentUser.Setup(u => u.RestaurantId).Returns(1);
        _handler = new GetAllCashRegisterHandler(_mockUow.Object, _mockMapper.Object, _mockCurrentUser.Object);
    }

    [Fact]
    public async Task Handle_ShouldReturnMappedDtoList()
    {
        var registers = new List<CashRegister>
        {
            CashRegister.Create("Card", 0m, CashRegisterStatus.Open, 1),
            CashRegister.Create("Cash", 0m, CashRegisterStatus.Open, 1)
        };
        var dtos = new List<CashRegisterDto>
        {
            new() { Id = 1, Name = "Card" },
            new() { Id = 2, Name = "Cash" }
        };

        _mockUow.Setup(u => u.CashRegister.GetAllAsync(
                It.IsAny<Expression<Func<CashRegister, bool>>?>(),
                It.IsAny<bool>(),
                It.IsAny<string?>()))
            .ReturnsAsync(registers);
        _mockMapper.Setup(m => m.Map<List<CashRegisterDto>>(It.IsAny<IEnumerable<CashRegister>>()))
                   .Returns(dtos);

        var result = await _handler.Handle(new GetAllCashRegisterQuery(), CancellationToken.None);

        Assert.Equal(2, result.Count);
    }
}
