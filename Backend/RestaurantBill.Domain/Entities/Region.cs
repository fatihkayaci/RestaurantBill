using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities;
public class Region : BaseEntity
{
    public Guid BranchId { get; private set; }
    public Branch Branch { get; private set; } = default!;
    public string Name { get; private set; } = string.Empty;

    protected Region() { }

    public static Region Create(string name, Guid branchId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Bölge adı boş olamaz.");

        if (branchId == Guid.Empty)
            throw new DomainException("Geçersiz şube ID'si.");

        return new Region
        {
            Name = name,
            BranchId = branchId
        };
    }

    public void Rename(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Bölge adı boş olamaz.");

        Name = name;
    }

    public void EnsureCanBeDeleted(IEnumerable<Table> linkedTables)
    {
        if (linkedTables.Any())
            throw new DomainException("Bu bölgeye bağlı masalar bulunmaktadır. Lütfen silmeden önce ilgili masaların bölgesini güncelleyin.");
    }
}
