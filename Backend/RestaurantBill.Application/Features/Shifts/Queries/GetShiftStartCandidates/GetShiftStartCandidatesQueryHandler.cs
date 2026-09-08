using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Queries.GetShiftStartCandidates;

public class GetShiftStartCandidatesQueryHandler : IRequestHandler<GetShiftStartCandidatesQuery, Result<List<ShiftStartCandidateDto>>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetShiftStartCandidatesQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<List<ShiftStartCandidateDto>>> Handle(GetShiftStartCandidatesQuery request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;
        if (restaurantId == Guid.Empty) return Result<List<ShiftStartCandidateDto>>.Failure("Geçersiz şube bilgisi.");

        var registers = await _db.CashRegisters
            .AsNoTracking()
            .Where(r => r.BranchId == restaurantId && r.Status == CashRegisterStatus.Open)
            .ToListAsync(cancellationToken);

        // Vardiya artık kişiye değil kasaya ait: admin bir kasada günü başlatmış olabilir,
        // bu yüzden kasiyerin kendi açtığı bir vardiyası olsa da tüm açık kasalar listelenir
        // ki zaten açık olan bir kasaya (sayım yapmadan) katılabilsin.
        var openShiftByRegisterId = await _db.Shifts
            .AsNoTracking()
            .Where(s => s.BranchId == restaurantId && s.Status == ShiftStatus.Open)
            .ToDictionaryAsync(s => s.CashRegisterId, cancellationToken);

        // Kasa bazında en son kapanmış vardiyayı bulmak için (sayımı atlanmış mı diye bakmak
        // amacıyla) tüm kapalı vardiyaları çekip bellekte gruplamak, EF'in GroupBy+First
        // çevirisinin sağlayıcıya göre değişken olmasından daha güvenilir.
        List<Shift> closedShifts = await _db.Shifts
            .AsNoTracking()
            .Where(s => s.BranchId == restaurantId && s.Status == ShiftStatus.Closed)
            .OrderByDescending(s => s.ClosedAt)
            .ToListAsync(cancellationToken);
        Dictionary<Guid, Shift> lastClosedShiftByRegisterId = closedShifts
            .GroupBy(s => s.CashRegisterId)
            .ToDictionary(g => g.Key, g => g.First());

        var candidates = registers
            .Select(r =>
            {
                openShiftByRegisterId.TryGetValue(r.Id, out Shift? openShift);
                lastClosedShiftByRegisterId.TryGetValue(r.Id, out Shift? lastClosedShift);
                return new ShiftStartCandidateDto
                {
                    CashRegisterId = r.Id,
                    CashRegisterName = r.Name,
                    ExpectedOpeningBalance = r.Balance,
                    HasOpenShift = openShift is not null,
                    OpenShiftId = openShift?.Id,
                    OpenedAt = openShift?.OpenedAt,
                    PreviousShiftUncounted = lastClosedShift?.CountStatus == ShiftCountStatus.NotCounted
                };
            })
            .OrderBy(c => c.CashRegisterName)
            .ToList();

        return Result<List<ShiftStartCandidateDto>>.Success(candidates);
    }
}
