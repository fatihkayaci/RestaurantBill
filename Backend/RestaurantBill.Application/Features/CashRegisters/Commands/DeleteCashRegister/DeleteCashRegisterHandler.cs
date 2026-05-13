using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.DeleteCashRegister;

public class DeleteCashRegisterHandler : IRequestHandler<DeleteCashRegisterCommand>
{
    private readonly IUnitOfWork _uow;

    public DeleteCashRegisterHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task Handle(DeleteCashRegisterCommand request, CancellationToken cancellationToken)
    {
        var register = await _uow.CashRegister.GetByIdAsync(request.CashRegisterId, true);
        Guard.AgainstNull(register, "Kasa bulunamadı.");

        _uow.CashRegister.Delete(register!);
        await _uow.SaveChangesAsync(cancellationToken);
    }
}
