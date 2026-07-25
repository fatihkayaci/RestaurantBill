using RestaurantBill.Domain.Interfaces;
using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.OpenTable
{
    public class OpenTableHandler : IRequestHandler<OpenTableCommand, Result<int>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICashierNotificationService _cashierNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public OpenTableHandler(IUnitOfWork uow, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
        {
            _uow = uow;
            _tableNotificationService = tableNotificationService;
            _cashierNotificationService = cashierNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result<int>> Handle(OpenTableCommand request, CancellationToken cancellationToken)
        {
            Table? table = await _uow.Table.GetByIdAsync(request.TableId, true);
            if (table is null) return Result<int>.Failure("Böyle bir masa bulunamadı.");

            table.Occupy();

            Order order = Order.Create(request.TableId);

            await _uow.Order.AddAsync(order);
            await _uow.SaveChangesAsync(cancellationToken);

            await _tableNotificationService.SendTableStatusChangedAsync(_currentUserService.RestaurantId, table.Id, (int)table.Status);
            await _cashierNotificationService.SendOrdersChangedAsync(_currentUserService.RestaurantId);

            return Result<int>.Success(order.Id);
        }
    }
}
