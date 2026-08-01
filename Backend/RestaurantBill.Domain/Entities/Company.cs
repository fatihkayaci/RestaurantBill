using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities;
public class Company : BaseEntity
{
    public Guid OwnerUserId { get; private set; }
    public User OwnerUser { get; private set; } = default!;
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;


    protected Company(){ }

    public static Company Create(string name, User ownerUser)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Kategori adı boş olamaz.");

        if (ownerUser == null)
            throw new DomainException("Geçersiz Kullanıcı.");
        
        return new Company
        {
            Name = name,
            OwnerUser = ownerUser,
            OwnerUserId = ownerUser.Id
        };
    }
}