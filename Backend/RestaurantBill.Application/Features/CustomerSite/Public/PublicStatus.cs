using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CustomerSite.Public;

/// <summary>Müşteri sayfalarının açılışta sorduğu tek şey: restoran hizmet veriyor mu (sahibi hesabı kapattıysa hayır).</summary>
public class GetPublicStatusQuery : IRequest<Result<PublicStatusDto>>
{
}

public class PublicStatusDto
{
    public bool Closed { get; set; }
}

public class GetPublicStatusQueryHandler(IAppDbContext db, ITenantResolver tenant)
    : IRequestHandler<GetPublicStatusQuery, Result<PublicStatusDto>>
{
    public async Task<Result<PublicStatusDto>> Handle(GetPublicStatusQuery request, CancellationToken cancellationToken)
        => Result<PublicStatusDto>.Success(new PublicStatusDto { Closed = await CustomerSiteScope.IsClosedAsync(db, tenant, cancellationToken) });
}
