using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Companies.Queries.GetMyCompany;

public class GetMyCompanyQueryHandler : IRequestHandler<GetMyCompanyQuery, Result<CompanyDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetMyCompanyQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<CompanyDto>> Handle(GetMyCompanyQuery request, CancellationToken cancellationToken)
    {
        Company? company = await _db.Companies
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.OwnerUserId == _currentUser.UserId && !c.IsDeleted, cancellationToken);

        if (company is null)
            return Result<CompanyDto>.Failure("Restoran bulunamadı.");

        return Result<CompanyDto>.Success(company.ToDto());
    }
}
