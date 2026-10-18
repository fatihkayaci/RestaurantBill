using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Queries.GetTableById
{
    public class GetTableByIdQueryHandler : IRequestHandler<GetTableByIdQuery, Result<TableDto>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetTableByIdQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<TableDto>> Handle(GetTableByIdQuery request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

            TableDto? table = await _db.Tables
                .AsNoTracking()
                .InBranches(branchIds).Where(t => t.Id == request.TableId)
                .Select(t => new TableDto
                {
                    Id = t.Id,
                    Name = t.Name,
                    Note = t.Note,
                    Status = t.Status,
                    RegionId = t.RegionId,
                    RegionName = t.Region.Name
                })
                .FirstOrDefaultAsync(cancellationToken);
            if (table is null) return Result<TableDto>.Failure("Sipariş bulunamadı.");
            return Result<TableDto>.Success(table);
        }
    }
}
