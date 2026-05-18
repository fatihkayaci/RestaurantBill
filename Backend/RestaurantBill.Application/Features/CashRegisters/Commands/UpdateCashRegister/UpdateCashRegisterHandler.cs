using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.UpdateCashRegister;

public class UpdateCashRegisterHandler : IRequestHandler<UpdateCashRegisterCommand>
{
    private readonly IUnitOfWork _uow;

    public UpdateCashRegisterHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task Handle(UpdateCashRegisterCommand request, CancellationToken cancellationToken)
    {
        var register = await _uow.CashRegister.GetByIdAsync(request.Id, true);
        Guard.AgainstNull(register, "Böyle bir kasa bulunamadı");

        register!.Update(request.Name, request.Balance, request.Status);

        await _uow.CashRegister.UpdateAsync(register);
        await _uow.SaveChangesAsync(cancellationToken);
    }
}
