using MediatR;
using RestaurantBill.Application.DTOs.Reports;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Reports.Queries.GetTaxReport;

public class GetTaxReportQuery : IRequest<Result<TaxReportDto>>
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    public Guid? BranchId { get; set; }
}
