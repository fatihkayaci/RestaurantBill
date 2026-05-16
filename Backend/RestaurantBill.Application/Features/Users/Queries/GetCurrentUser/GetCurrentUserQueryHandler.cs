using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Users.Queries.GetCurrentUser;

public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, UserDto>
{
    private readonly UserManager<User> _userManager;
    private readonly IMapper _mapper;
    private readonly ICurrentUserService _currentUser;

    public GetCurrentUserQueryHandler(UserManager<User> userManager, IMapper mapper, ICurrentUserService currentUser)
    {
        _userManager = userManager;
        _mapper = mapper;
        _currentUser = currentUser;
    }

    public async Task<UserDto> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        User user = await _userManager.FindByIdAsync(_currentUser.UserId)
            ?? throw new NotFoundException("Kullanıcı bulunamadı.");

        return _mapper.Map<UserDto>(user);
    }
}
