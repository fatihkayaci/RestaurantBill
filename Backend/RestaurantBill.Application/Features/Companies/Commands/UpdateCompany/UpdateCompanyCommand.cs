using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Companies.Commands.UpdateCompany;

public class UpdateCompanyCommand : IRequest<Result<CompanyDto>>
{
    public string Name { get; set; } = string.Empty;
}
