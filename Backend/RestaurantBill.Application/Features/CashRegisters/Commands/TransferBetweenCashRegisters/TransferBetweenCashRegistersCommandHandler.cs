using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.TransferBetweenCashRegisters;

public class TransferBetweenCashRegistersCommandHandler : IRequestHandler<TransferBetweenCashRegistersCommand>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public TransferBetweenCashRegistersCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task Handle(TransferBetweenCashRegistersCommand request, CancellationToken cancellationToken)
    {
        CashRegister? source = await _uow.CashRegister.GetByIdAsync(request.SourceCashRegisterId, true);
        Guard.AgainstNull(source, "Kaynak kasa bulunamadı.");

        CashRegister? destination = await _uow.CashRegister.GetByIdAsync(request.DestinationCashRegisterId, true);
        Guard.AgainstNull(destination, "Hedef kasa bulunamadı.");

        if (source.RestaurantId != _currentUser.RestaurantId || destination.RestaurantId != _currentUser.RestaurantId)
            throw new NotFoundException("Kasa bulunamadı.");

        (CashTransaction sourceTransaction, CashTransaction destinationTransaction) =
            CashRegister.Transfer(source, destination, request.Amount, _currentUser.UserId);

        await _uow.CashTransaction.AddAsync(sourceTransaction);
        await _uow.CashTransaction.AddAsync(destinationTransaction);
        await _uow.CashRegister.UpdateAsync(source);
        await _uow.CashRegister.UpdateAsync(destination);
        await _uow.SaveChangesAsync(cancellationToken);
    }
}
