using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities;
public class Category : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public int RestaurantId { get; private set; }

    protected Category() { }

    public static Category Create(string name, int restaurantId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Kategori adı boş olamaz.");

        if (restaurantId <= 0)
            throw new DomainException("Geçersiz restoran ID'si.");

        return new Category
        {
            Name = name,
            RestaurantId = restaurantId
        };
    }

    public void Rename(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Kategori adı boş olamaz.");

        Name = name;
    }

    public void EnsureCanBeDeleted(IEnumerable<Product> linkedProducts)
    {
        if (linkedProducts.Any())
            throw new DomainException("Bu kategoriye bağlı ürünler bulunmaktadır. Lütfen silmeden önce ilgili ürünlerin kategorisini güncelleyin.");
    }
}