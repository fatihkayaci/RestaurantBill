using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Queries.GetCurrentUser;

public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, Result<UserDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetCurrentUserQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<UserDto>> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        User? user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        if (user is null) return Result<UserDto>.Failure("Kullanıcı bulunamadı.");

        if (_currentUser.Role != nameof(UserRole.Owner))
        {
            // Birden çok şubeye atanmış bir Admin'de token'daki şubenin üyeliği esastır.
            List<UserBranch> memberships = await _db.UserBranches
                .AsNoTracking()
                .Include(ur => ur.Branch).ThenInclude(b => b.Company)
                .Where(ur => ur.UserId == user.Id && !ur.IsDeleted)
                .ToListAsync(cancellationToken);
            UserBranch? userBranch = memberships.FirstOrDefault(ur => ur.BranchId == _currentUser.BranchId) ?? memberships.FirstOrDefault();
            if (userBranch is not null)
                return Result<UserDto>.Success(user.ToDto(userBranch));
        }

        Company? company = await _db.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.OwnerUserId == user.Id && !c.IsDeleted, cancellationToken);
        if (company is null) return Result<UserDto>.Failure("Kullanıcı bulunamadı.");

        // Şube modundaki Owner için token'daki şube; "Tümü" modunda BranchId = Company.Id olduğu için null kalır.
        Branch? activeBranch = await _db.Branches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == _currentUser.BranchId && b.CompanyId == company.Id && !b.IsDeleted, cancellationToken);

        return Result<UserDto>.Success(new UserDto
        {
            Id = user.Id,
            FullName = user.FullName,
            UserName = user.Email ?? string.Empty,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber ?? string.Empty,
            UserCode = string.Empty,
            Role = UserRole.Owner,
            IsActive = user.IsActive,
            BranchId = activeBranch?.Id ?? Guid.Empty,
            BranchName = activeBranch?.BranchName,
            RestaurantName = company.Name,
            IsPhoneVerified = user.IsPhoneVerified,
            IsEmailVerified = user.IsEmailVerified
        });
    }
}
