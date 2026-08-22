using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Queries.GetBranchByUserId
{
    public class GetRestaurantByUserIdQueryHandler : IRequestHandler<GetBranchByUserIdQuery, Result<RestaurantDto>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetRestaurantByUserIdQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<RestaurantDto>> Handle(GetBranchByUserIdQuery request, CancellationToken cancellationToken)
        {
            Guid branchId = _currentUser.BranchId;
            Branch? branch = await _db.Branches
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == branchId, cancellationToken);
            if (branch is null)
                return Result<RestaurantDto>.Failure("Restoran bulunamadı.");

            return Result<RestaurantDto>.Success(branch.ToDto());
        }
    }
}
