using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.AuditLogs.Queries.GetAllAuditLogs
{
    public class GetAllAuditLogsQuery : IRequest<Result<PagedResult<AuditLogDto>>>
    {
        public int PageNumber { get; set; } = 1;
        public int PageSize { get; set; } = 10;
        public string? Search { get; set; }
        public int? Category { get; set; }
        public int? Severity { get; set; }
        public Guid? BranchId { get; set; }
        public string? ActorName { get; set; }
        public DateTime? DateFrom { get; set; }
        public DateTime? DateTo { get; set; }
    }
}
