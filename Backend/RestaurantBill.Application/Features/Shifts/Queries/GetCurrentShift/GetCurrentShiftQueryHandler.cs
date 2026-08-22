using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetCurrentShift;

public class GetCurrentShiftQueryHandler : IRequestHandler<GetCurrentShiftQuery, Result<ShiftDto>>
{
    private readonly IAppDbContext _db;

    public GetCurrentShiftQueryHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<Result<ShiftDto>> Handle(GetCurrentShiftQuery request, CancellationToken cancellationToken)
    {
        var shift = await _db.Shifts
            .AsNoTracking()
            .Include(s => s.CashRegister)
            .FirstOrDefaultAsync(s => s.CashRegisterId == request.CashRegisterId && s.Status == ShiftStatus.Open, cancellationToken);

        if (shift is null) return Result<ShiftDto>.Failure("Bu kasada açık bir vardiya yok.");

        return Result<ShiftDto>.Success(shift.ToDto());
    }
}
