using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Restaurants.Commands.CreateBranch
{
    public class CreateBranchCommand : IRequest<Result<RestaurantDto>>
    {
        public required string Name { get; set; }
        public string ManagerName { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
        public string OpenAddress { get; set; } = string.Empty;
        public decimal TaxRate { get; set; }
    }
}
