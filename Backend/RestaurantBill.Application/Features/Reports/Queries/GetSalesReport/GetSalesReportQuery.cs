using MediatR;
using RestaurantBill.Application.DTOs.Reports;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Reports.Queries.GetSalesReport;

public class GetSalesReportQuery : IRequest<Result<SalesReportDto>>
{
    public DateOnly From { get; set; }
    public DateOnly To { get; set; }
    public Guid? BranchId { get; set; }
}
