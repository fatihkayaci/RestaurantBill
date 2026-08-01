using FluentValidation;
namespace RestaurantBill.Application.Features.Users.Commands.DeleteUser;

public class DeleteUserCommandValidator : AbstractValidator<DeleteUserCommand>
{
    public DeleteUserCommandValidator()
    {
        RuleFor(x => x.UserId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir kullanıcı seçilmelidir.");
    }
}
