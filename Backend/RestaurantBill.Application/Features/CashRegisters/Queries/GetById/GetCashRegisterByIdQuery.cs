using MediatR;
using RestaurantBill.Application.DTOs;

namespace RestaurantBill.Application.Features.CashRegisters.Queries.GetById;

public class GetCashRegisterByIdQuery : IRequest<CashRegisterDto>
{
    public int CashRegisterId { get; set; }
}
