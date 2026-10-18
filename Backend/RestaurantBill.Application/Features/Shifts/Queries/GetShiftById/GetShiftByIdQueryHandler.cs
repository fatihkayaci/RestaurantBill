using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetShiftById;

public class GetShiftByIdQueryHandler : IRequestHandler<GetShiftByIdQuery, Result<ShiftDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetShiftByIdQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<ShiftDto>> Handle(GetShiftByIdQuery request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await _db.GetAccessibleBranchIdsAsync(_currentUser, cancellationToken);

        var shift = await _db.Shifts
            .AsNoTracking()
            .Include(s => s.CashRegister)
            .InBranches(branchIds).FirstOrDefaultAsync(s => s.Id == request.ShiftId, cancellationToken);
        if (shift is null) return Result<ShiftDto>.Failure("Vardiya bulunamadı.");

        return Result<ShiftDto>.Success(shift.ToDto());
    }
}
