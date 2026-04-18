namespace RestaurantBill.Application.Interfaces;
public interface IIdempotent
{
    string IdempotencyKey { get; }
}