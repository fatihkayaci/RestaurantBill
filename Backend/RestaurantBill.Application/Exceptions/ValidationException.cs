namespace RestaurantBill.Application.Exceptions
{
    public class ValidationException : BaseException
    {
        public ValidationException(string message) : base(message, 400) { }
    }
}