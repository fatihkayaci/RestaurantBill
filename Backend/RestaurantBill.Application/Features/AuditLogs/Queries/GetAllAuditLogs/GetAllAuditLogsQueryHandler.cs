using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.AuditLogs.Queries.GetAllAuditLogs
{
    public class GetAllAuditLogsQueryHandler : IRequestHandler<GetAllAuditLogsQuery, Result<PagedResult<AuditLogDto>>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetAllAuditLogsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result<PagedResult<AuditLogDto>>> Handle(GetAllAuditLogsQuery request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = (await _uow.Branch.GetAllAsync(b => b.Company.OwnerUserId == _currentUser.UserId, false))
                .Select(b => b.Id)
                .ToList();

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

            string search = request.Search?.Trim().ToLower() ?? string.Empty;

            (IEnumerable<AuditLog> logs, int totalCount) = await _uow.AuditLog.GetPagedAsync(
                request.PageNumber,
                request.PageSize,
                l =>
                    branchIds.Contains(l.BranchId) &&
                    (!request.Category.HasValue || (int)l.Category == request.Category.Value) &&
                    (!request.Severity.HasValue || (int)l.Severity == request.Severity.Value) &&
                    (!request.BranchId.HasValue || l.BranchId == request.BranchId.Value) &&
                    (string.IsNullOrEmpty(request.ActorName) || l.ActorName == request.ActorName) &&
                    (!dateFromUtc.HasValue || l.CreatedAt >= dateFromUtc.Value) &&
                    (!dateToInclusive.HasValue || l.CreatedAt <= dateToInclusive.Value) &&
                    (search == "" ||
                        l.ActorName.ToLower().Contains(search) ||
                        l.Message.ToLower().Contains(search) ||
                        l.Action.ToLower().Contains(search)),
                q => q.OrderByDescending(l => l.CreatedAt),
                false,
                nameof(AuditLog.Branch));

            List<AuditLogDto> items = logs.Select(l => l.ToDto()).ToList();

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
