using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Categories.Commands.CreateCategory
{
    public class CreateCategoryCommandHandler : IRequestHandler<CreateCategoryCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _userService;

        public CreateCategoryCommandHandler(IUnitOfWork uow, ICurrentUserService userService)
        {
            _uow = uow;
            _userService = userService;
        }

        public async Task<Result> Handle(CreateCategoryCommand command, CancellationToken cancellationToken)
        {
            Guid restaurantId = _userService.BranchId;

            bool nameExists = (await _uow.Category.GetAllAsync(c => c.Name == command.Name && c.BranchId == restaurantId, false)).Any();
            if (nameExists)
                return Result.Failure("Bu isimde bir kategori zaten mevcut.");

            Category category = Category.Create(command.Name, restaurantId);
            await _uow.Category.AddAsync(category);
            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}