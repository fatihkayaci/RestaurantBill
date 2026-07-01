using Microsoft.AspNetCore.Identity;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Tests.Fakes;

public class FakePasswordHasher : IPasswordHasher<User>
{
    public string HashPassword(User user, string password) => $"hashed_{password}";

    public PasswordVerificationResult VerifyHashedPassword(User user, string hashedPassword, string providedPassword)
        => hashedPassword == $"hashed_{providedPassword}"
            ? PasswordVerificationResult.Success
            : PasswordVerificationResult.Failed;
}
