using RestaurantBill.Application.Features.Auths.Commands.VerifyCode;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.Auths;

public class VerifyCodeCommandHandlerTests
{
    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private static User CreateUserWithId(string fullName = "Fatih", string email = "f@mail.com", string phone = "05001234567")
    {
        User user = User.Create(fullName, email, phone);
        SetId(user, Guid.NewGuid());
        return user;
    }

    private static VerifyCodeCommandHandler CreateHandler(FakeUnitOfWork uow)
        => new(uow, new FakeJwtTokenGenerator());

    [Fact]
    public async Task Handle_WrongCode_IncrementsAttemptAndReturnsFailure()
    {
        var uow = new FakeUnitOfWork();
        User user = CreateUserWithId();
        await uow.UserRepo.AddAsync(user);

        VerificationCode code = VerificationCode.Create(user.Id, "111111", VerificationCodeType.Phone, DateTime.UtcNow.AddMinutes(5));
        await uow.VerificationCodeRepo.AddAsync(code);

        var handler = CreateHandler(uow);
        var result = await handler.Handle(new VerifyCodeCommand { UserId = user.Id, Code = "999999", Type = VerificationCodeType.Phone }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(1, code.Attempts);
        Assert.Equal(VerificationCodeStatus.Pending, code.Status);
    }

    [Fact]
    public async Task Handle_ExpiredCode_MarksExpiredAndReturnsFailure()
    {
        var uow = new FakeUnitOfWork();
        User user = CreateUserWithId();
        await uow.UserRepo.AddAsync(user);

        VerificationCode code = VerificationCode.Create(user.Id, "111111", VerificationCodeType.Phone, DateTime.UtcNow.AddMinutes(-1));
        await uow.VerificationCodeRepo.AddAsync(code);

        var handler = CreateHandler(uow);
        var result = await handler.Handle(new VerifyCodeCommand { UserId = user.Id, Code = "111111", Type = VerificationCodeType.Phone }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(VerificationCodeStatus.Expired, code.Status);
    }

    [Fact]
    public async Task Handle_FifthWrongAttempt_MarksFailedAndReturnsFailure()
    {
        var uow = new FakeUnitOfWork();
        User user = CreateUserWithId();
        await uow.UserRepo.AddAsync(user);

        VerificationCode code = VerificationCode.Create(user.Id, "111111", VerificationCodeType.Phone, DateTime.UtcNow.AddMinutes(5));
        code.IncrementAttempt();
        code.IncrementAttempt();
        code.IncrementAttempt();
        code.IncrementAttempt();
        await uow.VerificationCodeRepo.AddAsync(code);

        var handler = CreateHandler(uow);
        var result = await handler.Handle(new VerifyCodeCommand { UserId = user.Id, Code = "999999", Type = VerificationCodeType.Phone }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(5, code.Attempts);
        Assert.Equal(VerificationCodeStatus.Failed, code.Status);
    }

    [Fact]
    public async Task Handle_PendingCodeOfDifferentType_ReturnsFailure()
    {
        var uow = new FakeUnitOfWork();
        User user = CreateUserWithId();
        await uow.UserRepo.AddAsync(user);

        VerificationCode emailCode = VerificationCode.Create(user.Id, "111111", VerificationCodeType.Email, DateTime.UtcNow.AddMinutes(5));
        await uow.VerificationCodeRepo.AddAsync(emailCode);

        var handler = CreateHandler(uow);
        var result = await handler.Handle(new VerifyCodeCommand { UserId = user.Id, Code = "111111", Type = VerificationCodeType.Phone }, CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.Equal(VerificationCodeStatus.Pending, emailCode.Status);
    }

    [Fact]
    public async Task Handle_PhoneHappyPath_VerifiesUserAndReturnsToken()
    {
        var uow = new FakeUnitOfWork();
        User user = CreateUserWithId();
        await uow.UserRepo.AddAsync(user);

        Company company = Company.Create("Test Restoran", user);
        await uow.CompanyRepo.AddAsync(company);

        VerificationCode code = VerificationCode.Create(user.Id, "111111", VerificationCodeType.Phone, DateTime.UtcNow.AddMinutes(5));
        await uow.VerificationCodeRepo.AddAsync(code);

        var handler = CreateHandler(uow);
        var result = await handler.Handle(new VerifyCodeCommand { UserId = user.Id, Code = "111111", Type = VerificationCodeType.Phone }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.False(string.IsNullOrEmpty(result.Value!.Token));
        Assert.True(result.Value!.NeedsSlugSetup);
        Assert.True(user.IsPhoneVerified);
        Assert.Equal(VerificationCodeStatus.Verified, code.Status);
    }

    [Fact]
    public async Task Handle_EmailHappyPath_VerifiesUserWithoutReturningToken()
    {
        var uow = new FakeUnitOfWork();
        User user = CreateUserWithId();
        await uow.UserRepo.AddAsync(user);

        VerificationCode code = VerificationCode.Create(user.Id, "111111", VerificationCodeType.Email, DateTime.UtcNow.AddMinutes(5));
        await uow.VerificationCodeRepo.AddAsync(code);

        var handler = CreateHandler(uow);
        var result = await handler.Handle(new VerifyCodeCommand { UserId = user.Id, Code = "111111", Type = VerificationCodeType.Email }, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Null(result.Value!.Token);
        Assert.True(user.IsEmailVerified);
        Assert.Equal(VerificationCodeStatus.Verified, code.Status);
    }
}
