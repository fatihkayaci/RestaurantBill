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
        /// Closes the order, marks it as Paid and sets the table status to Available.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if order ID is zero or less, or if the order is not found.</exception>
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