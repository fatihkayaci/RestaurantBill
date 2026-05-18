using MediatR;
using Microsoft.AspNetCore.Identity;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;

namespace RestaurantBill.Application.Features.Users.Commands.UpdateUser
{
    public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand>
    {
        private readonly IUnitOfWork _uow;
        private readonly UserManager<User> _userManager;

        public UpdateUserCommandHandler(IUnitOfWork uow, UserManager<User> userManager)
        {
            _uow = uow;
            _userManager = userManager;
        }

        public async Task Handle(UpdateUserCommand request, CancellationToken cancellationToken)
        {
            User user = await _userManager.FindByIdAsync(request.UserId.ToString())
                ?? throw new NotFoundException("Kullanıcı bulunamadı.");

            user.Update(request.FullName, request.UserName, request.Email, request.PhoneNumber, request.UserCode, request.Role);

            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                string resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
                IdentityResult passwordResult = await _userManager.ResetPasswordAsync(user, resetToken, request.Password);
                if (!passwordResult.Succeeded)
                    throw new BusinessException(string.Join(", ", passwordResult.Errors.Select(e => e.Description)));
            }

            IdentityResult result = await _userManager.UpdateAsync(user);
            if (!result.Succeeded)
                throw new BusinessException(string.Join(", ", result.Errors.Select(e => e.Description)));

            await _uow.SaveChangesAsync(cancellationToken);
        }
    }
}
