using AutoMapper;
using MediatR;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Categories.Commands.CreateCategory
{
    public class CreateCategoryCommandHandler : IRequestHandler<CreateCategoryCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;
        public CreateCategoryCommandHandler(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }
        /// <summary>
        /// Adds a new category to the database based on the provided command.
        /// </summary>
        /// <param name="command">The command containing the details for the new category.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        public async Task Handle(CreateCategoryCommand command, CancellationToken cancellationToken)
        {
            var category = _mapper.Map<Category>(command);
            await _uow.Category.AddAsync(category);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}