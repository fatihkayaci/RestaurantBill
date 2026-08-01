using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.CreateBranch
{
    public class CreateBranchCommandHandler : IRequestHandler<CreateBranchCommand, Result<RestaurantDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly ICurrentUserService _currentUser;

        public CreateBranchCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
        {
            _uow = uow;
            _currentUser = currentUser;
        }

        public async Task<Result<RestaurantDto>> Handle(CreateBranchCommand request, CancellationToken cancellationToken)
        {
            Company? company = (await _uow.Company.GetAllAsync(c => c.OwnerUserId == _currentUser.UserId && !c.IsDeleted, false)).FirstOrDefault();
            if (company is null)
                return Result<RestaurantDto>.Failure("Şirket bulunamadı.");

            Branch branch = Branch.Create(company.Id, request.Name, request.ManagerName, request.PhoneNumber, request.Email, request.City, request.District, request.OpenAddress);
            await _uow.Branch.AddAsync(branch);
            await _uow.SaveChangesAsync(cancellationToken);

            return Result<RestaurantDto>.Success(branch.ToDto());
        }
    }
}
