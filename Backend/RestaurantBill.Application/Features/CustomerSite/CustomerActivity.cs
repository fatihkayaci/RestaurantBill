using RestaurantBill.Application.DTOs;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Features.CustomerSite;

// Builds the "CustomerActivity" live notification payloads for reservation events.
public static class CustomerActivity
{
    // The table must have its Region loaded (RegionId is enough; the region name is not sent).
    public static CustomerActivityDto ForReservation(string kind, Reservation reservation, Table table, TimeZoneInfo zone) => new()
    {
        Kind = kind,
        TableId = table.Id,
        TableName = table.Name,
        RegionId = table.RegionId,
        GuestName = reservation.GuestName,
        PartySize = reservation.PartySize,
        Date = CustomerSiteScope.LocalDate(reservation.ReservationTime, zone),
        Time = CustomerSiteScope.LocalTime(reservation.ReservationTime, zone),
        OccurredAt = DateTime.UtcNow,
    };
}
