using MediatR;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Orders.Commands.AddLinesToOrder;

// Ürünler ve menüler ayrı ve paralel isteklerle gönderildiğinde ikisi aynı siparişi aynı anda güncelliyor, xmin çakışmasında
// biri (genelde menü) kaybolup mutfağa hiç düşmüyordu. Bu uç hepsini tek SaveChanges ile yazar; çakışma olursa
// (başka biri aynı anda aynı masaya ekliyorsa) istek sipariş taze okunarak yeniden uygulanır.
public class AddLinesToOrderCommandHandler : IRequestHandler<AddLinesToOrderCommand, Result>
{
    public const string NothingSavedSuffix = " Sipariş gönderilmedi, sepet olduğu gibi duruyor.";

    private readonly IAppDbContext _db;
    private readonly ITableNotificationService _tableNotificationService;
    private readonly ICashierNotificationService _cashierNotificationService;
    private readonly ICurrentUserService _currentUserService;

    public AddLinesToOrderCommandHandler(IAppDbContext db, ITableNotificationService tableNotificationService, ICashierNotificationService cashierNotificationService, ICurrentUserService currentUserService)
    {
        _db = db;
        _tableNotificationService = tableNotificationService;
        _cashierNotificationService = cashierNotificationService;
        _currentUserService = currentUserService;
    }

    public async Task<Result> Handle(AddLinesToOrderCommand request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUserService, cancellationToken);

        Result<Order> saved = await ConcurrencyRetry.ExecuteAsync(_db, async ct =>
        {
            Result<Order> loaded = await OrderLineAdding.LoadOrderForAddingAsync(_db, _currentUserService, branchIds, request.OrderId, ct);
            if (loaded.IsFailure)
                return loaded;
            Order order = loaded.Value!;

            // Bir satır eklenemezse SaveChanges çağrılmaz: o ana kadar eklenenler de kaydedilmez (izlenen değişiklikler
            // istek kapsamıyla birlikte atılır).
            for (int i = 0; i < request.Products.Count; i++)
            {
                if (await OrderLineAdding.AddProductAsync(_db, order, branchIds, request.Products[i], ct) is { } error)
                    return Result<Order>.Failure($"Sepetteki {i + 1}. ürün satırı eklenemedi: {error}{NothingSavedSuffix}");
            }

            for (int i = 0; i < request.SetMenus.Count; i++)
            {
                SetMenuLineDto line = request.SetMenus[i];
                Result<OrderItem> added = await OrderLineAdding.AddSetMenuAsync(_db, order, line.SetMenuId, line.Quantity, line.Note, line.Selections, ct);
                if (added.IsFailure)
                    return Result<Order>.Failure($"Sepetteki {i + 1}. menü satırı eklenemedi: {added.Error}{NothingSavedSuffix}");
            }

            if (!string.IsNullOrWhiteSpace(request.Note))
                order.UpdateNote(request.Note);

            await _db.SaveChangesAsync(ct);
            return loaded;
        }, cancellationToken);

        if (saved.IsFailure)
        {
            // Başarısız denemenin bellekte eklediği satırlar aynı istek içinde başka bir kayıtla yazılmasın.
            _db.ChangeTracker.Clear();
            return Result.Failure(saved.Error!);
        }

        // Tüm satırlar için tek bildirim.
        await OrderLineAdding.NotifyOrderChangedAsync(_db, _tableNotificationService, _cashierNotificationService, _currentUserService, saved.Value!, cancellationToken);
        return Result.Success();
    }
}
