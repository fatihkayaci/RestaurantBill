using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Stats.Queries.GetDashboardLayout;

public class GetDashboardLayoutQuery : IRequest<Result<List<string>>>
{
}

public class GetDashboardLayoutQueryHandler : IRequestHandler<GetDashboardLayoutQuery, Result<List<string>>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetDashboardLayoutQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<List<string>>> Handle(GetDashboardLayoutQuery request, CancellationToken cancellationToken)
    {
        List<string>? cards = await _db.Users
            .AsNoTracking()
            .Where(u => u.Id == _currentUser.UserId)
            .Select(u => u.DashboardCards)
            .FirstOrDefaultAsync(cancellationToken);

        // Kayıtlı düzende artık var olmayan bir kart kalmışsa (katalogdan çıkarıldıysa) sessizce atlanır.
        List<string> layout = cards is null
            ? DashboardCards.Default.ToList()
            : cards.Where(DashboardCards.IsKnown).ToList();

        return Result<List<string>>.Success(layout);
    }
}
