using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetAllCashRegister;

public class GetAllCashRegisterQuery : IRequest<Result<List<CashRegisterDto>>>
{
}
