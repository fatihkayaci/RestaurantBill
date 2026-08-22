using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.AuditLogs.Queries.GetAllAuditLogs
{
    public class GetAllAuditLogsQueryHandler : IRequestHandler<GetAllAuditLogsQuery, Result<PagedResult<AuditLogDto>>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetAllAuditLogsQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<PagedResult<AuditLogDto>>> Handle(GetAllAuditLogsQuery request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.Branches
                .Where(b => b.Company.OwnerUserId == _currentUser.UserId)
                .Select(b => b.Id)
                .ToListAsync(cancellationToken);

            if (branchIds.Count == 0)
            {
                return Result<PagedResult<AuditLogDto>>.Success(new PagedResult<AuditLogDto>
                {
                    Items = new List<AuditLogDto>(),
                    TotalCount = 0,
                    PageNumber = request.PageNumber,
                    PageSize = request.PageSize
                });
            }

            DateTime? dateFromUtc = request.DateFrom.HasValue
                ? DateTime.SpecifyKind(request.DateFrom.Value.Date, DateTimeKind.Utc)
                : null;

            DateTime? dateToInclusive = request.DateTo.HasValue
                ? DateTime.SpecifyKind(request.DateTo.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc)
                : null;

            string search = request.Search?.Trim() ?? string.Empty;

            IQueryable<AuditLog> query = _db.AuditLogs
                .AsNoTracking()
                .Where(l => branchIds.Contains(l.BranchId))
                .Where(l => !request.Category.HasValue || (int)l.Category == request.Category.Value)
                .Where(l => !request.Severity.HasValue || (int)l.Severity == request.Severity.Value)
                .Where(l => !request.BranchId.HasValue || l.BranchId == request.BranchId.Value)
                .Where(l => string.IsNullOrEmpty(request.ActorName) || l.ActorName == request.ActorName)
                .Where(l => !dateFromUtc.HasValue || l.CreatedAt >= dateFromUtc.Value)
                .Where(l => !dateToInclusive.HasValue || l.CreatedAt <= dateToInclusive.Value)
                .Where(l => search == "" ||
                    EF.Functions.ILike(l.ActorName, $"%{search}%") ||
                    EF.Functions.ILike(l.Message, $"%{search}%") ||
                    EF.Functions.ILike(l.Action, $"%{search}%"));

            int totalCount = await query.CountAsync(cancellationToken);

            List<AuditLogDto> items = await query
                .OrderByDescending(l => l.CreatedAt)
                .ThenByDescending(l => l.Id)
                .Skip((request.PageNumber - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(l => new AuditLogDto
                {
                    Id = l.Id,
                    BranchId = l.BranchId,
                    BranchName = l.Branch.BranchName,
                    ActorName = l.ActorName,
                    Category = l.Category,
                    Severity = l.Severity,
                    Action = l.Action,
                    Message = l.Message,
                    EntityType = l.EntityType,
                    EntityId = l.EntityId,
                    CreatedAt = l.CreatedAt
                })
                .ToListAsync(cancellationToken);

            return Result<PagedResult<AuditLogDto>>.Success(new PagedResult<AuditLogDto>
            {
                Items = items,
                TotalCount = totalCount,
                PageNumber = request.PageNumber,
                PageSize = request.PageSize
            });
        }
    }
}
