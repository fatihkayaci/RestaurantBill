using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Users.Queries.GetCurrentUser;

public class GetCurrentUserQuery : IRequest<Result<UserDto>>;
