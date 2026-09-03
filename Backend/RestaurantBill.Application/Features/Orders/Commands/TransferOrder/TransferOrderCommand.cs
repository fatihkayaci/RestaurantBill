using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.TransferOrder;

public class TransferOrderCommand : IRequest<Result<bool>>, IIdempotent
{
    public Guid SourceTableId { get; set; }
    public Guid DestinationTableId { get; set; }
    public TableTransferMode Mode { get; set; }

    public string IdempotencyKey => $"transfer-order:{SourceTableId}";
}
