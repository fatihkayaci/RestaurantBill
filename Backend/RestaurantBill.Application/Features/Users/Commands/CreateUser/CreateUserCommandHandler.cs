using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Users.Commands.CreateUser
{
    public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand>
    {
        
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly UserManager<User> _userManager;
        public CreateUserCommandHandler(IUnitOfWork uow, IMapper mapper, IHttpContextAccessor httpContextAccessor, UserManager<User> userManager)
        {
            _uow = uow;
            _mapper = mapper;
            _userManager = userManager;
            _httpContextAccessor = httpContextAccessor;
        }
        public async Task Handle(CreateUserCommand request, CancellationToken cancellationToken)
        {
            var user = _mapper.Map<User>(request);
            var restaurantId = int.Parse(_httpContextAccessor.HttpContext!.User
            .FindFirst("RestaurantId")!.Value);
            if(restaurantId <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");
            user.RestaurantId = restaurantId;
            await _userManager.CreateAsync(user, request.PasswordHash);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}