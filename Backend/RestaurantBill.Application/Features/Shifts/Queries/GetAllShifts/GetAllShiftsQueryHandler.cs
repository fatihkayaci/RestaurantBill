using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetAllShifts;

public class GetAllShiftsQueryHandler : IRequestHandler<GetAllShiftsQuery, Result<List<ShiftDto>>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetAllShiftsQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<List<ShiftDto>>> Handle(GetAllShiftsQuery request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;
        if (restaurantId == Guid.Empty) return Result<List<ShiftDto>>.Failure("Geçersiz şube bilgisi.");

        var shifts = await _db.Shifts
            .AsNoTracking()
            .Include(s => s.CashRegister)
            .Where(s => s.BranchId == restaurantId && (request.CashRegisterId == null || s.CashRegisterId == request.CashRegisterId))
            .OrderByDescending(s => s.OpenedAt)
            .ToListAsync(cancellationToken);

        return Result<List<ShiftDto>>.Success(shifts.Select(s => s.ToDto()).ToList());
    }
}
