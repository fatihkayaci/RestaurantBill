using MediatR;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.CreateCashRegister;

public class CreateCashRegisterCommand : IRequest<Result>
{
    public string Name { get; set; } = string.Empty;
    public decimal OpeningBalance { get; set; }
    public CashRegisterStatus Status { get; set; } = CashRegisterStatus.Open;
}
