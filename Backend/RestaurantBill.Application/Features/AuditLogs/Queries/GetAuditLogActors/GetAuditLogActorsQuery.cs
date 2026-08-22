using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.AuditLogs.Queries.GetAuditLogActors
{
    public class GetAuditLogActorsQuery : IRequest<Result<List<string>>>
    {
    }
}
