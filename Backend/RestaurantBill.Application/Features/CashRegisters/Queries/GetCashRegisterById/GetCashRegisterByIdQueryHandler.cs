using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetCashRegisterById;

public class GetCashRegisterByIdHandler : IRequestHandler<GetCashRegisterByIdQuery, Result<CashRegisterDto>>
{
    private readonly IAppDbContext _db;

    public GetCashRegisterByIdHandler(IAppDbContext db)
    {
        _db = db;
    }

    public async Task<Result<CashRegisterDto>> Handle(GetCashRegisterByIdQuery request, CancellationToken cancellationToken)
    {
        CashRegisterDto? register = await _db.CashRegisters
            .AsNoTracking()
            .Where(c => c.Id == request.CashRegisterId)
            .Select(r => new CashRegisterDto
            {
                Id = r.Id,
                Name = r.Name,
                Balance = r.Balance,
                Status = r.Status
            })
            .FirstOrDefaultAsync(cancellationToken);
        if (register is null) return Result<CashRegisterDto>.Failure("Kasa bulunamadı");

        return Result<CashRegisterDto>.Success(register);
    }
}
