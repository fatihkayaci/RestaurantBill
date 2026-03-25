using MediatR;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Application.DTOs;
namespace RestaurantBill.Application.Features.Tables.Queries.GetAll
{
    public class GetAllTableQueryHandler : IRequestHandler<GetAllTableQuery, List<TableDto>>
    {
        private readonly IUnitOfWork _uow;
        private readonly IMapper _mapper;

        public GetAllTableQueryHandler(IUnitOfWork uow, IMapper mapper)
        {
            _uow = uow;
            _mapper = mapper;
        }

        /// <summary>
        /// Returns all tables.
        /// </summary>
        public async Task<List<TableDto>> Handle(GetAllTableQuery request, CancellationToken cancellationToken)
        {
            var entities = await _uow.Table.GetAllAsync();
            
            return _mapper.Map<List<TableDto>>(entities);
        }
    }
}