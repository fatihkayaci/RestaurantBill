using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Common;

// Yeni rezervasyonun kısa kodu (ReservationCode) tüm sistemde tekil olmalı. 31^6 ≈ 887 milyon kod olduğundan çakışma
// çok seyrektir; yine de kaydetmeden önce bakılır, doluysa yenisi çekilir. Son güvence veritabanındaki unique index.
public static class ReservationCodes
{
    public const int MaxAttempts = 10;

    public static async Task EnsureUniqueAsync(IAppDbContext db, Reservation reservation, CancellationToken cancellationToken)
    {
        for (int attempt = 0; attempt < MaxAttempts; attempt++)
        {
            string code = reservation.Code;
            // IgnoreQueryFilters: silinmiş rezervasyonun kodu da index'te durur.
            bool taken = await db.Reservations.IgnoreQueryFilters().AnyAsync(r => r.Code == code && r.Id != reservation.Id, cancellationToken);
            if (!taken)
                return;
            reservation.RegenerateCode();
        }
    }
}
