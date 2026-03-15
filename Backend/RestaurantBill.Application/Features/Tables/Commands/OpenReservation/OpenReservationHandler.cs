using RestaurantBill.Domain.Interfaces;

using MediatR;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Features.Tables.Commands.OpenReservation
{
    public class OpenReservationHandler : IRequestHandler<OpenReservationCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMessageProducer _messageProducer;

        public OpenReservationHandler(IUnitOfWork uow, IMessageProducer messageProducer)
        {
            _uow = uow;
            _messageProducer = messageProducer;
        }

        public async Task Handle(OpenReservationCommand request, CancellationToken cancellationToken)
        {
            /*
            if (statusDto == null)
                Guard.AgainstNull(statusDto, "güncellenecek veri boş olamaz");

            if (!Enum.IsDefined(typeof(TableStatus), statusDto.Status))
                throw new BusinessException("Geçersiz bir masa durumu gönderildi!");

            if (tableId <= 0)
                throw new BusinessException("id 0 dan küçük veya eşit olamaz");

            if (statusDto.Status == TableStatus.Available)
            {
                var order = await _uow.Order.GetActiveOrderByTableId(tableId);
                if (order != null)
                    throw new BusinessException("bu masaya sipariş açıldığı için iptal edilemiyor. Hesabı al butonu ile deneyebilirsiniz.");
            }

            var table = await _uow.Table.GetByIdAsync(tableId, true);
            Guard.AgainstNull(table, "Böyle bir masa bulunamadı.");
            table.Status = statusDto.Status;
            await _uow.SaveChangesAsync(cancellationToken);*/
        }
    }
}