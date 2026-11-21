using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Tables.Commands.BulkCreateTables
{
    public class BulkCreateTablesCommandHandler : IRequestHandler<BulkCreateTablesCommand, Result<BulkCreateTablesResultDto>>
    {
        private readonly IAppDbContext _db;
        private readonly ICurrentUserService _currentUser;

        public BulkCreateTablesCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
        {
            _db = db;
            _currentUser = currentUser;
        }

        public async Task<Result<BulkCreateTablesResultDto>> Handle(BulkCreateTablesCommand request, CancellationToken cancellationToken)
        {
            Guid restaurantId = _currentUser.BranchId;

            string? regionName = await _db.Regions
                .Where(r => r.Id == request.RegionId && r.BranchId == restaurantId)
                .Select(r => r.Name)
                .FirstOrDefaultAsync(cancellationToken);
            if (regionName is null)
                return Result<BulkCreateTablesResultDto>.Failure("Böyle bir bölge bulunamadı.");

            List<string> names = request.BuildNames().ToList();

            // Tekli eklemedeki kural: aynı bölgede aynı isimde ikinci masa olmaz. Var olanlar atlanır.
            HashSet<string> existingNames = (await _db.Tables
                .Where(t => t.RegionId == request.RegionId && names.Contains(t.Name))
                .Select(t => t.Name)
                .ToListAsync(cancellationToken))
                .ToHashSet();

            var result = new BulkCreateTablesResultDto
            {
                CreatedNames = names.Where(n => !existingNames.Contains(n)).ToList(),
                SkippedNames = names.Where(existingNames.Contains).ToList(),
            };
            if (result.CreatedNames.Count == 0)
                return Result<BulkCreateTablesResultDto>.Failure("Bu isimlerin hepsi bu bölgede zaten mevcut.");

            // Yeni masalar bölgenin sonuna, verilen numara sırasıyla eklenir.
            int nextSortOrder = await TableSortOrder.EndOfRegionAsync(_db, request.RegionId, cancellationToken);
            foreach (string name in result.CreatedNames)
            {
                Table table = Table.Create(name, string.Empty, request.RegionId);
                table.SetSortOrder(nextSortOrder++);
                _db.Tables.Add(table);
            }

            User? actor = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
            AuditLog log = AuditLog.Create(
                restaurantId,
                actor?.FullName ?? string.Empty,
                AuditLogCategory.System,
                AuditLogSeverity.Info,
                "TablesBulkCreated",
                $"{actor?.FullName} {regionName} bölgesine {result.CreatedNames.Count} masa ekledi ({result.CreatedNames[0]} – {result.CreatedNames[^1]}).",
                nameof(Region),
                request.RegionId);
            _db.AuditLogs.Add(log);

            // Tek SaveChanges tek transaction'dır: masaların hepsi eklenir ya da hiçbiri eklenmez.
            await _db.SaveChangesAsync(cancellationToken);
            return Result<BulkCreateTablesResultDto>.Success(result);
        }
    }
}
