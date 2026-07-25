using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.TransferBetweenCashRegisters;

public class TransferBetweenCashRegistersCommand : IRequest<Result>
{
    public int SourceCashRegisterId { get; set; }
    public int DestinationCashRegisterId { get; set; }
    public decimal Amount { get; set; }
}
