using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Stats.Queries.GetOwnerDashboardLayout;

/// <summary>Oturumdaki kullanıcının Şirket Genel Bakış kart sırası (katalogla birleştirilmiş).</summary>
public class GetOwnerDashboardLayoutQuery : IRequest<Result<List<string>>>
{
}

public class GetOwnerDashboardLayoutQueryHandler : IRequestHandler<GetOwnerDashboardLayoutQuery, Result<List<string>>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetOwnerDashboardLayoutQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<List<string>>> Handle(GetOwnerDashboardLayoutQuery request, CancellationToken cancellationToken)
    {
        List<string>? saved = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == _currentUser.UserId)
            .Select(u => u.OwnerDashboardWidgets)
            .FirstOrDefaultAsync(cancellationToken);

        return Result<List<string>>.Success(OwnerDashboardWidgets.Merge(saved));
    }
}
