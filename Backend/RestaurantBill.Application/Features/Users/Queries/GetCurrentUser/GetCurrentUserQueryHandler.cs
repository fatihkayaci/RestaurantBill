using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Users.Queries.GetCurrentUser;

public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, UserDto>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetCurrentUserQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<UserDto> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        var user = await _uow.User.GetByIdAsync(_currentUser.UserId)
            ?? throw new NotFoundException("Kullanıcı bulunamadı.");

        return user.ToDto();
    }
}
