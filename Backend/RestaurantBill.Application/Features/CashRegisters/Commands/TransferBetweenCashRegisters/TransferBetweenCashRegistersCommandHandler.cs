using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.TransferBetweenCashRegisters;

public class TransferBetweenCashRegistersCommandHandler : IRequestHandler<TransferBetweenCashRegistersCommand, Result>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public TransferBetweenCashRegistersCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(TransferBetweenCashRegistersCommand request, CancellationToken cancellationToken)
    {
        CashRegister? source = await _uow.CashRegister.GetByIdAsync(request.SourceCashRegisterId, true);
        if(source is null) return Result.Failure("Kaynak kasa bulunamadı");
        
        CashRegister? destination = await _uow.CashRegister.GetByIdAsync(request.DestinationCashRegisterId, true);
        if (destination is null) return Result.Failure("Hedef kasa bulunamadı.");

        if (source.BranchId != _currentUser.BranchId || destination.BranchId != _currentUser.BranchId)
            return Result.Failure("Kasa bulunamadı.");

        (CashTransaction sourceTransaction, CashTransaction destinationTransaction) =
            CashRegister.Transfer(source, destination, request.Amount, _currentUser.UserId);

        await _uow.CashTransaction.AddAsync(sourceTransaction);
        await _uow.CashTransaction.AddAsync(destinationTransaction);
        await _uow.CashRegister.UpdateAsync(source);
        await _uow.CashRegister.UpdateAsync(destination);
        await _uow.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
