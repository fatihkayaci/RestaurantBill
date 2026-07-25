using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.DeleteCashRegister;

public class DeleteCashRegisterHandler : IRequestHandler<DeleteCashRegisterCommand, Result>
{
    private readonly IUnitOfWork _uow;

    public DeleteCashRegisterHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<Result> Handle(DeleteCashRegisterCommand request, CancellationToken cancellationToken)
    {
        var register = await _uow.CashRegister.GetByIdAsync(request.CashRegisterId, true);
        if(register is null) return Result.Failure("Kasa Bulunamadı");

        register!.EnsureCanBeDeleted();

        _uow.CashRegister.Delete(register);
        await _uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
