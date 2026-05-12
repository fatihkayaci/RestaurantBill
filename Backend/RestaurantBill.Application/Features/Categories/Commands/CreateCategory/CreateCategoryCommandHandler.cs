using AutoMapper;
using MediatR;
using Microsoft.AspNetCore.Http;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Categories.Commands.CreateCategory
{
    public class CreateCategoryCommandHandler : IRequestHandler<CreateCategoryCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        private readonly ICurrentUserService _userService;
        public CreateCategoryCommandHandler(IUnitOfWork uow, IMapper mapper, ICurrentUserService userService)
        {
            _uow = uow;
            _mapper = mapper;
            _userService = userService;
        }
        /// <summary>
        /// Adds a new category to the database based on the provided command.
        /// </summary>
        /// <param name="command">The command containing the details for the new category.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        public async Task Handle(CreateCategoryCommand command, CancellationToken cancellationToken)
        { 
            var restaurantId = _userService.RestaurantId;
            if(restaurantId <= 0) throw new BusinessException("ID değeri 0 veya negatif olamaz.");
            
            var category = _mapper.Map<Category>(command);
            category.RestaurantId = restaurantId;
            await _uow.Category.AddAsync(category);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}