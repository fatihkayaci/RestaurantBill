using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Application.Interfaces;

public interface IBusinessDayResolver
{
    /// <summary>
    /// Bir UTC anının, şubenin DayEndTime/TimeZoneId ayarına göre hangi iş gününe ait olduğunu döndürür.
    /// </summary>
    DateOnly ResolveBusinessDay(Branch branch, DateTime utcMoment);

    /// <summary>
    /// Şubenin yerel takvim aralığını (from dahil, to dahil) UTC aralığına çevirir. Üst sınır (ToUtc) hariçtir.
    /// </summary>
    (DateTime FromUtc, DateTime ToUtc) ToUtcRange(Branch branch, DateOnly from, DateOnly to);
}
