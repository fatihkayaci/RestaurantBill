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
        // Masaya en fazla kaç kişi oturur; rezervasyonda kişi sayısına uymayan masa soluklaşır. Girilmemişse null.
        public int? Capacity { get; private set; }
        // Bölge içindeki sıra (küçük önce). Masa ekranlarında bu sırayla, eşitse ada göre (Masa 2, Masa 10) listelenir.
        public int SortOrder { get; private set; }
        // Personel bu masada QR'dan siparişi kapattı: müşteri menüye bakar, garson çağırır, hesap ister, hesabı görür;
        // ama QR'dan sipariş talebi gönderemez. Varsayılan açık.
        public bool QrOrderingLocked { get; private set; }

        public const int MaxCapacity = 50;

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

        /// <summary>Kapasite: 1–50 kişi ya da null (girilmemiş).</summary>
        public void SetCapacity(int? capacity)
        {
            if (capacity is < 1 or > MaxCapacity)
                throw new DomainException($"Masa kapasitesi 1 ile {MaxCapacity} kişi arasında olmalı.");

            Capacity = capacity;
        }

        public void SetSortOrder(int sortOrder)
        {
            SortOrder = sortOrder;
        }

        /// <summary>Masada QR'dan siparişi kapatır.</summary>
        public void LockQrOrdering()
        {
            QrOrderingLocked = true;
        }

        /// <summary>Masada QR'dan siparişi yeniden açar.</summary>
        public void UnlockQrOrdering()
        {
            QrOrderingLocked = false;
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
