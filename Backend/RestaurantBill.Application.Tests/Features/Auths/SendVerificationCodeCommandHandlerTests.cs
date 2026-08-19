using RestaurantBill.Application.Features.Auths.Commands.SendVerificationCode;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Auths;

public class SendVerificationCodeCommandHandlerTests
{
    private static void SetCreatedAt(BaseEntity entity, DateTime createdAt)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.CreatedAt))!.SetValue(entity, createdAt);

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private static SendVerificationCodeCommandHandler CreateHandler(FakeUnitOfWork uow)
        => new(uow, new FakeSmsSender(), new FakeEmailSender());

    [Fact]
    public async Task Handle_SecondRequestWithinSixtySeconds_ReturnsFailure()
    {
        var uow = new FakeUnitOfWork();
        User user = User.Create("Fatih", "", "05001234567");
        SetId(user, Guid.NewGuid());
        await uow.UserRepo.AddAsync(user);

        VerificationCode existingCode = VerificationCode.Create(user.Id, "111111", VerificationCodeType.Phone, DateTime.UtcNow.AddMinutes(5));
        await uow.VerificationCodeRepo.AddAsync(existingCode);

        var handler = CreateHandler(uow);
        var result = await handler.Handle(new SendVerificationCodeCommand { UserId = user.Id, Type = VerificationCodeType.Phone }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains("saniye", result.Error);
    }

    [Fact]
    public async Task Handle_TypeAlreadyVerified_ReturnsFailure()
    {
        var uow = new FakeUnitOfWork();
        User user = User.Create("Fatih", "", "05001234567");
        SetId(user, Guid.NewGuid());
        user.MarkPhoneVerified();
        await uow.UserRepo.AddAsync(user);

        var handler = CreateHandler(uow);
        var result = await handler.Handle(new SendVerificationCodeCommand { UserId = user.Id, Type = VerificationCodeType.Phone }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Contains("doğrulanmış", result.Error); 
    }

    [Fact]
    public async Task Handle_WithOldPendingCodeOfSameType_MarksItExpiredAndCreatesNewCode()
    {
        var uow = new FakeUnitOfWork();
        User user = User.Create("Fatih", "", "05001234567");
        SetId(user, Guid.NewGuid());
        await uow.UserRepo.AddAsync(user);

        VerificationCode oldCode = VerificationCode.Create(user.Id, "111111", VerificationCodeType.Phone, DateTime.UtcNow.AddMinutes(5));
        SetCreatedAt(oldCode, DateTime.UtcNow.AddMinutes(-2));
        await uow.VerificationCodeRepo.AddAsync(oldCode);

        var handler = CreateHandler(uow);
        var result = await handler.Handle(new SendVerificationCodeCommand { UserId = user.Id, Type = VerificationCodeType.Phone }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(VerificationCodeStatus.Expired, oldCode.Status);
        Assert.Equal(2, uow.VerificationCodeRepo.Added.Count);
        Assert.Equal(VerificationCodeStatus.Pending, uow.VerificationCodeRepo.Added[1].Status);
    }

    [Fact]
    public async Task Handle_PendingCodeOfDifferentType_IsNotAffected()
    {
        var uow = new FakeUnitOfWork();
        User user = User.Create("Fatih", "f@mail.com", "05001234567");
        SetId(user, Guid.NewGuid());
        await uow.UserRepo.AddAsync(user);

        VerificationCode emailCode = VerificationCode.Create(user.Id, "222222", VerificationCodeType.Email, DateTime.UtcNow.AddMinutes(5));
        await uow.VerificationCodeRepo.AddAsync(emailCode);

        var handler = CreateHandler(uow);
        var result = await handler.Handle(new SendVerificationCodeCommand { UserId = user.Id, Type = VerificationCodeType.Phone }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(VerificationCodeStatus.Pending, emailCode.Status);
    }
}
