using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetMyCurrentShift;

public class GetMyCurrentShiftQueryHandler : IRequestHandler<GetMyCurrentShiftQuery, Result<ShiftDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetMyCurrentShiftQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<ShiftDto>> Handle(GetMyCurrentShiftQuery request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

        var shift = await _db.Shifts
            .AsNoTracking()
            .Include(s => s.CashRegister)
            .InBranches(branchIds).FirstOrDefaultAsync(s => s.OpenedByUserId == _currentUser.UserId && s.Status == ShiftStatus.Open, cancellationToken);

        if (shift is null) return Result<ShiftDto>.Failure("Açık bir vardiyanız yok.");

        return Result<ShiftDto>.Success(await _db.ToDtoWithOwnerAsync(shift, cancellationToken));
    }
}
