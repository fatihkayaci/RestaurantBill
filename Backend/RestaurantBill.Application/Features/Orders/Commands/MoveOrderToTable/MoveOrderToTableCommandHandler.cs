using AutoMapper;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
// using RestaurantBill.Application.Repositories; // Kendi yolunu eklersin

namespace RestaurantBill.Application.Features.Orders.Commands.MoveOrderToTable
{
    public class MoveOrderToTableCommandHandler : IRequestHandler<MoveOrderToTableCommand>
    {
        private readonly IUnitOfWork _uow;

        public MoveOrderToTableCommandHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        public async Task Handle(MoveOrderToTableCommand request, CancellationToken cancellationToken)
        {
            if (request.OrderId <= 0 || request.TableId <= 0) throw new BusinessException("id 0 dan küçük veya eşit olamaz");
            
            var order = await _uow.Order.GetByIdAsync(request.OrderId, true);
            Guard.AgainstNull(order, "Böyle bir sipariş bulunamadı.");

            var newTable = await _uow.Table.GetByIdAsync(request.TableId, true);
            Guard.AgainstNull(newTable, "Böyle bir Masa bulunamadı.");
            
            if (newTable.Status != TableStatus.Available) throw new BusinessException("Hedef masa şu an dolu, sipariş taşınamaz!");

            var oldTable = await _uow.Table.GetByIdAsync(order.TableId, true);
            if (oldTable != null)
                oldTable.Status = TableStatus.Available;

            order.TableId = request.TableId;
            newTable.Status = TableStatus.Occupied;
            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}