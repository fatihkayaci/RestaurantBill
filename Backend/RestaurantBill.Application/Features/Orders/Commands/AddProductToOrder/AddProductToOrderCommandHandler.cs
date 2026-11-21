using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using MediatR;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.AddProductToOrder
{
    public class AddProductToOrderCommandHandler : IRequestHandler<AddProductToOrderCommand, Result>
    {
        private readonly IAppDbContext _db;
        private readonly ITableNotificationService _tableNotificationService;
        private readonly ICashierNotificationService _cashierNotificationService;
        private readonly ICurrentUserService _currentUserService;

        public AddProductToOrderCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
        {
            _db = db;
            _tableNotificationService = tableNotificationService;
            _cashierNotificationService = cashierNotificationService;
            _currentUserService = currentUserService;
        }

        public async Task<Result> Handle(AddProductToOrderCommand request, CancellationToken cancellationToken)
        {
            List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

            // Aynı anda aynı siparişe ekleme yapılırsa (ör. iki garson) çakışan istek sipariş taze okunarak yeniden uygulanır.
            Result<Order> saved = await ConcurrencyRetry.ExecuteAsync(_db, async ct =>
            {
                Result<Order> loaded = await OrderLineAdding.LoadOrderForAddingAsync(_db, _currentUserService, branchIds, request.OrderId, ct);
                if (loaded.IsFailure)
                    return loaded;
                Order order = loaded.Value!;

                foreach (var item in request.OrderItems)
                {
                    if (await OrderLineAdding.AddProductAsync(_db, order, branchIds, item, ct) is { } error)
                        return Result<Order>.Failure(error);
                }

                if (!string.IsNullOrWhiteSpace(request.Note))
                    order.UpdateNote(request.Note);

                await _db.SaveChangesAsync(ct);
                return loaded;
            }, cancellationToken);

            if (saved.IsFailure)
                return Result.Failure(saved.Error!);

            await OrderLineAdding.NotifyOrderChangedAsync(_db, _tableNotificationService, _cashierNotificationService, _currentUserService, saved.Value!, cancellationToken);
            return Result.Success();
        }
    }
}
