using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetAllCashRegister;

public class GetAllCashRegisterHandler : IRequestHandler<GetAllCashRegisterQuery, Result<List<CashRegisterDto>>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetAllCashRegisterHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result<List<CashRegisterDto>>> Handle(GetAllCashRegisterQuery request, CancellationToken cancellationToken)
    {
        Guid restaurantId = _currentUser.BranchId;
        if(restaurantId == Guid.Empty) return Result<List<CashRegisterDto>>.Failure("ID değeri 0 veya negatif olamaz.");

        var entities = await _uow.CashRegister.GetAllAsync(c => c.BranchId == restaurantId);
        return Result<List<CashRegisterDto>>.Success(entities.OrderBy(r => r.Name).Select(r => r.ToDto()).ToList());
    }
}
