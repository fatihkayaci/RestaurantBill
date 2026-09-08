using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;

namespace RestaurantBill.Infrastructure.Services;

public class BusinessDayResolver : IBusinessDayResolver
{
    public DateOnly ResolveBusinessDay(Branch branch, DateTime utcMoment)
    {
        TimeZoneInfo timeZone = ResolveTimeZone(branch);
        DateTime local = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcMoment, DateTimeKind.Utc), timeZone);

        DateOnly localDate = DateOnly.FromDateTime(local);
        TimeOnly localTime = TimeOnly.FromDateTime(local);

        return localTime < branch.DayEndTime ? localDate.AddDays(-1) : localDate;
    }

    public (DateTime FromUtc, DateTime ToUtc) ToUtcRange(Branch branch, DateOnly from, DateOnly to)
    {
        TimeZoneInfo timeZone = ResolveTimeZone(branch);

        DateTime fromLocal = from.ToDateTime(branch.DayEndTime);
        DateTime toLocal = to.AddDays(1).ToDateTime(branch.DayEndTime);

        DateTime fromUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(fromLocal, DateTimeKind.Unspecified), timeZone);
        DateTime toUtc = TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(toLocal, DateTimeKind.Unspecified), timeZone);

        return (fromUtc, toUtc);
    }

    // DayEndCloseService'teki aynı savunmacı desen: eski/bozuk TimeZoneId verisi (örn. migration
    // öncesi boş string ile oluşmuş şubeler) raporları 500'letmesin, UTC'ye düşsün.
    private static TimeZoneInfo ResolveTimeZone(Branch branch)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(branch.TimeZoneId);
        }
        catch (Exception ex) when (ex is TimeZoneNotFoundException or InvalidTimeZoneException)
        {
            return TimeZoneInfo.Utc;
        }
    }
}
