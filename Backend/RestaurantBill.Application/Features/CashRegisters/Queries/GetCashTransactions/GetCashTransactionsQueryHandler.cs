using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetCashTransactions;

public class GetCashTransactionsQueryHandler : IRequestHandler<GetCashTransactionsQuery, Result<List<CashTransactionDto>>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetCashTransactionsQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<List<CashTransactionDto>>> Handle(GetCashTransactionsQuery request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;
        if (restaurantId == Guid.Empty) return Result<List<CashTransactionDto>>.Failure("Geçersiz şube bilgisi.");

        var transactions = await _db.CashTransactions
            .AsNoTracking()
            .Where(t => t.CashRegister.BranchId == restaurantId)
            .OrderByDescending(t => t.CreatedAt)
            .Take(50)
            .Select(t => new CashTransactionDto
            {
                Id = t.Id,
                CashRegisterId = t.CashRegisterId,
                Type = t.Type,
                Amount = t.Amount,
                UserId = t.UserId,
                RelatedCashRegisterId = t.RelatedCashRegisterId,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Result<List<CashTransactionDto>>.Success(transactions);
    }
}
