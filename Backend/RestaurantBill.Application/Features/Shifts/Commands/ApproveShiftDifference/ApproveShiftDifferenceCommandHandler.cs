using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.ApproveShiftDifference;

public class ApproveShiftDifferenceCommandHandler : IRequestHandler<ApproveShiftDifferenceCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public ApproveShiftDifferenceCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(ApproveShiftDifferenceCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

        Shift? shift = await _db.Shifts
            .InBranches(branchIds).FirstOrDefaultAsync(s => s.Id == request.ShiftId, cancellationToken);
        if (shift is null)
            return Result.Failure("Vardiya bulunamadı.");

        shift.ApproveDifference(_currentUser.UserId);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            shift.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Info,
            "ShiftDifferenceApproved",
            $"{actor?.FullName} ₺{shift.Difference} tutarındaki vardiya kapanış farkını onayladı. Kasa bakiyesi zaten düzeltilmişti, ek işlem yapılmadı.",
            nameof(Shift),
            shift.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
