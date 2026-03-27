using MediatR;

namespace RestaurantBill.Application.Features.Restaurants.Commands.CreateRestaurant
{
    public class CreateRestaurantCommand: IRequest
    {
        
        public string Name { get; set; } = string.Empty;
        public string PhoneNumber { get; set; } = string.Empty;
        public string MobilePhoneNumber { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string District { get; set; } = string.Empty;
    }
}