using AutoMapper;
using Moq;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Features.CashRegisters.Queries.GetById;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Tests.CashRegisters;

public class GetCashRegisterByIdHandlerTests
{
    private readonly Mock<IUnitOfWork> _mockUow;
    private readonly Mock<IMapper> _mockMapper;
    private readonly GetCashRegisterByIdHandler _handler;

    public GetCashRegisterByIdHandlerTests()
    {
        _mockUow = new Mock<IUnitOfWork>();
        _mockMapper = new Mock<IMapper>();
        _handler = new GetCashRegisterByIdHandler(_mockUow.Object, _mockMapper.Object);
    }

    [Fact]
    public async Task Handle_WhenRegisterExists_ShouldReturnMappedDto()
    {
        var register = new CashRegister { Id = 1, Name = "Cash" };
        var dto = new CashRegisterDto { Id = 1, Name = "Cash" };

        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(1, false)).ReturnsAsync(register);
        _mockMapper.Setup(m => m.Map<CashRegisterDto>(register)).Returns(dto);

        var result = await _handler.Handle(new GetCashRegisterByIdQuery { CashRegisterId = 1 }, CancellationToken.None);

        Assert.Equal(1, result.Id);
        Assert.Equal("Cash", result.Name);
    }

    [Fact]
    public async Task Handle_WhenRegisterNotFound_ShouldThrowNotFoundException()
    {
        _mockUow.Setup(u => u.CashRegister.GetByIdAsync(999, false)).ReturnsAsync((CashRegister?)null);

        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            _handler.Handle(new GetCashRegisterByIdQuery { CashRegisterId = 999 }, CancellationToken.None));

        Assert.Equal("Kasa bulunamadı.", ex.Message);
    }
}
