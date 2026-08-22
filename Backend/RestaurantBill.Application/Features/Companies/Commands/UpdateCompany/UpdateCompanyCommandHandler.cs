using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Companies.Commands.UpdateCompany;

public class UpdateCompanyCommandHandler : IRequestHandler<UpdateCompanyCommand, Result<CompanyDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public UpdateCompanyCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<CompanyDto>> Handle(UpdateCompanyCommand request, CancellationToken cancellationToken)
    {
        Company? company = await _db.Companies
            .FirstOrDefaultAsync(c => c.OwnerUserId == _currentUser.UserId && !c.IsDeleted, cancellationToken);
        if (company is null)
            return Result<CompanyDto>.Failure("Şirket bulunamadı.");

        company.UpdateName(request.Name);
        await _db.SaveChangesAsync(cancellationToken);

        return Result<CompanyDto>.Success(company.ToDto());
    }
}
