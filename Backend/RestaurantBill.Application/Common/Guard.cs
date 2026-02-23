using RestaurantBill.Application.Exceptions;

namespace RestaurantBill.Application.Common;

public static class Guard
{
    public static void AgainstNull(object entity, string message = "Kayıt bulunamadı.")
    {
        if (entity == null)
            throw new NotFoundException(message);
    }
}