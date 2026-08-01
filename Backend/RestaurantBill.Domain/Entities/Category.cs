using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities;
public class Category : BaseEntity
{
    public Guid BranchId { get; private set; }
    public Branch Branch { get; private set; } = default!;
    public string Name { get; private set; } = string.Empty;

    protected Category() { }

    public static Category Create(string name, Guid branchId)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Kategori adı boş olamaz.");

        if (branchId == Guid.Empty)
            throw new DomainException("Geçersiz şube.");

        return new Category
        {
            Name = name,
            BranchId = branchId
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