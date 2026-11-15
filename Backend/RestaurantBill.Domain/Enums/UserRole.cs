namespace RestaurantBill.Domain.Enums;

public enum UserRole
{
    Admin = 1,
    Waiter = 2,
    Cashier = 3,
    Kitchen = 4,
    Owner = 5,
    // Paket siparişleri teslim eden personel; diğer personel gibi UserBranch ile şubeye bağlıdır.
    Courier = 6
}
