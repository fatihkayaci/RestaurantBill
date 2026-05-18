using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Categories.Commands.UpdateCategory
{
    public class UpdateCategoryCommandHandler : IRequestHandler<UpdateCategoryCommand>
    {
        private readonly IUnitOfWork _uow;

        public UpdateCategoryCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task Handle(UpdateCategoryCommand command, CancellationToken cancellationToken)
        {
            Category? category = await _uow.Category.GetByIdAsync(command.Id, true);
            Guard.AgainstNull(category, "Böyle bir kategori bulunamadı");

            category.Rename(command.Name);

            await _uow.Category.UpdateAsync(category);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}