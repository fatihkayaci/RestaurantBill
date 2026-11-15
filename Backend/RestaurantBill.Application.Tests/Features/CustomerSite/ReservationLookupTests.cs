using System.Globalization;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Features.CustomerSite.Staff;
using RestaurantBill.Application.Features.Tables.Commands.ReservationTable;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// Kısa rezervasyon kodu ve "Rezervasyon sorgula" (kod + telefon → rezervasyon bağlantısının anahtarı).
public class ReservationLookupTests : ApplicationTestBase
{
    private const string Slug = "sorgu-restoran";
    private const string Phone = "0532 123 45 67";

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly FakeTableNotificationService _tableNotifications = new();
    private readonly ManualClock _clock = new();
    private readonly ReservationLookupGuard _guard;

    private Table _table = default!;

    public ReservationLookupTests()
    {
        _guard = new ReservationLookupGuard(_clock);
    }

    private sealed class ManualClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = new(DateTime.UtcNow.Date.AddHours(9), TimeSpan.Zero);
        public override DateTimeOffset GetUtcNow() => Now;
    }

    private DateTime Now => _clock.Now.UtcDateTime;

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private static void SetCode(Reservation reservation, string code)
        => typeof(Reservation).GetProperty(nameof(Reservation.Code))!.SetValue(reservation, code);

    private async Task SeedAsync()
    {
        User owner = await SeedActorAsync();
        Company company = Company.Create("Sorgu Restoran", owner);
        company.Slug = Slug;
        DbContext.Companies.Add(company);
        await DbContext.SaveChangesAsync();

        Branch branch = Branch.Create(company.Id, "Merkez", "", "", "", "İstanbul", "Fatih", "", 10m);
        SetId(branch, CurrentUser.BranchId);
        DbContext.Branches.Add(branch);
        await DbContext.SaveChangesAsync();

        _table = await SeedTableAsync();
    }

    private async Task<Reservation> SeedReservationAsync(DateTime? startUtc = null, string contact = Phone, Table? table = null)
    {
        DateTime start = startUtc ?? Now.AddDays(1);
        Reservation reservation = Reservation.CreateRequest(table ?? _table, "Ahmet Yılmaz", contact, start, start.AddHours(2), 2, null);
        DbContext.Reservations.Add(reservation);
        await DbContext.SaveChangesAsync();
        return reservation;
    }

    private Task<Result<ReservationLookupResultDto>> LookupAsync(string code, string phone, FakeTenantResolver? tenant = null)
        => new LookupReservationCommandHandler(Db, tenant ?? _tenant, _guard, _clock)
            .Handle(new LookupReservationCommand { Code = code, Phone = phone }, CancellationToken.None);

    // Kodun ilk karakteri değiştirilerek aynı biçimde ama başka bir kod.
    private static string OtherCode(string code)
        => (code[0] == 'A' ? 'B' : 'A') + code[1..];

    // ── Kod biçimi ve üretimi ───────────────────────────────────────────────────────────────────

    [Fact]
    public void NewCode_IsSixCharactersFromTheUnambiguousAlphabet()
    {
        for (int i = 0; i < 500; i++)
        {
            string code = ReservationCode.New();
            Assert.Equal(ReservationCode.Length, code.Length);
            Assert.All(code, c => Assert.Contains(c, ReservationCode.Alphabet));
            Assert.DoesNotContain(code, c => "0O1IL".Contains(c));
        }
    }

    [Fact]
    public void NewCodes_AreRandomAndDistinct()
    {
        HashSet<string> codes = Enumerable.Range(0, 2000).Select(_ => ReservationCode.New()).ToHashSet();

        // 887 milyon olasılıkta 2000 kodda çakışma ihtimali ~%0,2; birkaç tekrar olsa bile neredeyse hepsi farklı olmalı.
        Assert.True(codes.Count >= 1995, $"{codes.Count} farklı kod");
    }

    [Theory]
    [InlineData("K7M2QP", "K7M2QP")]
    [InlineData("k7m-2qp", "K7M2QP")]
    [InlineData(" K7M 2QP ", "K7M2QP")]
    [InlineData("k7m - 2 q p", "K7M2QP")]
    [InlineData("K7M2Q", "")]
    [InlineData("K7M2QPX", "")]
    [InlineData("K0M2QP", "")] // 0 alfabede yok
    [InlineData("KIM2QP", "")] // I alfabede yok
    [InlineData("", "")]
    public void Normalize_IgnoresCaseSpacesAndDashes(string input, string expected)
        => Assert.Equal(expected, ReservationCode.Normalize(input));

    [Fact]
    public void Format_AddsTheDash()
        => Assert.Equal("K7M-2QP", ReservationCode.Format("k7m2qp"));

    [Fact]
    public async Task EnsureUnique_WhenCodeIsTaken_DrawsANewOne()
    {
        await SeedAsync();
        Reservation existing = await SeedReservationAsync();

        Reservation fresh = Reservation.CreateRequest(_table, "Ayşe", Phone, Now.AddDays(2), Now.AddDays(2).AddHours(2), 2, null);
        SetCode(fresh, existing.Code);

        await ReservationCodes.EnsureUniqueAsync(Db, fresh, CancellationToken.None);

        Assert.NotEqual(existing.Code, fresh.Code);
        Assert.Equal(ReservationCode.Length, ReservationCode.Normalize(fresh.Code).Length);
    }

    [Fact]
    public async Task CustomerReservation_GetsACode_AndReturnsItFormatted()
    {
        await SeedAsync();
        var result = await new CreateReservationRequestCommandHandler(Db, _tenant, _tableNotifications).Handle(new CreateReservationRequestCommand
        {
            TableId = _table.Id,
            GuestName = "Ahmet Yılmaz",
            Contact = Phone,
            Date = DateTime.UtcNow.AddDays(2).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            Time = "19:00",
            PartySize = 2
        }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Reservation saved = DbContext.Reservations.Single();
        Assert.Equal(saved.Code, ReservationCode.Normalize(saved.Code));
        Assert.Equal(ReservationCode.Format(saved.Code), result.Value!.Code);
        Assert.Matches("^[A-Z2-9]{3}-[A-Z2-9]{3}$", result.Value.Code);
    }

    [Fact]
    public async Task StaffReservation_GetsACode()
    {
        await SeedAsync();
        var result = await new ReservationTableCommandHandler(Db, _tableNotifications, CurrentUser).Handle(new ReservationTableCommand
        {
            TableId = _table.Id,
            GuestName = "Ahmet Yılmaz",
            Contact = Phone,
            ReservationTime = "19:30",
            Note = ""
        }, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Reservation saved = DbContext.Reservations.Single();
        Assert.Equal(ReservationCode.Length, ReservationCode.Normalize(saved.Code).Length);
    }

    [Fact]
    public async Task ByToken_ReturnsTheFormattedCode()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync();

        var detail = await new GetReservationByTokenQueryHandler(Db, _tenant, _clock)
            .Handle(new GetReservationByTokenQuery { Token = reservation.AccessToken }, CancellationToken.None);

        Assert.True(detail.IsSuccess, detail.Error);
        Assert.Equal(ReservationCode.Format(reservation.Code), detail.Value!.Code);
    }

    [Fact]
    public async Task StaffList_ShowsTheCodeAndTheLinkParts()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync(startUtc: DateTime.UtcNow.AddDays(1));

        var list = await new GetCustomerReservationsQueryHandler(Db, CurrentUser).Handle(new GetCustomerReservationsQuery(), CancellationToken.None);

        StaffReservationDto row = Assert.Single(list.Value!);
        Assert.Equal(ReservationCode.Format(reservation.Code), row.Code);
        Assert.Equal(reservation.AccessToken, row.AccessToken);
        Assert.Equal(Slug, row.SiteSlug);
    }

    // ── Sorgulama ───────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Lookup_WithCodeAndPhone_ReturnsTheAccessToken_AndWritesAnAuditLog()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync();

        var result = await LookupAsync(ReservationCode.Format(reservation.Code).ToLowerInvariant(), Phone);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(reservation.AccessToken, result.Value!.AccessToken);
        AuditLog log = Assert.Single(DbContext.AuditLogs);
        Assert.Equal("ReservationLookedUp", log.Action);
    }

    [Fact]
    public async Task Lookup_WrongPhoneAndWrongCode_GiveTheSameMessage_AndNoAuditLog()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync();

        var wrongPhone = await LookupAsync(reservation.Code, "0532 999 99 99");
        var wrongCode = await LookupAsync(OtherCode(reservation.Code), Phone);
        var bothWrong = await LookupAsync(OtherCode(reservation.Code), "0532 999 99 99");
        var badFormat = await LookupAsync("XX", "123");

        Assert.All(new[] { wrongPhone, wrongCode, bothWrong, badFormat }, r =>
        {
            Assert.False(r.IsSuccess);
            Assert.Equal(LookupReservationCommandHandler.NotFoundMessage, r.Error);
            Assert.Null(r.Value);
        });
        Assert.Empty(DbContext.AuditLogs);
    }

    [Theory]
    [InlineData("05321234567")]
    [InlineData("0532 123 45 67")]
    [InlineData("+905321234567")]
    [InlineData("+90 532 123 4567")]
    [InlineData("5321234567")]
    [InlineData("532-123-45-67")]
    public async Task Lookup_MatchesPhoneFormatVariants(string phone)
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync(contact: "+90 (532) 123 45 67");

        var result = await LookupAsync(reservation.Code, phone);

        Assert.True(result.IsSuccess, result.Error);
    }

    [Fact]
    public async Task Lookup_AfterFiveWrongPhones_LocksTheCodeFor15Minutes()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync();

        for (int i = 0; i < ReservationLookupGuard.MaxFailures; i++)
            Assert.Equal(LookupReservationCommandHandler.NotFoundMessage, (await LookupAsync(reservation.Code, "0532 999 99 99")).Error);

        // Doğru telefonla da kilitli; kilit kodun var olup olmadığından bağımsız.
        var locked = await LookupAsync(reservation.Code, Phone);
        Assert.False(locked.IsSuccess);
        Assert.Equal(LookupReservationCommandHandler.LockedMessage, locked.Error);

        _clock.Now = _clock.Now.AddMinutes(14);
        Assert.False((await LookupAsync(reservation.Code, Phone)).IsSuccess);

        _clock.Now = _clock.Now.AddMinutes(2);
        var unlocked = await LookupAsync(reservation.Code, Phone);
        Assert.True(unlocked.IsSuccess, unlocked.Error);
    }

    [Fact]
    public async Task Lookup_LockoutAppliesToUnknownCodesToo()
    {
        await SeedAsync();
        string unknown = "ABCDEF";

        for (int i = 0; i < ReservationLookupGuard.MaxFailures; i++)
            await LookupAsync(unknown, Phone);

        Assert.Equal(LookupReservationCommandHandler.LockedMessage, (await LookupAsync(unknown, Phone)).Error);
    }

    [Fact]
    public async Task Lookup_SuccessResetsTheFailureCount()
    {
        await SeedAsync();
        Reservation reservation = await SeedReservationAsync();

        for (int i = 0; i < ReservationLookupGuard.MaxFailures - 1; i++)
            await LookupAsync(reservation.Code, "0532 999 99 99");
        Assert.True((await LookupAsync(reservation.Code, Phone)).IsSuccess);

        await LookupAsync(reservation.Code, "0532 999 99 99");
        Assert.True((await LookupAsync(reservation.Code, Phone)).IsSuccess);
    }

    [Fact]
    public async Task Lookup_ExcludesReservationsOlderThan30Days()
    {
        await SeedAsync();
        Reservation old = await SeedReservationAsync(startUtc: Now.AddDays(-(LookupReservationCommandHandler.MaxAgeDays + 1)));
        Reservation recent = await SeedReservationAsync(startUtc: Now.AddDays(-(LookupReservationCommandHandler.MaxAgeDays - 1)));

        var oldResult = await LookupAsync(old.Code, Phone);
        Assert.False(oldResult.IsSuccess);
        Assert.Equal(LookupReservationCommandHandler.NotFoundMessage, oldResult.Error);
        Assert.True((await LookupAsync(recent.Code, Phone)).IsSuccess);
    }

    [Fact]
    public async Task Lookup_AnotherTenantsCode_IsNotFound()
    {
        await SeedAsync();

        // Başka bir restoran: kendi şirketi, şubesi, bölgesi ve masası.
        User otherOwner = await SeedActorAsync("Başka", Guid.NewGuid());
        Company other = Company.Create("Başka Restoran", otherOwner);
        other.Slug = "baska-restoran";
        DbContext.Companies.Add(other);
        await DbContext.SaveChangesAsync();
        Branch otherBranch = Branch.Create(other.Id, "Merkez", "", "", "", "İstanbul", "Kadıköy", "", 10m);
        DbContext.Branches.Add(otherBranch);
        await DbContext.SaveChangesAsync();
        Region otherRegion = await SeedRegionAsync(otherBranch.Id);
        Table otherTable = Table.Create("Masa", "", otherRegion.Id);
        DbContext.Tables.Add(otherTable);
        await DbContext.SaveChangesAsync();

        Reservation foreign = await SeedReservationAsync(table: otherTable);

        var fromOurSite = await LookupAsync(foreign.Code, Phone);
        Assert.False(fromOurSite.IsSuccess);
        Assert.Equal(LookupReservationCommandHandler.NotFoundMessage, fromOurSite.Error);

        var fromTheirSite = await LookupAsync(foreign.Code, Phone, new FakeTenantResolver { Slug = "baska-restoran" });
        Assert.True(fromTheirSite.IsSuccess, fromTheirSite.Error);
    }
}
