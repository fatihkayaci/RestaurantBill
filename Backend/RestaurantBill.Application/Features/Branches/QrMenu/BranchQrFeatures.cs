using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Branches.QrMenu;

// Admin "Restoran → QR menü özellikleri": oturumdaki şubenin masa QR karşılama ekranındaki düğmeler.

// ── Oku ─────────────────────────────────────────────────────────────────────────────────────────
public class GetBranchQrFeaturesQuery : IRequest<Result<QrFeaturesDto>>
{
}

public class GetBranchQrFeaturesQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetBranchQrFeaturesQuery, Result<QrFeaturesDto>>
{
    public async Task<Result<QrFeaturesDto>> Handle(GetBranchQrFeaturesQuery request, CancellationToken cancellationToken)
    {
        Branch? branch = await db.Branches.AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == currentUser.BranchId && !b.IsDeleted, cancellationToken);
        if (branch is null) return Result<QrFeaturesDto>.Failure("Şube bulunamadı.");

        return Result<QrFeaturesDto>.Success(QrFeaturesDto.From(branch.GetQrFeatures()));
    }
}

// ── Kaydet ──────────────────────────────────────────────────────────────────────────────────────
public class UpdateBranchQrFeaturesCommand : IRequest<Result<QrFeaturesDto>>
{
    public bool OrderingEnabled { get; set; }
    public bool CallWaiterEnabled { get; set; }
    public bool BillRequestEnabled { get; set; }
    public bool DeliveryLinkEnabled { get; set; }
    public bool ReservationLinkEnabled { get; set; }
    /// <summary>Göndermeyen eski istemcide açık kalır.</summary>
    public bool FeaturedSectionEnabled { get; set; } = true;
    public bool PopularSectionEnabled { get; set; }
}

public class UpdateBranchQrFeaturesCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<UpdateBranchQrFeaturesCommand, Result<QrFeaturesDto>>
{
    public async Task<Result<QrFeaturesDto>> Handle(UpdateBranchQrFeaturesCommand request, CancellationToken cancellationToken)
    {
        Branch? branch = await db.Branches
            .FirstOrDefaultAsync(b => b.Id == currentUser.BranchId && !b.IsDeleted, cancellationToken);
        if (branch is null) return Result<QrFeaturesDto>.Failure("Şube bulunamadı.");

        QrFeatures features = QrFeatures.Create(
            request.OrderingEnabled, request.CallWaiterEnabled, request.BillRequestEnabled,
            request.DeliveryLinkEnabled, request.ReservationLinkEnabled,
            request.FeaturedSectionEnabled, request.PopularSectionEnabled);
        branch.SetQrFeatures(features);

        User? actor = await db.Users.FirstOrDefaultAsync(u => u.Id == currentUser.UserId, cancellationToken);
        db.AuditLogs.Add(AuditLog.Create(
            branch.Id,
            actor?.FullName ?? string.Empty,
            AuditLogCategory.System,
            AuditLogSeverity.Info,
            "BranchQrFeaturesUpdated",
            $"{actor?.FullName} {branch.BranchName} şubesinin QR menü özelliklerini güncelledi " +
            $"(sipariş {OnOff(features.OrderingEnabled)}, garson çağır {OnOff(features.CallWaiterEnabled)}, " +
            $"hesap iste {OnOff(features.BillRequestEnabled)}, paket servis bağlantısı {OnOff(features.DeliveryLinkEnabled)}, " +
            $"rezervasyon bağlantısı {OnOff(features.ReservationLinkEnabled)}, öne çıkanlar {OnOff(features.FeaturedSectionEnabled)}, " +
            $"popüler ürünler {OnOff(features.PopularSectionEnabled)}).",
            nameof(Branch),
            branch.Id));

        await db.SaveChangesAsync(cancellationToken);
        return Result<QrFeaturesDto>.Success(QrFeaturesDto.From(branch.GetQrFeatures()));
    }

    private static string OnOff(bool value) => value ? "açık" : "kapalı";
}
