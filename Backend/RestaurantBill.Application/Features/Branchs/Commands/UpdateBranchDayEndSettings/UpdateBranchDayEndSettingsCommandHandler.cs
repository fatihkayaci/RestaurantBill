using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.UpdateBranchDayEndSettings;

public class UpdateBranchDayEndSettingsCommandHandler : IRequestHandler<UpdateBranchDayEndSettingsCommand, Result>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public UpdateBranchDayEndSettingsCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result> Handle(UpdateBranchDayEndSettingsCommand request, CancellationToken cancellationToken)
    {
        Branch? branch = await _db.Branches
            .Include(b => b.Company)
            .FirstOrDefaultAsync(b => b.Id == request.BranchId, cancellationToken);
        if (branch is null) return Result.Failure("Şube bulunamadı.");

        bool isOwner = branch.Company.OwnerUserId == _currentUser.UserId;
        bool isBranchStaff = _currentUser.BranchId == branch.Id;
        if (!isOwner && !isBranchStaff)
            return Result.Failure("Bu şube üzerinde yetkiniz yok.");

        branch.UpdateDayEndSettings(request.DayEndTime, request.TimeZoneId);

        User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        AuditLog log = AuditLog.Create(
            branch.Id,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Info,
            "BranchDayEndSettingsUpdated",
            $"{actor?.FullName} {branch.BranchName} şubesinin gün sonu saatini {request.DayEndTime:HH\\:mm} ({request.TimeZoneId}) olarak güncelledi.",
            nameof(Branch),
            branch.Id);
        _db.AuditLogs.Add(log);

        await _db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
