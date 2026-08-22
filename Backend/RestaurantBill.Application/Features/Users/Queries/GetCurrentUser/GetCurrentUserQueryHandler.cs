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

        UserBranch? userBranch = await _db.UserBranches
            .AsNoTracking()
            .Include(ur => ur.Branch).ThenInclude(b => b.Company)
            .FirstOrDefaultAsync(ur => ur.UserId == user.Id, cancellationToken);
        if (userBranch is not null)
            return Result<UserDto>.Success(user.ToDto(userBranch));

        bool isOwner = await _db.Companies
            .AnyAsync(c => c.OwnerUserId == user.Id && !c.IsDeleted, cancellationToken);
        if (!isOwner) return Result<UserDto>.Failure("Kullanıcı bulunamadı.");

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
            IsPhoneVerified = user.IsPhoneVerified,
            IsEmailVerified = user.IsEmailVerified
        });
    }
}
