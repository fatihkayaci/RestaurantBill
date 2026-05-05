using MediatR;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.AddTransaction;

public class AddCashTransactionCommand : IRequest
{
    public int CashRegisterId { get; set; }
    public CashTransactionType Type { get; set; }
    public decimal Amount { get; set; }
}
