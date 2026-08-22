using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.AuditLogs.Queries.GetAuditLogActors
{
    public class GetAuditLogActorsQueryHandler : IRequestHandler<GetAuditLogActorsQuery, Result<List<string>>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetAuditLogActorsQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<List<string>>> Handle(GetAuditLogActorsQuery request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.Branches
                .Where(b => b.Company.OwnerUserId == _currentUser.UserId)
                .Select(b => b.Id)
                .ToListAsync(cancellationToken);

            if (branchIds.Count == 0)
                return Result<List<string>>.Success(new List<string>());

            List<string> actors = await _db.AuditLogs
                .AsNoTracking()
                .Where(l => branchIds.Contains(l.BranchId))
                .Select(l => l.ActorName)
                .Distinct()
                .OrderBy(n => n)
                .ToListAsync(cancellationToken);

            return Result<List<string>>.Success(actors);
        }
    }
}
