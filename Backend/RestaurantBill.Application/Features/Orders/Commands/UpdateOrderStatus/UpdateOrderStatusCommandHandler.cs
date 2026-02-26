using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;
using MediatR;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Features.Orders.Commands.UpdateOrderStatus
{
    public class UpdateOrderStatusCommandHandler : IRequestHandler<UpdateOrderStatusCommand>
    {
        private readonly IUnitOfWork _uow;

        public UpdateOrderStatusCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task Handle(UpdateOrderStatusCommand request, CancellationToken cancellationToken)
        {
            
            if (request.OrderId <= 0)
                throw new BusinessException("id 0 dan küçük veya eşit olamaz");

            var order = await _uow.Order.GetByIdAsync(request.OrderId, true);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");
            
            order.Status = request.NewTableStatus;

            await _uow.SaveChangesAsync();
        }
    }
}