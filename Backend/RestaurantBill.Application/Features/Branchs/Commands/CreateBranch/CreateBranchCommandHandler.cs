using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
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

            Branch branch = Branch.Create(company.Id, request.Name, request.ManagerName, request.PhoneNumber, request.Email, request.City, request.District, request.OpenAddress, request.TaxRate);
            await _uow.Branch.AddAsync(branch);

            User? actor = await _uow.User.GetByIdAsync(_currentUser.UserId);
            AuditLog log = AuditLog.Create(
                branch.Id,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Info,
                "BranchCreated",
                $"{actor?.FullName} {branch.BranchName} adında yeni bir şube ekledi.",
                nameof(Branch),
                branch.Id);
            await _uow.AuditLog.AddAsync(log);

            await _uow.SaveChangesAsync(cancellationToken);

            return Result<RestaurantDto>.Success(branch.ToDto());
        }
    }
}
