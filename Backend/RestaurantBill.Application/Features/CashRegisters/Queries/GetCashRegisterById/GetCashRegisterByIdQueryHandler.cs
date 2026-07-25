using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetCashRegisterById;

public class GetCashRegisterByIdHandler : IRequestHandler<GetCashRegisterByIdQuery, Result<CashRegisterDto>>
{
    private readonly IUnitOfWork _uow;

    public GetCashRegisterByIdHandler(IUnitOfWork uow)
    {
        _uow = uow;
    }

    public async Task<Result<CashRegisterDto>> Handle(GetCashRegisterByIdQuery request, CancellationToken cancellationToken)
    {
        var register = await _uow.CashRegister.GetByIdAsync(request.CashRegisterId, false);
        if (register is null) return Result<CashRegisterDto>.Failure("Kasa bulunamadı");

        return Result<CashRegisterDto>.Success(register.ToDto());
    }
}
