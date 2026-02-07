namespace RestaurantBill.Core;

public enum TableStatus
{
    Available = 1,   // Boş, müşteri alabilir (Empty yerine Available daha pro durur)
    Occupied = 2,    // Dolu, müşteri oturuyor
    Reserved = 3,    // Rezerve edilmiş
    OutOfService = 4 // Hizmet dışı (Kırık veya kullanımda değil)
}
