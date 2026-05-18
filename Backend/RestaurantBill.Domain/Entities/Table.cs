using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities
{
    public class Table : BaseEntity
    {
        public string Name { get; private set; } = string.Empty;
        public string Note { get; private set; } = string.Empty;
        public TableStatus Status { get; private set; } = TableStatus.Available;
        public int RestaurantId { get; private set; }

        protected Table() { }

        public static Table Create(string name, string note, int restaurantId)
        {
            if (restaurantId <= 0)
                throw new DomainException("Geçersiz restoran ID'si.");

            return new Table
            {
                Name = name,
                Note = note,
                RestaurantId = restaurantId
            };
        }

        public void Update(string name, string note)
        {
            Name = name;
            Note = note;
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
            Status = TableStatus.Reserved;
        }

        public void SetStatus(TableStatus status)
        {
            Status = status;
        }
    }
}
