using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.AuditLogs.Queries.GetAllAuditLogs
{
    public class GetAllAuditLogsQueryHandler : IRequestHandler<GetAllAuditLogsQuery, Result<List<AuditLogDto>>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetAllAuditLogsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result<List<AuditLogDto>>> Handle(GetAllAuditLogsQuery request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = (await _uow.Branch.GetAllAsync(b => b.Company.OwnerUserId == _currentUser.UserId, false))
                .Select(b => b.Id)
                .ToList();

            if (branchIds.Count == 0)
                return Result<List<AuditLogDto>>.Success(new List<AuditLogDto>());

            IEnumerable<AuditLog> logs = await _uow.AuditLog.GetAllAsync(l => branchIds.Contains(l.BranchId), false, nameof(AuditLog.Branch));

            List<AuditLogDto> result = logs
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => l.ToDto())
                .ToList();

            return Result<List<AuditLogDto>>.Success(result);
        }
    }
}
