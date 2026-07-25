using MediatR;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.AddTransactionToCashRegister;

public class AddTransactionToCashRegisterCommand : IRequest<Result>
{
    public int CashRegisterId { get; set; }
    public CashTransactionType Type { get; set; }
    public decimal Amount { get; set; }
}
