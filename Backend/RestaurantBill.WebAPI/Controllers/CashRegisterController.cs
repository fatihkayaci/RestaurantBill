using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RestaurantBill.Application.Features.CashRegisters.Commands.AddTransactionToCashRegister;
using RestaurantBill.Application.Features.CashRegisters.Commands.CreateCashRegister;
using RestaurantBill.Application.Features.CashRegisters.Commands.DeleteCashRegister;
using RestaurantBill.Application.Features.CashRegisters.Commands.TransferBetweenCashRegisters;
using RestaurantBill.Application.Features.CashRegisters.Commands.UpdateCashRegister;
using RestaurantBill.Application.Features.CashRegisters.Queries.GetAllCashRegister;
using RestaurantBill.Application.Features.CashRegisters.Queries.GetCashRegisterById;
using RestaurantBill.Application.Features.CashRegisters.Queries.GetCashTransactions;

namespace RestaurantBill.WebAPI.Controllers;

[Authorize]
[Route("api/[controller]")]
[ApiController]
public class CashRegisterController : BaseController
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
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var query = new GetAllCashRegisterQuery();
        var values = await _mediator.Send(query);
        return HandleResult(values);
    }

    /// <summary>
    /// Returns a cash register by its ID.
    /// </summary>
    /// <param name="id">CashRegisterId</param>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById([FromRoute] int id)
    {
        var query = new GetCashRegisterByIdQuery
        {
            CashRegisterId = id
        };
        var register = await _mediator.Send(query);
        return HandleResult(register);
    }
    /// <summary>
    /// Returns the last 50 cash transactions ordered by date.
    /// </summary>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpGet("transactions")]
    public async Task<IActionResult> GetTransactions(CancellationToken cancellationToken)
    {
        var query = new GetCashTransactionsQuery();
        var result = await _mediator.Send(query, cancellationToken);
        return HandleResult(result);
    }
    #endregion

    #region post methods
    /// <summary>
    /// Creates a new cash register. Only accessible by Admin.
    /// </summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpPost("create")]
    public async Task<IActionResult> Create([FromBody] CreateCashRegisterCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Updates an existing cash register. Only accessible by Admin.
    /// </summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody] UpdateCashRegisterCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Adds a money in/out transaction to a cash register and updates its balance.
    /// </summary>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpPost("transaction")]
    public async Task<IActionResult> AddTransaction([FromBody] AddTransactionToCashRegisterCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }

    /// <summary>
    /// Transfers a given amount from one cash register to another.
    /// </summary>
    [Authorize(Roles = "Owner,Admin,Cashier")]
    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer([FromBody] TransferBetweenCashRegistersCommand command, CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
    #endregion

    #region delete methods
    /// <summary>
    /// Deletes a cash register by its ID. Only accessible by Admin.
    /// </summary>
    [Authorize(Roles = "Owner,Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete([FromRoute] int id, CancellationToken cancellationToken)
    {
        var command = new DeleteCashRegisterCommand
        {
            CashRegisterId = id
        };
        var result = await _mediator.Send(command, cancellationToken);
        return HandleResult(result);
    }
    #endregion
}
