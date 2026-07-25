using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Categories.Commands.UpdateCategory
{
    public class UpdateCategoryCommandHandler : IRequestHandler<UpdateCategoryCommand, Result>
    {
        private readonly IUnitOfWork _uow;

        public UpdateCategoryCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task<Result> Handle(UpdateCategoryCommand command, CancellationToken cancellationToken)
        {
            Category? category = await _uow.Category.GetByIdAsync(command.Id, true);
            if (category is null) return Result.Failure("Böyle bir kategori bulunamadı");

            category.Rename(command.Name);

            await _uow.Category.UpdateAsync(category);
            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}