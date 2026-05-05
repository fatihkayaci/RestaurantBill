using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetAll;

public class GetAllCashRegisterQuery : IRequest<List<CashRegisterDto>>
{
}
