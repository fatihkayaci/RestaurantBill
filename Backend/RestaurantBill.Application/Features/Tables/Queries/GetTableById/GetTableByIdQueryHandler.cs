using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Features.Tables.Queries.GetTableById
{
    public class GetTableByIdQueryHandler : IRequestHandler<GetTableByIdQuery, TableDto>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public GetTableByIdQueryHandler(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }

        /// <summary>
        /// Returns a single table by its ID.
        /// </summary>
        /// <exception cref="BusinessException">Thrown if the table is not found.</exception>
        public async Task<TableDto> Handle(GetTableByIdQuery request, CancellationToken cancellationToken)
        {
            var table = await _uow.Table.GetByIdAsync(request.TableId, false);
            Guard.AgainstNull(table, "Sipariş bulunamadı.");
            var tableDto = _mapper.Map<TableDto>(table);
            return tableDto;
        }
    }
}