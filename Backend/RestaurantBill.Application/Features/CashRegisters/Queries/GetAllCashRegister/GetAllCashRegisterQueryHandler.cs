using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetAllCashRegister;

public class GetAllCashRegisterHandler : IRequestHandler<GetAllCashRegisterQuery, Result<List<CashRegisterDto>>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetAllCashRegisterHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<List<CashRegisterDto>>> Handle(GetAllCashRegisterQuery request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;
        if (restaurantId == Guid.Empty) return Result<List<CashRegisterDto>>.Failure("Geçersiz şube bilgisi.");

        var registers = await _db.CashRegisters
            .AsNoTracking()
            .Where(c => c.BranchId == restaurantId)
            .OrderBy(r => r.Name)
            .Select(r => new CashRegisterDto
            {
                Id = r.Id,
                Name = r.Name,
                Balance = r.Balance,
                Status = r.Status
            })
            .ToListAsync(cancellationToken);

        return Result<List<CashRegisterDto>>.Success(registers);
    }
}
