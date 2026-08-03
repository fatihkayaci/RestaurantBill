using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.TransferBetweenCashRegisters;

public class TransferBetweenCashRegistersCommand : IRequest<Result>
{
    public Guid SourceCashRegisterId { get; set; }
    public Guid DestinationCashRegisterId { get; set; }
    public decimal Amount { get; set; }
}
