using MediatR;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.Create;

public class CreateCashRegisterCommand : IRequest
{
    public string Name { get; set; } = string.Empty;
    public decimal OpeningBalance { get; set; }
    public CashRegisterStatus Status { get; set; } = CashRegisterStatus.Open;
}
