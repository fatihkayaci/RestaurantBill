using MediatR;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.DeleteCashRegister;

public class DeleteCashRegisterCommand : IRequest
{
    public int CashRegisterId { get; set; }
}
