using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Companies.Queries.GetMyCompany;

public class GetMyCompanyQueryHandler : IRequestHandler<GetMyCompanyQuery, Result<CompanyDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public GetMyCompanyQueryHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result<CompanyDto>> Handle(GetMyCompanyQuery request, CancellationToken cancellationToken)
    {
        Company? company = (await _uow.Company.GetAllAsync(c => c.OwnerUserId == _currentUser.UserId && !c.IsDeleted, false)).FirstOrDefault();

        if (company is null)
            return Result<CompanyDto>.Failure("Restoran bulunamadı.");

        return Result<CompanyDto>.Success(company.ToDto());
    }
}
