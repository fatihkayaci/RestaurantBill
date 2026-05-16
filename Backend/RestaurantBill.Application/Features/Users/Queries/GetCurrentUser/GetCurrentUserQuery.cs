using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.Users.Queries.GetCurrentUser;

public class GetCurrentUserQuery : IRequest<UserDto>;
