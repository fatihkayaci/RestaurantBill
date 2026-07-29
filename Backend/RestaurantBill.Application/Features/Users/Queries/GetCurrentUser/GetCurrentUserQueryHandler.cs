using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Users.Queries.GetCurrentUser;

public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, Result<UserDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetCurrentUserQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result<UserDto>> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        User? user = await _uow.User.GetByIdAsync(_currentUser.UserId);
        if (user is null) return Result<UserDto>.Failure("Kullanıcı bulunamadı.");

        UserRestaurant? userRestaurant = (await _uow.UserRestaurant.GetAllAsync(ur => ur.UserId == user.Id, false)).FirstOrDefault();
        if (userRestaurant is not null)
            return Result<UserDto>.Success(user.ToDto(userRestaurant));

        bool isOwner = (await _uow.Restaurant.GetAllAsync(r => r.OwnerUserId == user.Id && !r.IsDeleted, false)).Any();
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
            IsActive = user.IsActive
        });
    }
}
