using MediatR;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.UpdateBranch
{
    public class UpdateBranchCommandHandler : IRequestHandler<UpdateBranchCommand, Result>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public UpdateBranchCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result> Handle(UpdateBranchCommand request, CancellationToken cancellationToken)
        {
            Branch? branch = await _uow.Branch.GetByIdAsync(request.RestaurantId, true, b => b.Company);
            if (branch is null || branch.Company.OwnerUserId != _currentUser.UserId)
                return Result.Failure("Şube bulunamadı.");

            branch.Update(request.Name, branch.ManagerName, request.PhoneNumber, request.Email, request.City, request.District, branch.OpenAddress);

            await _uow.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
    }
}
