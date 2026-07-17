using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Categories.Commands.CreateCategory
{
    public class CreateCategoryCommandHandler : IRequestHandler<CreateCategoryCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _userService;

        public CreateCategoryCommandHandler(IUnitOfWork uow, ICurrentUserService userService)
        {
            _uow = uow;
            _userService = userService;
        }

        public async Task Handle(CreateCategoryCommand command, CancellationToken cancellationToken)
        {
            int restaurantId = _userService.RestaurantId;

            bool nameExists = (await _uow.Category.GetAllAsync(c => c.Name == command.Name && c.RestaurantId == restaurantId, false)).Any();
            if (nameExists)
                throw new BusinessException("Bu isimde bir kategori zaten mevcut.");

            Category category = Category.Create(command.Name, restaurantId);
            await _uow.Category.AddAsync(category);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}