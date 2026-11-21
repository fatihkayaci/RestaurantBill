using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.AddSetMenuToOrder;

public class AddSetMenuToOrderCommandHandler : IRequestHandler<AddSetMenuToOrderCommand, Result<Guid>>
{
    private readonly IAppDbContext _db;
    private readonly ITableNotificationService _tableNotificationService;
    private readonly ICashierNotificationService _cashierNotificationService;
    private readonly ICurrentUserService _currentUserService;

    public AddSetMenuToOrderCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
    {
        _db = db;
        _tableNotificationService = tableNotificationService;
        _cashierNotificationService = cashierNotificationService;
        _currentUserService = currentUserService;
    }

    public async Task<Result<Guid>> Handle(AddSetMenuToOrderCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

        // Aynı anda aynı siparişe ekleme yapılırsa çakışan istek sipariş taze okunarak yeniden uygulanır.
        Result<(Order Order, OrderItem Line)> saved = await ConcurrencyRetry.ExecuteAsync(_db, async ct =>
        {
            // Ürün eklemeyle aynı kural: garson yalnızca erişebildiği masaya, sipariş alma yetkisiyle ekler.
            Result<Order> loaded = await OrderLineAdding.LoadOrderForAddingAsync(_db, _currentUserService, branchIds, request.OrderId, ct);
            if (loaded.IsFailure)
                return Result<(Order, OrderItem)>.Failure(loaded.Error!);
            Order order = loaded.Value!;

            Result<OrderItem> line = await OrderLineAdding.AddSetMenuAsync(_db, order, request.SetMenuId, request.Quantity, request.Note, request.Selections, ct);
            if (line.IsFailure)
                return Result<(Order, OrderItem)>.Failure(line.Error!);

            await _db.SaveChangesAsync(ct);
            return Result<(Order, OrderItem)>.Success((order, line.Value!));
        }, cancellationToken);

        if (saved.IsFailure)
            return Result<Guid>.Failure(saved.Error!);

        await OrderLineAdding.NotifyOrderChangedAsync(_db, _tableNotificationService, _cashierNotificationService, _currentUserService, saved.Value.Order, cancellationToken);
        return Result<Guid>.Success(saved.Value.Line.Id);
    }
}
