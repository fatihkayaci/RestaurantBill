using System.Globalization;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Features.Branches.ReservationRules;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Features.Tables.Commands.ReservationTable;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// Şubenin rezervasyon ayarlarının müşteri sitesi, personel ve admin uçlarında uygulanması.
public class ReservationSettingsHandlerTests : ApplicationTestBase
{
    private const string Slug = "ayarli-restoran";

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly FakeTableNotificationService _tableNotifications = new();

    private Branch _branch = default!;

    private async Task<Table> SeedAsync()
    {
        User owner = await SeedActorAsync();
        Company company = Company.Create("Ayarlı Restoran", owner);
        company.Slug = Slug;
        DbContext.Companies.Add(company);
        await DbContext.SaveChangesAsync();

        _branch = Branch.Create(company.Id, "Merkez", "", "", "", "İstanbul", "Fatih", "", 10m);
        typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(_branch, CurrentUser.BranchId);
        DbContext.Branches.Add(_branch);
        await DbContext.SaveChangesAsync();

        return await SeedTableAsync();
    }

    private async Task ConfigureAsync(bool enabled = true, int interval = 30, int duration = 120, int maxDays = 60, int maxParty = 20,
        string first = "09:00", string last = "21:00", params DayOfWeek[] closed)
    {
        _branch.SetReservationSettings(ReservationSettings.Create(enabled, interval, duration, maxDays, maxParty,
            ReservationSettings.WeekOrder.Select(d => new ReservationDayHours(d, !closed.Contains(d), TimeOnly.Parse(first), TimeOnly.Parse(last)))));
        await DbContext.SaveChangesAsync();
    }

    // Şubenin saat dilimi İstanbul; testler UTC tarihinden birkaç gün sonrasını kullanır.
    private static DateOnly DayFromNow(int days) => DateOnly.FromDateTime(DateTime.UtcNow.AddDays(days));
    private static string Iso(DateOnly day) => day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private Task<Domain.Shared.Result<ReservationStatusDto>> CreateAsync(Table table, string time, int daysAhead = 2, int partySize = 4)
        => new CreateReservationRequestCommandHandler(Db, _tenant, _tableNotifications).Handle(new CreateReservationRequestCommand
        {
            TableId = table.Id,
            GuestName = "Ayşe Demir",
            Contact = "0555 123 45 67",
            Date = Iso(DayFromNow(daysAhead)),
            Time = time,
            PartySize = partySize
        }, CancellationToken.None);

    private async Task<List<string>> DaySlotsAsync(int daysAhead = 2)
    {
        var result = await new GetDaySlotsQueryHandler(Db, _tenant)
            .Handle(new GetDaySlotsQuery { Date = Iso(DayFromNow(daysAhead)) }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        return result.Value!.Select(s => s.Time).ToList();
    }

    [Fact]
    public async Task UnconfiguredBranch_UsesDefaults_EveryDay0900To2100Every30Minutes()
    {
        await SeedAsync();

        List<string> times = await DaySlotsAsync();

        Assert.Equal(25, times.Count);
        Assert.Equal("09:00", times[0]);
        Assert.Equal("09:30", times[1]);
        Assert.Equal("21:00", times[^1]);
    }

    [Fact]
    public async Task UnconfiguredBranch_WithOpeningHours_DaySlotsFollowOpeningAndClosing()
    {
        await SeedAsync();
        _branch.UpdateSite("", "", "", "", new TimeOnly(12, 0), new TimeOnly(23, 0), "", "", "");
        await DbContext.SaveChangesAsync();

        List<string> times = await DaySlotsAsync();

        Assert.Equal("12:00", times[0]);
        Assert.Equal("21:00", times[^1]);
    }

    [Fact]
    public async Task ClosedWeekday_HasNoSlotsAndRejectsRequests()
    {
        Table table = await SeedAsync();
        await ConfigureAsync(closed: DayFromNow(2).DayOfWeek);

        Assert.Empty(await DaySlotsAsync());
        Assert.NotEmpty(await DaySlotsAsync(3));

        var result = await CreateAsync(table, "19:00");
        Assert.False(result.IsSuccess);
        Assert.Contains("rezervasyon alınmıyor", result.Error);
        Assert.Empty(DbContext.Reservations.ToList());
    }

    [Fact]
    public async Task Interval_And_LastStart_DefineTheOnlyAcceptedStartTimes()
    {
        Table table = await SeedAsync();
        await ConfigureAsync(interval: 60, first: "10:00", last: "13:00");

        Assert.Equal(["10:00", "11:00", "12:00", "13:00"], await DaySlotsAsync());

        Assert.False((await CreateAsync(table, "10:30")).IsSuccess);   // aralığa uymuyor
        Assert.False((await CreateAsync(table, "14:00")).IsSuccess);   // son başlangıçtan sonra
        Assert.False((await CreateAsync(table, "09:00")).IsSuccess);   // ilk başlangıçtan önce
        var last = await CreateAsync(table, "13:00");
        Assert.True(last.IsSuccess, last.Error);
    }

    [Fact]
    public async Task FifteenMinuteInterval_GeneratesQuarterHourSlots()
    {
        await SeedAsync();
        await ConfigureAsync(interval: 15, first: "18:00", last: "19:00");

        Assert.Equal(["18:00", "18:15", "18:30", "18:45", "19:00"], await DaySlotsAsync());
    }

    [Fact]
    public async Task Duration_SetsEndTimeAndOverlapWindow()
    {
        Table table = await SeedAsync();
        await ConfigureAsync(duration: 90);

        var first = await CreateAsync(table, "19:00");
        Assert.True(first.IsSuccess, first.Error);
        Assert.Equal("20:30", first.Value!.EndTime);
        Reservation saved = DbContext.Reservations.Single();
        Assert.Equal(TimeSpan.FromMinutes(90), saved.EndTime!.Value - saved.ReservationTime);

        Assert.False((await CreateAsync(table, "20:00")).IsSuccess);   // 19:00–20:30 ile çakışır
        Assert.True((await CreateAsync(table, "20:30")).IsSuccess);    // bitişik
    }

    [Fact]
    public async Task OldReservationWithoutEndTime_StillBlocksTwoHours()
    {
        Table table = await SeedAsync();
        await ConfigureAsync(duration: 60);
        DateOnly day = DayFromNow(2);
        // Eski personel kaydı: bitiş yok → 120 dk sayılır. 18:00 yerel = 15:00 UTC.
        Reservation legacy = Reservation.Create(table, "Eski", "", day.ToDateTime(new TimeOnly(15, 0), DateTimeKind.Utc), "");
        DbContext.Reservations.Add(legacy);
        await DbContext.SaveChangesAsync();

        Assert.False((await CreateAsync(table, "19:30")).IsSuccess);
        Assert.True((await CreateAsync(table, "20:00")).IsSuccess);
    }

    [Fact]
    public async Task Disabled_RejectsRequestsSlotsAndAvailability()
    {
        Table table = await SeedAsync();
        await ConfigureAsync(enabled: false);

        var create = await CreateAsync(table, "19:00");
        var slots = await new GetDaySlotsQueryHandler(Db, _tenant).Handle(new GetDaySlotsQuery { Date = Iso(DayFromNow(2)) }, CancellationToken.None);
        var availability = await new GetReservationAvailabilityQueryHandler(Db, _tenant)
            .Handle(new GetReservationAvailabilityQuery { Date = Iso(DayFromNow(2)), Time = "19:00" }, CancellationToken.None);

        Assert.Equal(CustomerSiteScope.ReservationsClosedMessage, create.Error);
        Assert.Equal(CustomerSiteScope.ReservationsClosedMessage, slots.Error);
        Assert.Equal(CustomerSiteScope.ReservationsClosedMessage, availability.Error);
        Assert.Empty(DbContext.Reservations.ToList());
    }

    [Fact]
    public async Task MaxPartySize_IsEnforced()
    {
        Table table = await SeedAsync();
        await ConfigureAsync(maxParty: 4);

        var tooMany = await CreateAsync(table, "19:00", partySize: 5);
        var ok = await CreateAsync(table, "19:00", partySize: 4);

        Assert.False(tooMany.IsSuccess);
        Assert.Contains("en fazla 4 kişilik", tooMany.Error);
        Assert.True(ok.IsSuccess, ok.Error);
    }

    [Fact]
    public async Task MaxDaysAhead_IsEnforcedAndHidesLaterSlots()
    {
        Table table = await SeedAsync();
        await ConfigureAsync(maxDays: 3);

        var tooFar = await CreateAsync(table, "19:00", daysAhead: 5);

        Assert.False(tooFar.IsSuccess);
        Assert.Contains("En fazla 3 gün", tooFar.Error);
        Assert.Empty(await DaySlotsAsync(5));
        Assert.True((await CreateAsync(table, "19:00", daysAhead: 2)).IsSuccess);
    }

    [Fact]
    public async Task PublicSite_ExposesTheRules()
    {
        await SeedAsync();
        await ConfigureAsync(interval: 15, maxParty: 8, maxDays: 14, closed: DayOfWeek.Monday);

        var site = await new GetPublicSiteQueryHandler(Db, _tenant,
                Microsoft.Extensions.Options.Options.Create(new RestaurantBill.Application.Common.BunnyStorageOptions()))
            .Handle(new GetPublicSiteQuery(), CancellationToken.None);

        ReservationRulesDto rules = site.Value!.Reservation;
        Assert.True(rules.Enabled);
        Assert.Equal(15, rules.SlotIntervalMinutes);
        Assert.Equal(8, rules.MaxPartySize);
        Assert.Equal(14, rules.MaxDaysAhead);
        Assert.Equal(7, rules.Days.Count);
        Assert.Equal((int)DayOfWeek.Monday, rules.Days[0].Day);
        Assert.False(rules.Days[0].IsOpen);
    }

    [Fact]
    public async Task StaffReservation_WhenDisabled_IsRejectedAndTableStaysAvailable()
    {
        Table table = await SeedAsync();
        await ConfigureAsync(enabled: false);

        var result = await new ReservationTableCommandHandler(Db, _tableNotifications, CurrentUser).Handle(new ReservationTableCommand
        {
            TableId = table.Id, GuestName = "Mehmet", Contact = "", ReservationTime = "19:30", Note = ""
        }, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(TableStatus.Available, table.Status);
        Assert.Empty(DbContext.Reservations.ToList());
    }

    [Fact]
    public async Task StaffReservation_StoresEndTimeFromConfiguredDuration()
    {
        Table table = await SeedAsync();
        await ConfigureAsync(duration: 150);

        var result = await new ReservationTableCommandHandler(Db, _tableNotifications, CurrentUser).Handle(new ReservationTableCommand
        {
            TableId = table.Id, GuestName = "Mehmet", Contact = "", ReservationTime = "19:30", Note = ""
        }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Reservation saved = DbContext.Reservations.Single();
        Assert.Equal(ReservationStatus.Active, saved.Status);
        Assert.Equal(TimeSpan.FromMinutes(150), saved.EndTime!.Value - saved.ReservationTime);
        Assert.Equal(TableStatus.Reserved, table.Status);
    }

    [Fact]
    public async Task AdminUpdate_SavesValidatesAndResets()
    {
        await SeedAsync();
        var handler = new UpdateBranchReservationSettingsCommandHandler(Db, CurrentUser);
        List<ReservationDayDto> days = ReservationSettings.WeekOrder
            .Select(d => new ReservationDayDto { Day = (int)d, IsOpen = d != DayOfWeek.Monday, FirstStart = "10:00", LastStart = "23:00" })
            .ToList();

        var saved = await handler.Handle(new UpdateBranchReservationSettingsCommand
        {
            Enabled = true, SlotIntervalMinutes = 60, DurationMinutes = 180, MaxDaysAhead = 30, MaxPartySize = 12, Days = days
        }, CancellationToken.None);
        Assert.True(saved.IsSuccess, saved.Error);
        Assert.True(saved.Value!.IsCustomized);
        Assert.Equal(180, _branch.GetReservationSettings().DurationMinutes);
        Assert.False(_branch.GetReservationSettings().For(DayOfWeek.Monday).IsOpen);

        days[1].LastStart = "09:00";
        var invalid = await handler.Handle(new UpdateBranchReservationSettingsCommand
        {
            Enabled = true, SlotIntervalMinutes = 60, DurationMinutes = 180, MaxDaysAhead = 30, MaxPartySize = 12, Days = days
        }, CancellationToken.None);
        Assert.False(invalid.IsSuccess);
        Assert.Contains("Salı", invalid.Error);
        Assert.Equal(60, _branch.GetReservationSettings().SlotIntervalMinutes);

        var reset = await handler.Handle(new UpdateBranchReservationSettingsCommand { ResetToDefaults = true }, CancellationToken.None);
        Assert.True(reset.IsSuccess, reset.Error);
        Assert.False(reset.Value!.IsCustomized);
        Assert.Null(_branch.ReservationSettings);
        Assert.Equal(30, reset.Value.SlotIntervalMinutes);
    }

    [Fact]
    public void AdminUpdateValidator_RejectsOutOfRangeValuesInTurkish()
    {
        var validator = new UpdateBranchReservationSettingsCommandValidator();
        var result = validator.Validate(new UpdateBranchReservationSettingsCommand
        {
            SlotIntervalMinutes = 20, DurationMinutes = 300, MaxDaysAhead = 0, MaxPartySize = 99, Days = []
        });

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("Saat aralığı"));
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("Masada kalma"));
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("kaç gün"));
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("kişi sayısı"));
        Assert.Contains(result.Errors, e => e.ErrorMessage.Contains("her günü"));
    }
}
