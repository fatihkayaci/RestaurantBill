using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.UpdateCashRegister;

public class UpdateCashRegisterCommandHandler : IRequestHandler<UpdateCashRegisterCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public UpdateCashRegisterCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(UpdateCashRegisterCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

        CashRegister? register = await _db.CashRegisters
            .InBranches(branchIds).FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);
        if (register is null) return Result.Failure("Böyle bir kasa bulunamadı");

        CashTransaction? adjustment = register.Update(request.Name, request.Balance, request.Status, _currentUser.UserId);
        if (adjustment is not null)
            _db.CashTransactions.Add(adjustment);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        string balanceFragment = adjustment is null ? string.Empty : $" Bakiye düzeltmesi: {(adjustment.Type == CashTransactionType.AdjustmentIn ? "+" : "-")}₺{adjustment.Amount}.";
        AuditLog log = AuditLog.Create(
            register.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            adjustment is null ? AuditLogSeverity.Info : AuditLogSeverity.Warning,
            "CashRegisterUpdated",
            $"{actor?.FullName} {register.Name} kasasını güncelledi.{balanceFragment}",
            nameof(CashRegister),
            register.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
