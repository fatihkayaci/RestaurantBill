using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities;
public class Region : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public int RestaurantId { get; private set; }
    public Restaurant Restaurant { get; private set; } = default!;

    protected Region() { }

    public static Region Create(string name, int restaurantId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Bölge adı boş olamaz.");

        if (restaurantId <= 0)
            throw new DomainException("Geçersiz restoran ID'si.");

        return new Region
        {
            Name = name,
            RestaurantId = restaurantId
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
