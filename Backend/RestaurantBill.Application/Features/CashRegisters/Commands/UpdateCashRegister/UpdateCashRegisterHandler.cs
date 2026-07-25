using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.UpdateCashRegister;

public class UpdateCashRegisterHandler : IRequestHandler<UpdateCashRegisterCommand, Result>
{
    private readonly IUnitOfWork _uow;

    public UpdateCashRegisterHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<Result> Handle(UpdateCashRegisterCommand request, CancellationToken cancellationToken)
    {
        var register = await _uow.CashRegister.GetByIdAsync(request.Id, true);
        if (register is null) return Result.Failure("Böyle bir kasa bulunamadı");

        register!.Update(request.Name, request.Balance, request.Status);

        await _uow.CashRegister.UpdateAsync(register);
        await _uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
