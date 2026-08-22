using MediatR;
using Microsoft.EntityFrameworkCore;
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
        Guid restaurantId = _currentUser.BranchId;

        var shift = await _db.Shifts
            .AsNoTracking()
            .Include(s => s.CashRegister)
            .FirstOrDefaultAsync(s => s.BranchId == restaurantId && s.OpenedByUserId == _currentUser.UserId && s.Status == ShiftStatus.Open, cancellationToken);

        if (shift is null) return Result<ShiftDto>.Failure("Açık bir vardiyanız yok.");

        return Result<ShiftDto>.Success(shift.ToDto());
    }
}
