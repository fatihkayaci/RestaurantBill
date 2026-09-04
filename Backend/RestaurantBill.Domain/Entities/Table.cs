using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class Table : BaseEntity
    {
        public Guid RegionId { get; private set; }
        public Region Region { get; private set; } = default!;
        public string Name { get; private set; } = string.Empty;
        public string Note { get; private set; } = string.Empty;
        public TableStatus Status { get; private set; } = TableStatus.Available;

        protected Table() { }

        public static Table Create(string name, string note, Guid regionId)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Masa adı boş olamaz.");

            if (regionId == Guid.Empty)
                throw new DomainException("Geçersiz bölge ID'si.");

            return new Table
            {
                Name = name,
                Note = note,
                RegionId = regionId
            };
        }

        public void Update(string name, string note)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Masa adı boş olamaz.");

            Name = name;
            Note = note;
        }

        public void AssignRegion(Guid regionId)
        {
            if (regionId == Guid.Empty)
                throw new DomainException("Geçersiz bölge ID'si.");

            RegionId = regionId;
        }

        public void Occupy()
        {
            if (Status != TableStatus.Available)
                throw new DomainException("Masa zaten dolu veya hizmet dışı.");

            Status = TableStatus.Occupied;
        }

        public void Release()
        {
            Status = TableStatus.Available;
        }

        public void Reserve()
        {
            if (Status == TableStatus.Occupied)
                throw new DomainException("Masada aktif bir sipariş varken rezervasyon yapılamaz.");

            Status = TableStatus.Reserved;
        }

        public void SetStatus(TableStatus status)
        {
            Status = status;
        }

        public void EnsureCanBeDeleted(IEnumerable<Order> activeOrders)
        {
            if (activeOrders.Any())
                throw new DomainException("Bu masaya ait açık bir sipariş bulunmaktadır. Lütfen silmeden önce siparişi kapatın.");
        }
    }
}
