using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetAllCashRegister;

public class GetAllCashRegisterQuery : IRequest<List<CashRegisterDto>>
{
}
