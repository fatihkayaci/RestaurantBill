using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Payments.Commands.CreatePayment;

public class CreatePaymentCommand : IRequest<Result<bool>>, IIdempotent
{
    public Guid OrderId { get; set; }
    public Guid CashRegisterId { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public ICollection<PaymentItemDto> Items { get; set; } = new List<PaymentItemDto>();

    public string IdempotencyKey => $"create-payment:{OrderId}";
}
