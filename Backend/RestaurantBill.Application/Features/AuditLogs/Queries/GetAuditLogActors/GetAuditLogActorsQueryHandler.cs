using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.AuditLogs.Queries.GetAuditLogActors
{
    public class GetAuditLogActorsQueryHandler : IRequestHandler<GetAuditLogActorsQuery, Result<List<string>>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public GetAuditLogActorsQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result<List<string>>> Handle(GetAuditLogActorsQuery request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = (await _uow.Branch.GetAllAsync(b => b.Company.OwnerUserId == _currentUser.UserId, false))
                .Select(b => b.Id)
                .ToList();

            if (branchIds.Count == 0)
                return Result<List<string>>.Success(new List<string>());

            List<string> actors = await _uow.AuditLog.GetDistinctActorNamesAsync(branchIds);
            return Result<List<string>>.Success(actors);
        }
    }
}
