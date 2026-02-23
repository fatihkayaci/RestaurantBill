using System.Diagnostics.CodeAnalysis;
using RestaurantBill.Application.Exceptions;

namespace RestaurantBill.Application.Common;

public static class Guard
{
    public static void AgainstNull<T>([NotNull] T? entity, string message = "Kayıt bulunamadı.") where T : class
    {
        if (entity == null)
            throw new NotFoundException(message);
    }
}