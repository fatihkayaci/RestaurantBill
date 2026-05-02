using FluentValidation;
using RestaurantBill.Application.Features.Users.Commands.DeleteUser;

namespace RestaurantBill.Application.Validators.User;

public class DeleteUserCommandValidator : AbstractValidator<DeleteUserCommand>
{
    public DeleteUserCommandValidator()
    {
        RuleFor(x => x.UserId)
            .GreaterThan(0).WithMessage("Geçerli bir kullanıcı seçilmelidir.");
    }
}
