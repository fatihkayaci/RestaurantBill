using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.CreateBranch
{
    public class CreateBranchCommandHandler : IRequestHandler<CreateBranchCommand, Result<RestaurantDto>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public CreateBranchCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<RestaurantDto>> Handle(CreateBranchCommand request, CancellationToken cancellationToken)
        {
            Company? company = await _db.Companies
                .FirstOrDefaultAsync(c => c.OwnerUserId == _currentUser.UserId && !c.IsDeleted, cancellationToken);
            if (company is null)
                return Result<RestaurantDto>.Failure("Şirket bulunamadı.");

            Branch branch = Branch.Create(company.Id, request.Name, request.ManagerName, request.PhoneNumber, request.Email, request.City, request.District, request.OpenAddress, request.TaxRate);
            _db.Branches.Add(branch);

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                branch.Id,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Info,
                "BranchCreated",
                $"{actor?.FullName} {branch.BranchName} adında yeni bir şube ekledi.",
                nameof(Branch),
                branch.Id);
            _db.AuditLogs.Add(log);

            await _db.SaveChangesAsync(cancellationToken);

            return Result<RestaurantDto>.Success(branch.ToDto());
        }
    }
}
