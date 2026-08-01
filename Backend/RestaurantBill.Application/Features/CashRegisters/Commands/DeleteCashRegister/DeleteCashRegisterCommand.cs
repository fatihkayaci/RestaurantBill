using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.DeleteCashRegister;

public class DeleteCashRegisterCommand : IRequest<Result>
{
    public Guid CashRegisterId { get; set; }
}
