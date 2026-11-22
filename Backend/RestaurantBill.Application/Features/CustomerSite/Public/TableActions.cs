using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Public;

// Masa QR karşılama ekranının "Garson çağır" ve "Hesap iste" düğmeleri. Giriş gerekmez; masa kimliği ve slug yeter.
// İkisi de admin anahtarına (QrFeatures) ve masa başına bekleme süresine (TableActionCooldown) tabidir.

// ── Garson çağır ────────────────────────────────────────────────────────────────────────────────
public class CallWaiterCommand : IRequest<Result<TableActionResultDto>>
{
    public Guid TableId { get; set; }
    /// <summary>Su, peçete/çatal ya da diğer. null: nedensiz çağrı (eski istemciler).</summary>
    public WaiterCallReason? Reason { get; set; }
    /// <summary>Yalnız "Diğer"de: kısa not (en fazla 100 karakter; kırpılır, kontrol karakterleri atılır).</summary>
    public string? Note { get; set; }
}

public static class WaiterCallNote
{
    public const int MaxLength = 100;

    /// <summary>Kontrol karakterlerini (satır sonu dahil) atar, boşlukları kırpar. Boş not null döner.</summary>
    public static string? Normalize(string? note)
    {
        if (string.IsNullOrWhiteSpace(note)) return null;
        string cleaned = new string(note.Where(c => !char.IsControl(c)).ToArray()).Trim();
        return cleaned.Length == 0 ? null : cleaned;
    }
}

public class CallWaiterCommandValidator : AbstractValidator<CallWaiterCommand>
{
    public CallWaiterCommandValidator()
    {
        RuleFor(x => x.TableId).NotEqual(Guid.Empty).WithMessage("Geçerli bir masa seçilmelidir.");
        RuleFor(x => x.Reason)
            .IsInEnum().When(x => x.Reason.HasValue).WithMessage("Geçersiz çağırma nedeni.");
        RuleFor(x => x.Note)
            .Must(n => (WaiterCallNote.Normalize(n)?.Length ?? 0) <= WaiterCallNote.MaxLength)
            .WithMessage($"Not en fazla {WaiterCallNote.MaxLength} karakter olabilir.");
    }
}

// Kayıt tutulmaz: yalnızca masaya bakan garsonlara (ve yöneticilere) canlı bildirim gider.
public class CallWaiterCommandHandler(IAppDbContext db, ITenantResolver tenant, ITableNotificationService tableNotifications,
    TableActionCooldown cooldown, TimeProvider clock)
    : IRequestHandler<CallWaiterCommand, Result<TableActionResultDto>>
{
    public async Task<Result<TableActionResultDto>> Handle(CallWaiterCommand request, CancellationToken cancellationToken)
    {
        Table? table = await CustomerSiteScope.ResolveTableAsync(db, tenant, request.TableId, cancellationToken);
        if (table is null)
            return Result<TableActionResultDto>.Failure(CustomerSiteScope.TableNotFoundMessage);

        Guid branchId = table.Region.BranchId;
        QrFeatures features = await CustomerSiteScope.QrFeaturesOfAsync(db, branchId, cancellationToken);
        if (!features.CallWaiterEnabled)
            return Result<TableActionResultDto>.Failure(CustomerSiteScope.CallWaiterDisabledMessage);

        if (cooldown.TryStart(TableAction.CallWaiter, table.Id) is TimeSpan remaining)
            return Result<TableActionResultDto>.Success(new TableActionResultDto { Sent = false, RetryAfterSeconds = TableActionCooldown.Seconds(remaining) });

        // QR adresi sabit: masa dışından (fotoğraftan) çağrı gelebilir. Açık hesabı olmayan masadan gelen çağrı garsona
        // "Masa boş görünüyor" etiketiyle gider.
        bool tableLooksEmpty = await QrTableAccess.FindOpenOrderAsync(db, table.Id, track: false, cancellationToken) is null;

        await tableNotifications.SendWaiterCalledAsync(branchId, new WaiterCalledDto
        {
            TableId = table.Id,
            TableName = table.Name,
            RegionId = table.RegionId,
            RegionName = table.Region.Name,
            CalledAt = clock.GetUtcNow().UtcDateTime,
            TableLooksEmpty = tableLooksEmpty,
            Reason = request.Reason,
            // Not yalnız "Diğer" nedeninde garsona gider.
            Note = request.Reason == WaiterCallReason.Other ? WaiterCallNote.Normalize(request.Note) : null,
        });

        return Result<TableActionResultDto>.Success(new TableActionResultDto { Sent = true, RetryAfterSeconds = TableActionCooldown.Seconds(TableActionCooldown.Window) });
    }
}

// ── Hesap iste ──────────────────────────────────────────────────────────────────────────────────
// Personelin RequestBillCommand'ının müşteri eşi: aynı domain metodu (Order.RequestBill) ve aynı bildirimler
// (masa ekranlarında rozet, kasiyer ve yönetici uyarısı). Personel ucu müşteriye açılmaz; burada yetki yerine
// masa kimliği + slug, admin anahtarı ve bekleme süresi vardır. Geri alma (Cancel) müşteriye açık değildir.
public class RequestTableBillCommand : IRequest<Result<TableActionResultDto>>
{
    public Guid TableId { get; set; }
    /// <summary>Müşterinin ödeme tercihi (nakit / kart / IBAN); null: belirtilmedi.</summary>
    public BillPaymentHint? PaymentHint { get; set; }
    /// <summary>Hesap kaç kişiye bölünecek (2–20); null: bölünmeyecek.</summary>
    public int? SplitCount { get; set; }
}

public class RequestTableBillCommandValidator : AbstractValidator<RequestTableBillCommand>
{
    public RequestTableBillCommandValidator()
    {
        RuleFor(x => x.TableId).NotEqual(Guid.Empty).WithMessage("Geçerli bir masa seçilmelidir.");
        RuleFor(x => x.PaymentHint)
            .IsInEnum().When(x => x.PaymentHint.HasValue).WithMessage("Geçersiz ödeme tercihi.");
        RuleFor(x => x.SplitCount)
            .InclusiveBetween(Order.BillSplitMin, Order.BillSplitMax).When(x => x.SplitCount.HasValue)
            .WithMessage($"Hesap {Order.BillSplitMin} ile {Order.BillSplitMax} kişi arasında bölünebilir.");
    }
}

public class RequestTableBillCommandHandler(IAppDbContext db, ITenantResolver tenant, ITableNotificationService tableNotifications,
    ICashierNotificationService cashierNotifications, TableActionCooldown cooldown, TimeProvider clock)
    : IRequestHandler<RequestTableBillCommand, Result<TableActionResultDto>>
{
    public const string RequestedByName = "Masadaki müşteri (QR)";
    public const string NoOpenBillMessage = "Masada açık hesap yok.";

    public async Task<Result<TableActionResultDto>> Handle(RequestTableBillCommand request, CancellationToken cancellationToken)
    {
        Table? table = await CustomerSiteScope.ResolveTableAsync(db, tenant, request.TableId, cancellationToken);
        if (table is null)
            return Result<TableActionResultDto>.Failure(CustomerSiteScope.TableNotFoundMessage);

        Guid branchId = table.Region.BranchId;
        QrFeatures features = await CustomerSiteScope.QrFeaturesOfAsync(db, branchId, cancellationToken);
        if (!features.BillRequestEnabled)
            return Result<TableActionResultDto>.Failure(CustomerSiteScope.BillRequestDisabledMessage);

        Order? order = await db.Orders
            .Where(o => o.TableId == table.Id && o.Status != OrderStatus.Paid && o.Status != OrderStatus.Cancelled)
            .OrderByDescending(o => o.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
        if (order is null)
            return Result<TableActionResultDto>.Failure(NoOpenBillMessage);

        // Masanın açık hesabı masadaki her telefonda görünür; ödenecek kalan da söylenir.
        decimal billTotal = order.RemainingAmount;

        if (cooldown.TryStart(TableAction.BillRequest, table.Id) is TimeSpan remaining)
            return Result<TableActionResultDto>.Success(new TableActionResultDto { Sent = false, RetryAfterSeconds = TableActionCooldown.Seconds(remaining), BillTotal = billTotal });

        try
        {
            // Son istek geçerli: ödeme tercihi ve bölme bilgisi her istekte yeniden yazılır.
            order.RequestBill(clock.GetUtcNow().UtcDateTime, request.PaymentHint, request.SplitCount);

            db.AuditLogs.Add(AuditLog.Create(
                order.BranchId,
                RequestedByName,
                AuditLogCategory.Order,
                AuditLogSeverity.Info,
                "BillRequested",
                $"{table.Name} için masadaki müşteri QR menüden hesap istedi.",
                nameof(Order),
                order.Id));

            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DomainException ex)
        {
            cooldown.Release(TableAction.BillRequest, table.Id);
            return Result<TableActionResultDto>.Failure(ex.Message);
        }
        catch
        {
            cooldown.Release(TableAction.BillRequest, table.Id);
            throw;
        }

        await tableNotifications.SendBillRequestChangedAsync(order.BranchId, table.Id, order.BillRequestedAt);
        await cashierNotifications.SendOrdersChangedAsync(order.BranchId);
        BillRequestHintDto hint = BillRequestHintDto.From(order);
        await cashierNotifications.SendBillRequestedAsync(order.BranchId, table.RegionId, table.Id, table.Name, RequestedByName, hint);
        await tableNotifications.SendCustomerBillRequestedAsync(order.BranchId, new WaiterCalledDto
        {
            TableId = table.Id,
            TableName = table.Name,
            RegionId = table.RegionId,
            RegionName = table.Region.Name,
            CalledAt = clock.GetUtcNow().UtcDateTime,
            PaymentHint = hint.PaymentHint,
            SplitCount = hint.SplitCount,
            Remaining = order.RemainingAmount,
        });

        return Result<TableActionResultDto>.Success(new TableActionResultDto
        {
            Sent = true,
            RetryAfterSeconds = TableActionCooldown.Seconds(TableActionCooldown.Window),
            // Karşılama ekranındaki "Hesabınız geliyor" penceresinde ödenecek kalan gösterilir.
            BillTotal = billTotal
        });
    }
}
