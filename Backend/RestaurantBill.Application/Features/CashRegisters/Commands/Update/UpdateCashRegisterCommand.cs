using MediatR;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.Update;

public class UpdateCashRegisterCommand : IRequest
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Balance { get; set; }
    public CashRegisterStatus Status { get; set; }
}
