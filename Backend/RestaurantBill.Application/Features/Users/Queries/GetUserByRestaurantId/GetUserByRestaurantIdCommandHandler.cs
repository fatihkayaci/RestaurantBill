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

                // Şube modundaki Owner (token'da bir şube) yalnızca o şubenin personelini görür; "Tümü" modunda hepsini.
                bool branchMode = !request.AllBranches && _currentUser.BranchId != _currentUser.CompanyId && restaurantIds.Contains(_currentUser.BranchId);
                List<Guid> visibleBranchIds = branchMode ? [_currentUser.BranchId] : restaurantIds;

                List<Guid> visibleUserIds = await _db.UserBranches
                    .Where(ur => visibleBranchIds.Contains(ur.BranchId) && !ur.IsDeleted)
                    .Select(ur => ur.UserId)
                    .Distinct()
                    .ToListAsync(cancellationToken);

                // Çok şubeli Admin'in tüm üyelikleri yüklenir ki kartta bütün şubeleri görünsün.
                userBranches = await query
                    .Where(ur => restaurantIds.Contains(ur.BranchId) && visibleUserIds.Contains(ur.UserId) && ur.UserId != currentUserId && !ur.IsDeleted && !ur.User.IsDeleted)
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

            // Kullanıcı başına tek satır: birincil üyelik en eski olan, şube listesi hepsini taşır.
            IEnumerable<UserDto> result = userBranches
                .GroupBy(ur => ur.UserId)
                .Select(g =>
                {
                    List<UserBranch> rows = g.OrderBy(ur => ur.CreatedAt).ToList();
                    UserDto dto = rows[0].User.ToDto(rows[0]);
                    dto.BranchIds = rows.Select(r => r.BranchId).ToList();
                    dto.BranchName = string.Join(", ", rows.Select(r => r.Branch?.BranchName).Where(n => !string.IsNullOrWhiteSpace(n)));
                    return dto;
                })
                .OrderBy(dto => dto.FullName);

            return Result<IEnumerable<UserDto>>.Success(result);
        }
    }
}
