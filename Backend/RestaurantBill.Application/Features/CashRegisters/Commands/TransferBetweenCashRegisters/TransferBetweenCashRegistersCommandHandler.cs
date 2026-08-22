using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.TransferBetweenCashRegisters;

public class TransferBetweenCashRegistersCommandHandler : IRequestHandler<TransferBetweenCashRegistersCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public TransferBetweenCashRegistersCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(TransferBetweenCashRegistersCommand request, CancellationToken cancellationToken)
    {
        CashRegister? source = await _db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == request.SourceCashRegisterId, cancellationToken);
        if (source is null) return Result.Failure("Kaynak kasa bulunamadı");

        CashRegister? destination = await _db.CashRegisters
            .FirstOrDefaultAsync(c => c.Id == request.DestinationCashRegisterId, cancellationToken);
        if (destination is null) return Result.Failure("Hedef kasa bulunamadı.");

        if (source.BranchId != _currentUser.BranchId || destination.BranchId != _currentUser.BranchId)
            return Result.Failure("Kasa bulunamadı.");

        (CashTransaction sourceTransaction, CashTransaction destinationTransaction) =
            CashRegister.Transfer(source, destination, request.Amount, _currentUser.UserId);

        _db.CashTransactions.Add(sourceTransaction);
        _db.CashTransactions.Add(destinationTransaction);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            _currentUser.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.Payment,
            AuditLogSeverity.Info,
            "CashTransferred",
            $"{actor?.FullName} {source.Name} kasasından {destination.Name} kasasına ₺{request.Amount} aktardı.",
            nameof(CashRegister),
            source.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
