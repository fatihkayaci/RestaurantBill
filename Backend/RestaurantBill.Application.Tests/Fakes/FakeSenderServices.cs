using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakeSmsSender : ISmsSender
{
    public List<(string PhoneNumber, string Message)> SentMessages { get; } = [];

    public Task SendAsync(string phoneNumber, string message)
    {
        SentMessages.Add((phoneNumber, message));
        return Task.CompletedTask;
    }
}

public class FakeEmailSender : IEmailSender
{
    public List<(string Email, string Subject, string Body)> SentEmails { get; } = [];

    public Task SendAsync(string email, string subject, string body)
    {
        SentEmails.Add((email, subject, body));
        return Task.CompletedTask;
    }
}
