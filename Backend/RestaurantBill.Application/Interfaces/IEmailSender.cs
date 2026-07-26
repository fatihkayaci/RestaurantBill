namespace RestaurantBill.Application.Interfaces;

public interface IEmailSender
{
    Task SendAsync(string email, string subject, string body);
}
