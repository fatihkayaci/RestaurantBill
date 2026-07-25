using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetCashRegisterById;

public class GetCashRegisterByIdQuery : IRequest<Result<CashRegisterDto>>
{
    public int CashRegisterId { get; set; }
}
