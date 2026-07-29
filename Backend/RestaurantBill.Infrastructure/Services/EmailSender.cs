using Microsoft.Extensions.Logging;
using RestaurantBill.Application.Interfaces;

namespace RestaurantBill.Infrastructure.Services
{
    public class EmailSender : IEmailSender
    {
        private readonly ILogger<EmailSender> _logger;

        public EmailSender(ILogger<EmailSender> logger)
        {
            _logger = logger;
        }

        public Task SendAsync(string email, string subject, string body)
        {
            _logger.LogInformation("Email sent to {Email}, subject: {Subject}, body: {Body}", email, subject, body);
            return Task.CompletedTask;
        }
    }
}
