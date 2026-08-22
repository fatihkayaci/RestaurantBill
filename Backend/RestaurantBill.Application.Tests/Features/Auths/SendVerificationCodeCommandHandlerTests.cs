using RestaurantBill.Application.Features.Auths.Commands.SendVerificationCode;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Auths;

public class SendVerificationCodeCommandHandlerTests : ApplicationTestBase
{
    private static void SetCreatedAt(BaseEntity entity, DateTime createdAt)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.CreatedAt))!.SetValue(entity, createdAt);

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private SendVerificationCodeCommandHandler CreateHandler()
        => new(Db, new FakeSmsSender(), new FakeEmailSender());

    [Fact]
    public async Task Handle_SecondRequestWithinSixtySeconds_ReturnsFailure()
    {
        User user = User.Create("Fatih", "", "05001234567");
        SetId(user, Guid.NewGuid());
        DbContext.Users.Add(user);

        VerificationCode existingCode = VerificationCode.Create(user.Id, "111111", VerificationCodeType.Phone, DateTime.UtcNow.AddMinutes(5));
        DbContext.VerificationCodes.Add(existingCode);
        await DbContext.SaveChangesAsync();

        var handler = CreateHandler();
        var result = await handler.Handle(new SendVerificationCodeCommand { UserId = user.Id, Type = VerificationCodeType.Phone }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains("saniye", result.Error);
    }

    [Fact]
    public async Task Handle_TypeAlreadyVerified_ReturnsFailure()
    {
        User user = User.Create("Fatih", "", "05001234567");
        SetId(user, Guid.NewGuid());
        user.MarkPhoneVerified();
        DbContext.Users.Add(user);
        await DbContext.SaveChangesAsync();

        var handler = CreateHandler();
        var result = await handler.Handle(new SendVerificationCodeCommand { UserId = user.Id, Type = VerificationCodeType.Phone }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains("doğrulanmış", result.Error);
    }

    [Fact]
    public async Task Handle_WithOldPendingCodeOfSameType_MarksItExpiredAndCreatesNewCode()
    {
        User user = User.Create("Fatih", "", "05001234567");
        SetId(user, Guid.NewGuid());
        DbContext.Users.Add(user);

        VerificationCode oldCode = VerificationCode.Create(user.Id, "111111", VerificationCodeType.Phone, DateTime.UtcNow.AddMinutes(5));
        DbContext.VerificationCodes.Add(oldCode);
        await DbContext.SaveChangesAsync();
        SetCreatedAt(oldCode, DateTime.UtcNow.AddMinutes(-2));

        var handler = CreateHandler();
        var result = await handler.Handle(new SendVerificationCodeCommand { UserId = user.Id, Type = VerificationCodeType.Phone }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(VerificationCodeStatus.Expired, oldCode.Status);

        List<VerificationCode> codes = DbContext.VerificationCodes.ToList();
        Assert.Equal(2, codes.Count);
        VerificationCode newCode = Assert.Single(codes, c => c.Id != oldCode.Id);
        Assert.Equal(VerificationCodeStatus.Pending, newCode.Status);
    }

    [Fact]
    public async Task Handle_PendingCodeOfDifferentType_IsNotAffected()
    {
        User user = User.Create("Fatih", "f@mail.com", "05001234567");
        SetId(user, Guid.NewGuid());
        DbContext.Users.Add(user);

        VerificationCode emailCode = VerificationCode.Create(user.Id, "222222", VerificationCodeType.Email, DateTime.UtcNow.AddMinutes(5));
        DbContext.VerificationCodes.Add(emailCode);
        await DbContext.SaveChangesAsync();

        var handler = CreateHandler();
        var result = await handler.Handle(new SendVerificationCodeCommand { UserId = user.Id, Type = VerificationCodeType.Phone }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(VerificationCodeStatus.Pending, emailCode.Status);
    }
}
