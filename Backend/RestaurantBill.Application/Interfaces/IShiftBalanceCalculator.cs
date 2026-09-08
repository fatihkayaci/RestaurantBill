using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Interfaces;

public interface IShiftBalanceCalculator
{
    Task<decimal> CalculateExpectedClosingBalanceAsync(Shift shift, CancellationToken cancellationToken);
}
