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