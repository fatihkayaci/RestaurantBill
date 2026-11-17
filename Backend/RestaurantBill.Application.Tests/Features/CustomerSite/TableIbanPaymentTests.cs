using RestaurantBill.Application.DTOs.CustomerSite;
using RestaurantBill.Application.Features.Branches.Payment;
using RestaurantBill.Application.Features.CustomerSite.Public;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Application.Tests.Infrastructure;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Application.Tests.Features.CustomerSite;

// Masa QR sayfasında "IBAN ile öde": Ayarlar → Ödeme'deki IBAN doğrulaması, açma kuralı ve herkese açık masa ucunda
// yalnızca açık + geçerliyken görünmesi (dekont numarası: sitenin WhatsApp'ı, yoksa cep telefonuysa şube telefonu).
public class TableIbanPaymentTests : ApplicationTestBase
{
    private const string Slug = "iban-restoran";
    private const string ValidIban = "TR330006100519786457841326";

    private readonly FakeTenantResolver _tenant = new() { Slug = Slug };
    private readonly UpdateBranchPaymentSettingsCommandValidator _validator = new();

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private async Task<(Branch Branch, Table Table)> SeedAsync(string branchPhone = "0212 000 00 00", Action<Branch>? configure = null)
    {
        User owner = await SeedActorAsync("Yönetici");
        Company company = Company.Create("IBAN Restoran", owner);
        company.Slug = Slug;
        DbContext.Companies.Add(company);
        await DbContext.SaveChangesAsync();

        Branch branch = Branch.Create(company.Id, "Merkez", "", branchPhone, "", "İstanbul", "Fatih", "", 10m);
        SetId(branch, CurrentUser.BranchId);
        configure?.Invoke(branch);
        DbContext.Branches.Add(branch);
        await DbContext.SaveChangesAsync();

        return (branch, await SeedTableAsync());
    }

    private static UpdateBranchPaymentSettingsCommand Command(string iban = ValidIban, string holder = "Ocak Gıda Ltd.", string bank = "", bool show = false)
        => new() { Iban = iban, AccountHolderName = holder, BankName = bank, ShowIbanOnTable = show };

    private async Task<TableIbanPaymentDto?> PublicIbanAsync(Guid tableId)
    {
        var result = await new GetPublicTableQueryHandler(Db, _tenant)
            .Handle(new GetPublicTableQuery { TableId = tableId }, CancellationToken.None);
        Assert.True(result.IsSuccess, result.Error);
        return result.Value!.IbanPayment;
    }

    // ── IBAN doğrulaması ────────────────────────────────────────────────────────────────────────

    [Fact]
    public void Validator_AcceptsValidTrIban()
        => Assert.True(_validator.Validate(Command()).IsValid);

    [Theory]
    [InlineData("TR340006100519786457841326")] // kontrol hanesi yanlış (mod-97)
    [InlineData("TR33000610051978645784132")]  // 25 karakter
    [InlineData("TR3300061005197864578413261")] // 27 karakter
    [InlineData("DE89370400440532013000")]     // geçerli ama Türkiye değil
    [InlineData("TR33000610051978645784132A")] // TR'den sonra harf
    public void Validator_RejectsInvalidIban(string iban)
    {
        var result = _validator.Validate(Command(iban));
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.PropertyName == nameof(UpdateBranchPaymentSettingsCommand.Iban));
    }

    [Fact]
    public async Task Update_NormalisesSpacesAndLowercase()
    {
        await SeedAsync();
        UpdateBranchPaymentSettingsCommand command = Command("tr33 0006 1005 1978 6457 8413 26", "  Ocak Gıda  ", "  Ziraat Bankası ");
        Assert.True(_validator.Validate(command).IsValid);

        var result = await new UpdateBranchPaymentSettingsCommandHandler(Db, CurrentUser).Handle(command, CancellationToken.None);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(ValidIban, result.Value!.Iban);
        Assert.Equal("TR33 0006 1005 1978 6457 8413 26", result.Value.IbanFormatted);
        Assert.Equal("Ocak Gıda", result.Value.AccountHolderName);
        Assert.Equal("Ziraat Bankası", result.Value.BankName);
        Assert.False(result.Value.ShowIbanOnTable);
    }

    [Fact]
    public void Validator_RequiresHolderWhenIbanSet_AndLimitsLengths()
    {
        Assert.False(_validator.Validate(Command(holder: " ")).IsValid);
        Assert.True(_validator.Validate(Command(holder: new string('a', 100))).IsValid);
        Assert.False(_validator.Validate(Command(holder: new string('a', 101))).IsValid);
        Assert.True(_validator.Validate(Command(bank: new string('b', 60))).IsValid);
        Assert.False(_validator.Validate(Command(bank: new string('b', 61))).IsValid);
        // İkisi de boş: IBAN kaldırma isteği geçerlidir.
        Assert.True(_validator.Validate(Command(iban: "", holder: "")).IsValid);
    }

    // ── Açma kuralı ────────────────────────────────────────────────────────────────────────────

    [Fact]
    public void Validator_RejectsShowWithoutValidIbanAndHolder()
    {
        Assert.True(_validator.Validate(Command(show: true)).IsValid);
        var noIban = _validator.Validate(Command(iban: "", holder: "", show: true));
        Assert.False(noIban.IsValid);
        Assert.Contains(noIban.Errors, e => e.PropertyName == nameof(UpdateBranchPaymentSettingsCommand.ShowIbanOnTable));
        Assert.False(_validator.Validate(Command(iban: "TR340006100519786457841326", show: true)).IsValid);
    }

    [Fact]
    public async Task Update_ShowWithoutIban_FailsAndKeepsItOff()
    {
        var (branch, _) = await SeedAsync();

        var result = await new UpdateBranchPaymentSettingsCommandHandler(Db, CurrentUser)
            .Handle(Command(iban: "", holder: "", show: true), CancellationToken.None);

        Assert.True(result.IsFailure);
        Assert.False(branch.ShowIbanOnTable);
    }

    [Fact]
    public void Domain_ShowRequiresIban_AndRemovingIbanTurnsItOff()
    {
        Branch branch = Branch.Create("Merkez");
        Assert.Throws<DomainException>(() => branch.SetShowIbanOnTable(true));

        branch.SetIban(ValidIban, "Ocak", "Ziraat");
        branch.SetShowIbanOnTable(true);
        Assert.True(branch.ShowsIbanOnTable);

        branch.SetIban("", "");
        Assert.False(branch.ShowIbanOnTable);
        Assert.Equal(string.Empty, branch.PaymentBankName);
    }

    // ── Herkese açık masa ucu ───────────────────────────────────────────────────────────────────

    [Fact]
    public async Task PublicTable_ByDefault_DoesNotExposeIban()
    {
        // IBAN kayıtlı (kasada kullanılıyor) ama QR'da gösterim açılmamış: hiçbir şey gönderilmez.
        var (_, table) = await SeedAsync(configure: b => b.SetIban(ValidIban, "Ocak Gıda"));

        Assert.Null(await PublicIbanAsync(table.Id));
    }

    [Fact]
    public async Task PublicTable_AfterTurningOff_DoesNotExposeIban()
    {
        var (_, table) = await SeedAsync(configure: b => b.SetIban(ValidIban, "Ocak Gıda"));
        var handler = new UpdateBranchPaymentSettingsCommandHandler(Db, CurrentUser);
        Assert.True((await handler.Handle(Command(show: true), CancellationToken.None)).IsSuccess);
        Assert.NotNull(await PublicIbanAsync(table.Id));

        Assert.True((await handler.Handle(Command(show: false), CancellationToken.None)).IsSuccess);
        Assert.Null(await PublicIbanAsync(table.Id));
    }

    [Fact]
    public async Task PublicTable_WhenEnabled_ExposesAccount_AndPrefersSiteWhatsapp()
    {
        var (_, table) = await SeedAsync("0532 111 22 33", b =>
        {
            b.SetIban(ValidIban, "Ocak Gıda", "Ziraat Bankası");
            b.SetShowIbanOnTable(true);
            b.UpdateSiteContent(new SiteContentTexts { WhatsappPhone = "0544 000 48 48" }, 2026);
        });

        TableIbanPaymentDto? iban = await PublicIbanAsync(table.Id);

        Assert.NotNull(iban);
        Assert.Equal(ValidIban, iban!.Iban);
        Assert.Equal("TR33 0006 1005 1978 6457 8413 26", iban.IbanFormatted);
        Assert.Equal("Ocak Gıda", iban.AccountHolder);
        Assert.Equal("Ziraat Bankası", iban.BankName);
        Assert.Equal("0544 000 48 48", iban.WhatsappPhone);
        Assert.Equal("0544 000 48 48", iban.Phone);
    }

    [Theory]
    [InlineData("0532 111 22 33")]
    [InlineData("+90 532 111 22 33")]
    [InlineData("5321112233")]
    public async Task PublicTable_WithoutSiteWhatsapp_UsesMobileBranchPhone(string branchPhone)
    {
        var (_, table) = await SeedAsync(branchPhone, b => { b.SetIban(ValidIban, "Ocak"); b.SetShowIbanOnTable(true); });

        TableIbanPaymentDto? iban = await PublicIbanAsync(table.Id);

        Assert.Equal(branchPhone, iban!.WhatsappPhone);
        Assert.Equal(branchPhone, iban.Phone);
    }

    [Fact]
    public async Task PublicTable_LandlineBranchPhone_HasNoWhatsapp_ButShowsPhone()
    {
        var (_, table) = await SeedAsync("0212 444 55 66", b => { b.SetIban(ValidIban, "Ocak"); b.SetShowIbanOnTable(true); });

        TableIbanPaymentDto? iban = await PublicIbanAsync(table.Id);

        Assert.Equal(string.Empty, iban!.WhatsappPhone);
        Assert.Equal("0212 444 55 66", iban.Phone);
    }
}
