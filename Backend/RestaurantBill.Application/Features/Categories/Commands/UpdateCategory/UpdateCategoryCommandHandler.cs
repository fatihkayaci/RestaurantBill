using AutoMapper;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Categories.Commands.UpdateCategory
{
    public class UpdateCategoryCommandHandler : IRequestHandler<UpdateCategoryCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        public UpdateCategoryCommandHandler(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }
        /// <summary>
        /// Updates an existing category in the database using the provided command details.
        /// Validates the command payload and ID, ensures the category exists, and applies the updated values.
        /// </summary>
        /// <param name="command">The command containing the updated details for the category.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <exception cref="BusinessException">Thrown when the command is null or the category ID is zero or negative.</exception>
        /// <exception cref="Exception">Thrown when the specified category cannot be found.</exception>
        public async Task Handle(UpdateCategoryCommand command, CancellationToken cancellationToken)
        {
            if (command == null)
                throw new BusinessException("Güncellenecek veri boş olamaz.");

            if (command.Id <= 0)
                throw new BusinessException("Güncellenecek ID 0 veya negatif olamaz.");
                
            var category = await _uow.Category.GetByIdAsync(command.Id, true);
            Guard.AgainstNull(category, "Böyle bir kategori bulunamadı");

            _mapper.Map(command, category); 

            await _uow.Category.UpdateAsync(category);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}