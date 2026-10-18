using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.UpdateTable
{
    public class UpdateCommandHandler : IRequestHandler<UpdateTableCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public UpdateCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(UpdateTableCommand request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

            Table? table = await _db.Tables
                .InBranches(branchIds).FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);
            if (table is null) return Result.Failure("Böyle bir masa bulunamadı");

            Guid tableBranchId = await _db.Regions
                .Where(r => r.Id == table.RegionId)
                .Select(r => r.BranchId)
                .FirstAsync(cancellationToken);
            bool regionInSameBranch = await _db.Regions
                .AnyAsync(r => r.Id == request.RegionId && r.BranchId == tableBranchId, cancellationToken);
            if (!regionInSameBranch)
                return Result.Failure("Böyle bir bölge bulunamadı.");

            table.Update(request.Name, table.Note);
            table.AssignRegion(request.RegionId);
            if (request.Status.HasValue)
                table.SetStatus(request.Status.Value);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                _currentUser.BranchId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Info,
                "TableUpdated",
                $"{actor?.FullName} {table.Name} masasını güncelledi.",
                nameof(Table),
                table.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
