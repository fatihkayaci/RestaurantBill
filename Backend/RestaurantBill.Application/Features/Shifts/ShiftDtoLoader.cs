using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Application.Mappings;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.Shifts;

// Vardiya kişiye ait olduğu için ekranlar vardiya sahibinin adını gösterir; ad User tablosundan okunur.
public static class ShiftDtoLoader
{
    public static async Task<List<ShiftDto>> ToDtosWithOwnerAsync(this IAppDbContext db, IReadOnlyCollection<Shift> shifts, CancellationToken cancellationToken)
    {
        List<Guid> userIds = shifts.Select(s => s.OpenedByUserId).Distinct().ToList();
        Dictionary<Guid, string> names = await db.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.FullName, cancellationToken);

        return shifts.Select(s => s.ToDto(names.GetValueOrDefault(s.OpenedByUserId))).ToList();
    }

    public static async Task<ShiftDto> ToDtoWithOwnerAsync(this IAppDbContext db, Shift shift, CancellationToken cancellationToken)
        => (await db.ToDtosWithOwnerAsync([shift], cancellationToken))[0];

    // Kör sayım: kasiyer, sayımdan önce "olması gereken" tutarı hiçbir ekrandan görmemeli.
    public static bool CanSeeExpectedBalance(this ICurrentUserService currentUser)
        => currentUser.Role is "Owner" or "Admin";
}
