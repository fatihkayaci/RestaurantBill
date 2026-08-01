using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Companies.Commands.UpdateCompany;

public class UpdateCompanyCommandHandler : IRequestHandler<UpdateCompanyCommand, Result<CompanyDto>>
{
    private readonly IUnitOfWork _uow;
    private readonly ICurrentUserService _currentUser;

    public UpdateCompanyCommandHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    {
        _uow = uow;
        _currentUser = currentUser;
    }

    public async Task<Result<CompanyDto>> Handle(UpdateCompanyCommand request, CancellationToken cancellationToken)
    {
        Company? company = (await _uow.Company.GetAllAsync(c => c.OwnerUserId == _currentUser.UserId && !c.IsDeleted, true)).FirstOrDefault();
        if (company is null)
            return Result<CompanyDto>.Failure("Şirket bulunamadı.");

        company.UpdateName(request.Name);
        await _uow.SaveChangesAsync(cancellationToken);

        return Result<CompanyDto>.Success(company.ToDto());
    }
}
