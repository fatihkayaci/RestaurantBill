using MediatR;

namespace RestaurantBill.Application.Features.Tables.Commands.CreateTable
{
    public class CreateTableCommand : IRequest
    {
        public string Name { get; set; } = string.Empty;
    }
}