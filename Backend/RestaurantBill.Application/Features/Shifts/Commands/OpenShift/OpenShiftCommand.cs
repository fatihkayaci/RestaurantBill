using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Shifts.Commands.OpenShift;

public class OpenShiftCommand : IRequest<Result<ShiftDto>>
{
    public Guid CashRegisterId { get; set; }
    // Sadece kasanın önceki vardiyası sayılmadan kapandıysa gerekir.
    public decimal? CountedBalance { get; set; }
    // Admin/Owner bir kasiyer adına vardiya açar: kasiyer girişte kapı görmeden kasasına düşer.
    // Boşsa vardiya isteği yapanın adına açılır.
    public Guid? ForUserId { get; set; }
}
