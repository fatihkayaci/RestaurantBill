using MediatR;
using Microsoft.AspNetCore.Http;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Interfaces;
using System.Security.Claims;

namespace RestaurantBill.Application.Features.CashRegisters.Commands.AddTransaction;

public class AddCashTransactionHandler : IRequestHandler<AddCashTransactionCommand>
{
    private readonly IUnitOfWork _uow;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public AddCashTransactionHandler(IUnitOfWork uow, IHttpContextAccessor httpContextAccessor)
    {
        _uow = uow;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task Handle(AddCashTransactionCommand request, CancellationToken cancellationToken)
    {
        var register = await _uow.CashRegister.GetByIdAsync(request.CashRegisterId, true);
        Guard.AgainstNull(register, "Kasa bulunamadı.");

        if (register!.Status != CashRegisterStatus.Open)
            throw new BusinessException("Kapalı bir kasaya işlem eklenemez.");

        if (request.Type == CashTransactionType.Out && register.Balance < request.Amount)
            throw new BusinessException("Kasa bakiyesi bu çıkışı karşılamak için yetersiz.");

        int userId = int.Parse(
            _httpContextAccessor.HttpContext!.User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

        CashTransaction transaction = new CashTransaction
        {
            CashRegisterId = request.CashRegisterId,
            Type = request.Type,
            Amount = request.Amount,
            UserId = userId
        };

        register.Balance += request.Type == CashTransactionType.In
            ? request.Amount
            : -request.Amount;

        await _uow.CashTransaction.AddAsync(transaction);
        await _uow.CashRegister.UpdateAsync(register);
        await _uow.SaveChangesAsync(cancellationToken);
    }
}
