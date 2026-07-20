using MediatR;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.TransferBetweenCashRegisters;

public class TransferBetweenCashRegistersCommand : IRequest
{
    public int SourceCashRegisterId { get; set; }
    public int DestinationCashRegisterId { get; set; }
    public decimal Amount { get; set; }
}
