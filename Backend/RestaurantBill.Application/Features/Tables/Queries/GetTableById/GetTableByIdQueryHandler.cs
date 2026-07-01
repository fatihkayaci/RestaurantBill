using MediatR;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Mappings;

namespace RestaurantBill.Application.Features.Tables.Queries.GetTableById
{
    public class GetTableByIdQueryHandler : IRequestHandler<GetTableByIdQuery, TableDto>
    {
        private readonly IUnitOfWork _uow;

        public GetTableByIdQueryHandler(IUnitOfWork uow)
        {
            _uow = uow;
        }

        /// <summary>
        /// Returns a single table by its ID.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if the table is not found.</exception>
        public async Task<TableDto> Handle(GetTableByIdQuery request, CancellationToken cancellationToken)
        {
            var table = await _uow.Table.GetByIdAsync(request.TableId, false);
            Guard.AgainstNull(table, "Sipariş bulunamadı.");
            return table!.ToDto();
        }
    }
}