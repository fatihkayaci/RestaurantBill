using MediatR;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.Delete;

public class DeleteCashRegisterCommand : IRequest
{
    public int CashRegisterId { get; set; }
}
