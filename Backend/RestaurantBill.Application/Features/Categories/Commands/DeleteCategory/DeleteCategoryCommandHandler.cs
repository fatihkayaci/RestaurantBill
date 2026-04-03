using AutoMapper;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Categories.Commands.DeleteCategory
{
    public class DeleteCategoryCommandHandler : IRequestHandler<DeleteCategoryCommand>
    {
        private readonly IUnitOfWork _uow;
        public DeleteCategoryCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }
        /// <summary>
        /// Deletes a category from the database based on the specified ID in the command.
        /// Validates the ID and ensures the category exists before performing the deletion.
        /// </summary>
        /// <param name="command">The command containing the ID of the category to delete.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <exception cref="BusinessException">Thrown when the category ID is zero or negative.</exception>
        /// <exception cref="Exception">Thrown when the specified category cannot be found.</exception>
        public async Task Handle(DeleteCategoryCommand command, CancellationToken cancellationToken)
        {
            if (command.Id <= 0) throw new BusinessException("Kategori ID değeri 0 veya negatif olamaz.");
            var category = await _uow.Category.GetByIdAsync(command.Id);
            Guard.AgainstNull(category, "Böyle bir kategori bulunamadı");
            
            _uow.Category.Delete(category);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}