using MediatR;

namespace RestaurantBill.Application.Features.Tables.Commands.Update
{
    public class UpdateCommand : IRequest
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }
}