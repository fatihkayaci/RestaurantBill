using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Exceptions;
using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Features.Products.Commands.UpdateProduct
{
    public class UpdateProductCommandHandler : IRequestHandler<UpdateProductCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public UpdateProductCommandHandler(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }
        /// <summary>
        /// Updates an existing product in the database using the provided command details.
        /// Validates the command payload and ID, ensures the product exists, and applies the updated values.
        /// </summary>
        /// <param name="request">The command containing the updated details for the product.</param>
        /// <param name="cancellationToken">The cancellation token.</param>
        /// <exception cref="BusinessException">Thrown when the command is null or the product ID is zero or negative.</exception>
        /// <exception cref="Exception">Thrown when the specified product cannot be found.</exception>
        public async Task Handle(UpdateProductCommand request, CancellationToken cancellationToken)
        {
            if (request == null)
                throw new BusinessException("Güncellenecek veri boş olamaz.");

            if (request.Id <= 0)
                throw new BusinessException("id 0 dan küçük veya eşit olamaz");

            var product = await _uow.Product.GetByIdAsync(request.Id, true);
            Guard.AgainstNull(product, "Böyle bir ürün bulunamadı.");

            _mapper.Map(request, product);
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}