using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.CashRegisters.Commands.AddTransaction;
using RestaurantBill.Application.Features.CashRegisters.Commands.Create;
using RestaurantBill.Application.Features.CashRegisters.Commands.Delete;
using RestaurantBill.Application.Features.CashRegisters.Commands.Update;
using RestaurantBill.Application.Features.CashRegisters.Queries.GetAll;
using RestaurantBill.Application.Features.CashRegisters.Queries.GetById;

namespace RestaurantBill.WebAPI.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class CashRegisterController : ControllerBase
{
    private readonly IMediator _mediator;
    public CashRegisterController(IMediator mediator)
    {
        _mediator = mediator;
    }

    #region get methods
    /// <summary>
    /// Returns all cash registers.
    /// </summary>
    [Authorize(Roles = "Admin,Cashier")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var query = new GetAllCashRegisterQuery();
        var values = await _mediator.Send(query);
        return Ok(values);
    }

    /// <summary>
    /// Returns a cash register by its ID.
    /// </summary>
    /// <param name="id">CashRegisterId</param>
    [Authorize(Roles = "Admin,Cashier")]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById([FromRoute] int id)
    {
        var query = new GetCashRegisterByIdQuery
        {
            CashRegisterId = id
        };
        var register = await _mediator.Send(query);
        return Ok(register);
    }
    #endregion

    #region post methods
    /// <summary>
    /// Creates a new cash register. Only accessible by Admin.
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] CreateCashRegisterCommand command, CancellationToken cancellationToken)
    {
        await _mediator.Send(command, cancellationToken);
        return Ok("Kasa başarıyla oluşturuldu");
    }

    /// <summary>
    /// Updates an existing cash register. Only accessible by Admin.
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateCashRegisterCommand command, CancellationToken cancellationToken)
    {
        await _mediator.Send(command, cancellationToken);
        return Ok("Kasa başarıyla güncellendi");
    }

    /// <summary>
    /// Adds a money in/out transaction to a cash register and updates its balance.
    /// </summary>
    [Authorize(Roles = "Admin,Cashier")]
    [HttpPost("transaction")]
    public async Task<IActionResult> AddTransaction([FromBody] AddCashTransactionCommand command, CancellationToken cancellationToken)
    {
        await _mediator.Send(command, cancellationToken);
        return Ok(new { Message = "İşlem başarıyla kaydedildi." });
    }
    #endregion

    #region delete methods
    /// <summary>
    /// Deletes a cash register by its ID. Only accessible by Admin.
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken cancellationToken)
    {
        var command = new DeleteCashRegisterCommand
        {
            CashRegisterId = id
        };
        await _mediator.Send(command, cancellationToken);
        return Ok(new { message = "Kasa başarıyla silindi" });
    }
    #endregion
}
