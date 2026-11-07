using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.ApproveShiftOpeningDifference;

public class ApproveShiftOpeningDifferenceCommandHandler : IRequestHandler<ApproveShiftOpeningDifferenceCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public ApproveShiftOpeningDifferenceCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(ApproveShiftOpeningDifferenceCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

        Shift? shift = await _db.Shifts
            .InBranches(branchIds).FirstOrDefaultAsync(s => s.Id == request.ShiftId, cancellationToken);
        if (shift is null)
            return Result.Failure("Vardiya bulunamadı.");

        shift.ApproveOpeningDifference(_currentUser.UserId);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            shift.BranchId,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Info,
            "ShiftOpeningDifferenceApproved",
            $"{actor?.FullName} ₺{shift.OpeningDifference} tutarındaki vardiya açılış farkını onayladı. Kasa bakiyesi zaten düzeltilmişti, ek işlem yapılmadı.",
            nameof(Shift),
            shift.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
