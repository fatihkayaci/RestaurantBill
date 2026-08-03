using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Companies.Queries.GetMyCompany;

public class GetMyCompanyQuery : IRequest<Result<CompanyDto>>
{
}
