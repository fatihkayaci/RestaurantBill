using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.Payments.Commands.CreatePayment;

namespace RestaurantBill.WebAPI.Controllers;

[Authorize]
[Route("api/payment")]
[ApiController]
public class PaymentController : BaseController
{
    private readonly IMediator _mediator;
    public PaymentController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Closes the order, records the cash register transaction and creates the payment record (matrah/KDV breakdown).
    /// </summary>
    // Garson yalnızca "Hesap al" yetkisi açıksa ödeme alabilir (handler denetler).
    [Authorize(Roles = "Owner,Admin,Cashier,Waiter")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePaymentCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
}
