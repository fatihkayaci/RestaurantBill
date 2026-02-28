using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.DTOs;
using AutoMapper;
using RestaurantBill.Domain.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Application.Exceptions;
using RestaurantBill.Application.Common;

namespace RestaurantBill.Application.Services;

public class TableService : ITableService
{
    private readonly IMapper _mapper;
    private readonly IUnitOfWork _uow;
    
    public TableService(IMapper mapper, IUnitOfWork uow)
    {
        _mapper = mapper;
        _uow = uow;
    }
    public async Task CreateAsync(CreateTableDto dto, CancellationToken cancellationToken)
    {
        var table = _mapper.Map<Table>(dto);
        await _uow.Table.AddAsync(table);
        await _uow.SaveChangesAsync(cancellationToken);
    }

    public async Task DeleteAsync(int id, CancellationToken cancellationToken)
    {
        if (id <= 0) throw new BusinessException("Masa ID değeri 0 veya negatif olamaz.");
        var table = await _uow.Table.GetByIdAsync(id);
        Guard.AgainstNull(table, "Böyle bir masa bulunamadı.");
        _uow.Table.Delete(table);
        await _uow.SaveChangesAsync(cancellationToken);
    }

    public async Task<List<TableDto>> GetAllAsync()
    {
        var entities = await _uow.Table.GetAllAsync();
        return _mapper.Map<List<TableDto>>(entities);
    }

    public async Task<TableDto> GetByIdAsync(int id)
    {
        if(id <= 0) throw new BusinessException("Masa ID değeri 0 veya negatif olamaz.");
        var table = await _uow.Table.GetByIdAsync(id);
        Guard.AgainstNull(table, "Böyle bir masa bulunamadı");
        return _mapper.Map<TableDto>(table);
    }

    public async Task UpdateAsync(UpdateTableDto dto, CancellationToken cancellationToken)
    {
        if (dto == null)
            throw new BusinessException("Güncellenecek veri boş olamaz.");

        if (dto.Id <= 0)
            throw new BusinessException("id 0 dan küçük veya eşit olamaz");

        var table = await _uow.Table.GetByIdAsync(dto.Id, true);
        Guard.AgainstNull(table, "Böyle bir masa bulunamadı.");

        _mapper.Map(dto, table);
        await _uow.SaveChangesAsync(cancellationToken);
    }
}