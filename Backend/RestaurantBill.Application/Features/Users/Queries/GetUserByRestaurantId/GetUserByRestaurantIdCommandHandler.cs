using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Queries.GetUserByRestaurantId
{
    public class GetUserByRestaurantIdCommandHandler : IRequestHandler<GetUserByRestaurantIdCommand, Result<IEnumerable<UserDto>>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public GetUserByRestaurantIdCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<IEnumerable<UserDto>>> Handle(GetUserByRestaurantIdCommand request, CancellationToken cancellationToken)
        {
            Guid currentUserId = _currentUser.UserId;

            IQueryable<UserBranch> query = _db.UserBranches
                .AsNoTracking()
                .Include(ur => ur.User)
                .Include(ur => ur.Branch);

            List<UserBranch> userBranches;

            if (_currentUser.Role == "Owner")
            {
                List<Guid> restaurantIds = await _db.Branches
                    .Where(b => b.Company.OwnerUserId == currentUserId && !b.IsDeleted)
                    .Select(b => b.Id)
                    .ToListAsync(cancellationToken);

                userBranches = await query
                    .Where(ur => restaurantIds.Contains(ur.BranchId) && ur.UserId != currentUserId && !ur.IsDeleted && !ur.User.IsDeleted)
                    .ToListAsync(cancellationToken);
            }
            else
            {
                Guid restaurantId = _currentUser.BranchId;
                if (restaurantId == Guid.Empty) return Result<IEnumerable<UserDto>>.Failure("Geçersiz şube bilgisi.");

                userBranches = await query
                    .Where(ur => ur.BranchId == restaurantId && ur.UserId != currentUserId && !ur.IsDeleted && !ur.User.IsDeleted)
                    .ToListAsync(cancellationToken);
            }

            return Result<IEnumerable<UserDto>>.Success(userBranches.OrderBy(ur => ur.User.FullName).Select(ur => ur.User.ToDto(ur)));
        }
    }
}
