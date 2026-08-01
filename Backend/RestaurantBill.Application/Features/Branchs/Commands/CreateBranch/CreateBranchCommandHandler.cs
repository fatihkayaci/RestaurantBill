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
            User? owner = await _uow.User.GetByIdAsync(_currentUser.UserId, true);
            if (owner is null)
                return Result<RestaurantDto>.Failure("Kullanıcı bulunamadı.");

            Company company = Company.Create(request.Name, owner.Id);
            await _uow.Company.AddAsync(company);
            await _uow.SaveChangesAsync(cancellationToken);

            return Result<RestaurantDto>.Success(new RestaurantDto
            {
                Id = company.Id,
                Name = company.Name,
                Slug = company.Slug
            });
        }
    }
}
