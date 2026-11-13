using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetOpenRegisters;

// Şubenin şu an açık günü olan kasaları. Garson ödeme alırken buradan kasa seçer; kasa bakiyesi
// gibi kör sayımı bozacak bilgi dönmez. Garsonda "Hesap al" yetkisi gerekir.
public class GetOpenRegistersQuery : IRequest<Result<List<OpenRegisterDto>>>
{
}

public class GetOpenRegistersQueryHandler : IRequestHandler<GetOpenRegistersQuery, Result<List<OpenRegisterDto>>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetOpenRegistersQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<List<OpenRegisterDto>>> Handle(GetOpenRegistersQuery request, CancellationToken cancellationToken)
    {
        StaffAccess access = await _db.GetStaffAccessAsync(_currentUser, cancellationToken);
        if (access.Check(WaiterPermission.TakePayment) is { } denied)
            return Result<List<OpenRegisterDto>>.Failure(denied);

        List<Guid> branchIds = await _db.GetWorkingBranchIdsAsync(_currentUser, cancellationToken);
        if (branchIds.Count == 0)
            return Result<List<OpenRegisterDto>>.Failure("Geçersiz şube bilgisi.");

        var openShifts = await _db.Shifts
            .AsNoTracking()
            .InBranches(branchIds)
            .Where(s => s.Status == ShiftStatus.Open && !s.IsDeleted && !s.CashRegister.IsDeleted && s.CashRegister.Status == CashRegisterStatus.Open)
            .Select(s => new { s.Id, s.CashRegisterId, RegisterName = s.CashRegister.Name, s.OpenedAt, s.OpenedByUserId })
            .ToListAsync(cancellationToken);

        List<Guid> ownerIds = openShifts.Select(s => s.OpenedByUserId).Distinct().ToList();
        Dictionary<Guid, string> ownerNames = await _db.Users
            .AsNoTracking()
            .Where(u => ownerIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);

        List<OpenRegisterDto> registers = openShifts
            .Select(s => new OpenRegisterDto
            {
                CashRegisterId = s.CashRegisterId,
                CashRegisterName = s.RegisterName,
                ShiftId = s.Id,
                OpenedAt = s.OpenedAt,
                ShiftOwnerName = ownerNames.GetValueOrDefault(s.OpenedByUserId, string.Empty),
            })
            .OrderBy(r => r.CashRegisterName)
            .ToList();

        return Result<List<OpenRegisterDto>>.Success(registers);
    }
}
