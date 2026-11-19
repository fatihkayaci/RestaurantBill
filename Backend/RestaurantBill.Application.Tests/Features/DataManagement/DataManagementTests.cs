using System.IO.Compression;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Features.Auths.Commands.Login;
using RestaurantBill.Application.Features.Auths.Commands.Refresh;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Features.DataManagement;
using RestaurantBill.Application.Tests.Fakes;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Shared;
using RestaurantBill.Persistence.Context;

namespace RestaurantBill.Application.Tests.Features.DataManagement;

public class DataManagementTests : IDisposable
{
    private const string Password = "sifre123";
    private const string CompanyName = "Silme Testi";

    private readonly RestaurantBillDbContext _db;
    private readonly FakeCurrentUserService _owner;
    private readonly FakeImageStorageService _storage = new();
    private readonly User _ownerUser;
    private readonly Company _company;
    private readonly Branch _branch;

    public DataManagementTests()
    {
        Guid ownerId = Guid.NewGuid();
        Guid companyId = Guid.NewGuid();
        _owner = new FakeCurrentUserService { UserId = ownerId, CompanyId = companyId, BranchId = companyId, Role = "Owner" };
        _db = NewContext(_owner, Guid.NewGuid().ToString());

        _ownerUser = User.Create("Ayşe Sahip", "ayse@test.com", "5550000000");
        SetId(_ownerUser, ownerId);
        _ownerUser.SetPasswordHash($"hashed_{Password}");
        _db.Users.Add(_ownerUser);

        _company = Company.Create(CompanyName, _ownerUser);
        SetId(_company, companyId);
        _company.Slug = "silme-testi";
        _db.Companies.Add(_company);

        _branch = AddBranch("Merkez");
        _db.SaveChanges();
    }

    private static RestaurantBillDbContext NewContext(FakeCurrentUserService user, string name)
        => new(new DbContextOptionsBuilder<RestaurantBillDbContext>().UseInMemoryDatabase(name).Options, user);

    public void Dispose() => _db.Dispose();

    private static void SetId(BaseEntity entity, Guid id)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.Id))!.SetValue(entity, id);

    private static void SetCreatedAt(BaseEntity entity, DateTime utc)
        => typeof(BaseEntity).GetProperty(nameof(BaseEntity.CreatedAt))!.SetValue(entity, utc);

    private Branch AddBranch(string name, Company? company = null)
    {
        Branch branch = Branch.Create((company ?? _company).Id, name, "Ayşe Sahip", "5550000000", "ayse@test.com", "İstanbul", "Kadıköy", "Moda", 8m);
        SetId(branch, Guid.NewGuid());
        _db.Branches.Add(branch);
        return branch;
    }

    private record SalesSeed(Order Order, Product Product, Category Category, Table Table, Region Region);

    /// <summary>Kapalı bir adisyon: kalem, ödeme, ödeme kalemi, kasa hareketi ve kapalı vardiya.</summary>
    private async Task<SalesSeed> SeedSaleAsync(Branch branch, DateTime? createdAt = null, string imageKey = "products/x/p.webp",
        Product? product = null, Table? table = null)
    {
        Region region;
        if (table is null)
        {
            region = Region.Create("Salon", branch.Id);
            _db.Regions.Add(region);
            table = Table.Create("Masa 1", "", region.Id);
            _db.Tables.Add(table);
        }
        else
        {
            region = await _db.Regions.FirstAsync(r => r.Id == table.RegionId);
        }

        Category category;
        if (product is null)
        {
            category = Category.Create("Ana yemek", branch.Id);
            _db.Categories.Add(category);
            product = Product.Create("Adana", 300m, imageKey, category.Id);
            _db.Products.Add(product);
        }
        else
        {
            category = await _db.Categories.FirstAsync(c => c.Id == product.CategoryId);
        }

        Order order = Order.Create(table.Id, branch.Id);
        order.AddItem(product, 2, 10m);
        order.Close();
        _db.Orders.Add(order);

        CashRegister register = CashRegister.Create("Kasa", 0m, branch.Id);
        _db.CashRegisters.Add(register);
        Payment payment = Payment.Create(order.Id, register.Id, 600m, 545m, 55m, PaymentMethod.Nakit, 2);
        _db.Payments.Add(payment);
        _db.PaymentLineItems.Add(PaymentLineItem.Create(payment, product.Id, product.Name, category.Id, category.Name, 300m, 2, 10m));
        CashTransaction tx = CashTransaction.Create(register.Id, CashTransactionType.In, 600m, _owner.UserId);
        _db.CashTransactions.Add(tx);
        Shift shift = Shift.Create(branch.Id, register.Id, _owner.UserId, 0m, 0m);
        shift.Close(_owner.UserId, 600m, 600m);
        _db.Shifts.Add(shift);
        await _db.SaveChangesAsync();

        if (createdAt is DateTime when)
        {
            SetCreatedAt(order, when);
            SetCreatedAt(tx, when);
            typeof(Shift).GetProperty(nameof(Shift.OpenedAt))!.SetValue(shift, when);
            await _db.SaveChangesAsync();
        }
        return new SalesSeed(order, product, category, table, region);
    }

    private DeleteDataCommandHandler DeleteHandler(FakeCurrentUserService? user = null)
        => new(_db, user ?? _owner, new FakePasswordHasher(), _storage, NullLogger<DeleteDataCommandHandler>.Instance);

    private DeleteDataCommand DeleteCommand(string[] groups, string? olderThan = null, params Guid[] branchIds) => new()
    {
        BranchIds = [.. branchIds],
        Groups = [.. groups],
        OlderThan = olderThan,
        RestaurantName = CompanyName,
        Password = Password,
    };

    private static int Count(DeletionPreviewDto preview, string group, string line)
        => preview.Branches.SelectMany(b => b.Groups).Where(g => g.Key == group).SelectMany(g => g.Lines).Where(l => l.Label == line).Sum(l => l.Count);

    // ── Önizleme ─────────────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Preview_CountsEachGroup_AndDateFilterCountsOnlyOlderRows()
    {
        await SeedSaleAsync(_branch, createdAt: new DateTime(2025, 1, 10, 12, 0, 0, DateTimeKind.Utc));
        await SeedSaleAsync(_branch);
        _db.ContactMessages.Add(ContactMessage.Create(_branch.Id, "Ali", "555", ContactMessageType.Oneri, "Güzel"));
        await _db.SaveChangesAsync();

        var handler = new PreviewDataDeletionQueryHandler(_db, _owner);

        var all = await handler.Handle(new PreviewDataDeletionQuery { Groups = [DataGroups.Sales, DataGroups.Messages] }, default);
        Assert.True(all.IsSuccess, all.Error);
        Assert.Equal(2, Count(all.Value!, DataGroups.Sales, "Adisyon"));
        Assert.Equal(2, Count(all.Value!, DataGroups.Sales, "Ödeme"));
        Assert.Equal(2, Count(all.Value!, DataGroups.Sales, "Vardiya"));
        Assert.Equal(1, Count(all.Value!, DataGroups.Messages, "Mesaj"));
        Assert.Empty(all.Value!.Blockers);

        var older = await handler.Handle(new PreviewDataDeletionQuery { Groups = [DataGroups.Sales], OlderThan = "2026-01-01" }, default);
        Assert.Equal(1, Count(older.Value!, DataGroups.Sales, "Adisyon"));
        Assert.Equal(1, Count(older.Value!, DataGroups.Sales, "Kasa hareketi"));
        Assert.True(older.Value!.Branches[0].Groups[0].DateFiltered);
    }

    [Fact]
    public async Task Preview_MultipleBranches_RequiresBranchSelection()
    {
        Branch second = AddBranch("Kadıköy");
        await _db.SaveChangesAsync();

        var handler = new PreviewDataDeletionQueryHandler(_db, _owner);
        var none = await handler.Handle(new PreviewDataDeletionQuery { Groups = [DataGroups.Sales] }, default);
        Assert.False(none.IsSuccess);

        var one = await handler.Handle(new PreviewDataDeletionQuery { Groups = [DataGroups.Sales], BranchIds = [second.Id] }, default);
        Assert.True(one.IsSuccess);
        Assert.Equal("Kadıköy", Assert.Single(one.Value!.Branches).BranchName);

        var foreign = await handler.Handle(new PreviewDataDeletionQuery { Groups = [DataGroups.Sales], BranchIds = [Guid.NewGuid()] }, default);
        Assert.False(foreign.IsSuccess);
    }

    // ── Seçerek sil ──────────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_SalesOlderThanDate_KeepsNewerSales()
    {
        SalesSeed old = await SeedSaleAsync(_branch, createdAt: new DateTime(2025, 1, 10, 12, 0, 0, DateTimeKind.Utc));
        SalesSeed recent = await SeedSaleAsync(_branch);

        var result = await DeleteHandler().Handle(DeleteCommand([DataGroups.Sales], "2026-01-01"), default);

        Assert.True(result.IsSuccess, result.Error);
        Assert.False(await _db.Orders.AnyAsync(o => o.Id == old.Order.Id));
        Assert.True(await _db.Orders.AnyAsync(o => o.Id == recent.Order.Id));
        Assert.Equal(1, await _db.OrderItems.CountAsync());
        Assert.Equal(1, await _db.Payments.CountAsync());
        Assert.Equal(1, await _db.PaymentLineItems.CountAsync());
        Assert.Equal(1, await _db.Shifts.CountAsync());
        Assert.Equal(2, await _db.Products.CountAsync());
        Assert.Contains(await _db.AuditLogs.ToListAsync(), a => a.Action == "DataDeleted" && a.Severity == AuditLogSeverity.Critical);
    }

    [Fact]
    public async Task Delete_SalesWithOpenOrder_IsBlocked()
    {
        SalesSeed sale = await SeedSaleAsync(_branch);
        Order open = Order.Create(sale.Table.Id, _branch.Id);
        open.AddItem(sale.Product, 1);
        _db.Orders.Add(open);
        await _db.SaveChangesAsync();

        var result = await DeleteHandler().Handle(DeleteCommand([DataGroups.Sales]), default);

        Assert.False(result.IsSuccess);
        Assert.Contains("açık adisyon", result.Error);
        Assert.Equal(2, await _db.Orders.CountAsync());
    }

    [Fact]
    public async Task Delete_MenuWhileOrdersUseIt_IsBlocked_WithClearMessage()
    {
        await SeedSaleAsync(_branch);

        var preview = await new PreviewDataDeletionQueryHandler(_db, _owner).Handle(new PreviewDataDeletionQuery { Groups = [DataGroups.Menu] }, default);
        Assert.Contains(preview.Value!.Blockers, b => b.Contains("satış geçmişini"));

        var result = await DeleteHandler().Handle(DeleteCommand([DataGroups.Menu]), default);
        Assert.False(result.IsSuccess);
        Assert.Equal(1, await _db.Products.CountAsync());
        Assert.Equal(1, await _db.OrderItems.CountAsync());

        // Satış geçmişi tarihli seçilirse yeni adisyonlar kalır; yine engellenir.
        var dated = await DeleteHandler().Handle(DeleteCommand([DataGroups.Menu, DataGroups.Sales], "2020-01-01"), default);
        Assert.False(dated.IsSuccess);
    }

    [Fact]
    public async Task Delete_MenuTogetherWithAllSales_DeletesOwnPhotosButNeverShared()
    {
        await SeedSaleAsync(_branch, imageKey: "products/abc/own.webp");
        Category drinks = Category.Create("İçecek", _branch.Id);
        _db.Categories.Add(drinks);
        _db.Products.Add(Product.Create("Çay", 20m, "shared/stock/cay.webp", drinks.Id));
        await _db.SaveChangesAsync();

        var result = await DeleteHandler().Handle(DeleteCommand([DataGroups.Menu, DataGroups.Sales]), default);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Empty(await _db.Products.ToListAsync());
        Assert.Empty(await _db.Categories.ToListAsync());
        Assert.Empty(await _db.Orders.ToListAsync());
        Assert.Contains("products/abc/own.webp", _storage.DeletedKeys);
        Assert.DoesNotContain(_storage.DeletedKeys, StorageKeys.IsShared);
    }

    [Fact]
    public async Task Delete_TablesWithOrderHistory_IsBlocked_ButWorksWithSalesAndReservations()
    {
        SalesSeed sale = await SeedSaleAsync(_branch);
        _db.Reservations.Add(Reservation.Create(sale.Table, "Ali", "555", DateTime.UtcNow.AddDays(1), ""));
        await _db.SaveChangesAsync();

        var blocked = await DeleteHandler().Handle(DeleteCommand([DataGroups.Tables]), default);
        Assert.False(blocked.IsSuccess);
        Assert.Contains("adisyon", blocked.Error);
        Assert.Contains("rezervasyon", blocked.Error);
        Assert.Equal(1, await _db.Tables.CountAsync());

        var ok = await DeleteHandler().Handle(DeleteCommand([DataGroups.Tables, DataGroups.Sales, DataGroups.Reservations]), default);
        Assert.True(ok.IsSuccess, ok.Error);
        Assert.Empty(await _db.Tables.ToListAsync());
        Assert.Empty(await _db.Regions.ToListAsync());
        Assert.Empty(await _db.Reservations.ToListAsync());
    }

    [Fact]
    public async Task Delete_Staff_RemovesUsersOnlyHere_KeepsUsersWorkingElsewhere_AndNeverTheOwner()
    {
        User onlyHere = User.Create("Garson Bir", "", "5551111111");
        User alsoElsewhere = User.Create("Garson İki", "", "5552222222");
        _db.Users.AddRange(onlyHere, alsoElsewhere);

        User otherOwner = User.Create("Başka Sahip", "baska@test.com", "5553333333");
        _db.Users.Add(otherOwner);
        Company other = Company.Create("Başka Restoran", otherOwner);
        SetId(other, Guid.NewGuid());
        _db.Companies.Add(other);
        Branch otherBranch = AddBranch("Başka Şube", other);

        _db.UserBranches.Add(UserBranch.Create(onlyHere, _branch, "garson1", null, UserRole.Waiter));
        _db.UserBranches.Add(UserBranch.Create(alsoElsewhere, _branch, "garson2", null, UserRole.Waiter));
        _db.UserBranches.Add(UserBranch.Create(alsoElsewhere, otherBranch, "garson2", null, UserRole.Waiter));
        _db.RefreshTokens.Add(RefreshToken.Create(alsoElsewhere.Id, _branch.Id, UserRole.Waiter, "h1", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1), false, null, null));
        _db.RefreshTokens.Add(RefreshToken.Create(alsoElsewhere.Id, otherBranch.Id, UserRole.Waiter, "h2", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1), false, null, null));
        await _db.SaveChangesAsync();

        var result = await DeleteHandler().Handle(DeleteCommand([DataGroups.Staff], null, _branch.Id), default);

        Assert.True(result.IsSuccess, result.Error);
        Assert.False(await _db.Users.AnyAsync(u => u.Id == onlyHere.Id));
        Assert.True(await _db.Users.AnyAsync(u => u.Id == alsoElsewhere.Id));
        Assert.True(await _db.Users.AnyAsync(u => u.Id == _ownerUser.Id));
        Assert.False(await _db.UserBranches.AnyAsync(ub => ub.BranchId == _branch.Id));
        Assert.True(await _db.UserBranches.AnyAsync(ub => ub.BranchId == otherBranch.Id));
        Assert.Equal("h2", (await _db.RefreshTokens.SingleAsync()).TokenHash);
    }

    [Theory]
    [InlineData("Yanlış Ad", Password, OwnerDataAccess.WrongNameMessage)]
    [InlineData(CompanyName, "yanlis", OwnerDataAccess.WrongPasswordMessage)]
    [InlineData("  silme   TESTİ ", "", OwnerDataAccess.WrongPasswordMessage)]
    public async Task Delete_WrongNameOrPassword_DeletesNothing(string name, string password, string expected)
    {
        await SeedSaleAsync(_branch);
        DeleteDataCommand command = DeleteCommand([DataGroups.Sales]);
        command.RestaurantName = name;
        command.Password = password;

        var result = await DeleteHandler().Handle(command, default);

        Assert.False(result.IsSuccess);
        Assert.Equal(expected, result.Error);
        Assert.Equal(1, await _db.Orders.CountAsync());
    }

    [Fact]
    public async Task Delete_NameMatchIgnoresCaseAndSpaces_TurkishAware()
    {
        await SeedSaleAsync(_branch);
        DeleteDataCommand command = DeleteCommand([DataGroups.Sales]);
        command.RestaurantName = "  silme   TESTİ ";

        var result = await DeleteHandler().Handle(command, default);

        Assert.True(result.IsSuccess, result.Error);
        Assert.Equal(0, await _db.Orders.CountAsync());
    }

    [Fact]
    public async Task OwnerOnly_AdminAndOtherCompaniesOwnerAreRejected()
    {
        await SeedSaleAsync(_branch);
        var admin = new FakeCurrentUserService { UserId = _owner.UserId, CompanyId = _company.Id, BranchId = _branch.Id, Role = "Admin" };
        var stranger = new FakeCurrentUserService { UserId = Guid.NewGuid(), CompanyId = _company.Id, BranchId = _company.Id, Role = "Owner" };

        var byAdmin = await DeleteHandler(admin).Handle(DeleteCommand([DataGroups.Sales]), default);
        var byStranger = await DeleteHandler(stranger).Handle(DeleteCommand([DataGroups.Sales]), default);
        var closeByAdmin = await new CloseAccountCommandHandler(_db, admin, new FakePasswordHasher(), NullLogger<CloseAccountCommandHandler>.Instance)
            .Handle(new CloseAccountCommand { RestaurantName = CompanyName, Password = Password }, default);

        Assert.Equal(OwnerDataAccess.OwnerOnlyMessage, byAdmin.Error);
        Assert.Equal(OwnerDataAccess.CompanyNotFoundMessage, byStranger.Error);
        Assert.Equal(OwnerDataAccess.OwnerOnlyMessage, closeByAdmin.Error);
        Assert.Equal(1, await _db.Orders.CountAsync());
        Assert.False((await _db.Companies.SingleAsync(c => c.Id == _company.Id)).IsClosed);
    }

    // ── Sıfırla ──────────────────────────────────────────────────────────────────────────────────────

    /// <summary>Şirketin sitesini (şirket geneli) yayına alır.</summary>
    private void PublishSite(SiteSnapshot site)
    {
        _company.SaveSiteDraft(site, DateTime.UtcNow);
        _company.PublishSiteDraft(DateTime.UtcNow);
    }

    [Fact]
    public async Task Reset_RestoresRegistrationDefaults_KeepsHistoryAndIdentity()
    {
        SalesSeed sale = await SeedSaleAsync(_branch);
        _branch.SetReservationSettings(ReservationSettings.Default(new TimeOnly(9, 0), new TimeOnly(22, 0)));
        _branch.SetQrFeatures(QrFeatures.Create(false, false, false, false, false));
        _branch.SetOnlineOrdersPaused(true);
        _branch.UpdateSiteInfo(new TimeOnly(9, 0), new TimeOnly(22, 0), "Pazar kapalı", [], "0532 000 48 48", "Metroya 4 dk.");
        PublishSite(SiteSnapshot.Empty with
        {
            Headline = "Başlık", Tagline = "Slogan", StoryTitle = "Hikâye", About = "Hakkında",
            CoverImage = $"site/{_branch.Id:N}/cover.webp", Content = SiteContent.Empty.WithGalleryImage("shared/stock/salon.webp"),
        });
        _branch.UpdateDayEndSettings(new TimeOnly(4, 0), "Europe/London");
        _db.DeliveryZones.Add(DeliveryZone.Create(_branch.Id, "Moda", 20m, 100m, 30, 0));
        await _db.SaveChangesAsync();

        var handler = new ResetSettingsCommandHandler(_db, _owner, new FakePasswordHasher(), _storage, NullLogger<ResetSettingsCommandHandler>.Instance);
        var result = await handler.Handle(new ResetSettingsCommand
        {
            Items = [.. ResetItems.All],
            RestaurantName = CompanyName,
            Password = Password,
        }, default);

        Assert.True(result.IsSuccess, result.Error);
        Branch branch = await _db.Branches.SingleAsync(b => b.Id == _branch.Id);
        Assert.Null(branch.ReservationSettings);
        Assert.Null(branch.OnlineOrderSettings);
        Assert.False(branch.OnlineOrdersPaused);
        Assert.Null(branch.QrFeatures);
        Assert.Null(branch.OpensAt);
        // Site şirket genelidir: şirketin sitesi sıfırlanır, şubenin WhatsApp ve nasıl gelinir bilgisi boşalır.
        Company company = await _db.Companies.SingleAsync(c => c.Id == _company.Id);
        Assert.Null(company.Site);
        Assert.Equal(string.Empty, company.GetPublishedSite().Headline);
        Assert.Empty(company.GetPublishedSite().Content.GalleryImages);
        Assert.Equal(string.Empty, branch.GetSiteContent().WhatsappPhone);
        Assert.Equal(string.Empty, branch.GetSiteContent().DirectionsNote);
        Assert.Equal(new TimeOnly(0, 0), branch.DayEndTime);
        Assert.Equal("Europe/Istanbul", branch.TimeZoneId);
        Assert.Equal(Branch.DefaultTaxRate, branch.TaxRate);
        Assert.Equal(string.Empty, branch.OpenAddress);
        Assert.Equal(_ownerUser.FullName, branch.ManagerName);
        Assert.Empty(await _db.DeliveryZones.ToListAsync());

        // Kimlik ve geçmiş yerinde.
        Assert.Equal("Merkez", branch.BranchName);
        Assert.Equal("silme-testi", (await _db.Companies.SingleAsync(c => c.Id == _company.Id)).Slug);
        Assert.True(await _db.Orders.AnyAsync(o => o.Id == sale.Order.Id));

        Assert.Contains($"site/{_branch.Id:N}/cover.webp", _storage.DeletedKeys);
        Assert.DoesNotContain(_storage.DeletedKeys, StorageKeys.IsShared);
    }

    [Fact]
    public async Task Reset_OnlyWorkingHours_KeepsSiteTexts()
    {
        _branch.UpdateSiteInfo(new TimeOnly(9, 0), new TimeOnly(22, 0), "Not", [], "0532 000 48 48", "");
        PublishSite(SiteSnapshot.Empty with { Headline = "Başlık", Tagline = "Slogan" });
        await _db.SaveChangesAsync();

        var handler = new ResetSettingsCommandHandler(_db, _owner, new FakePasswordHasher(), _storage, NullLogger<ResetSettingsCommandHandler>.Instance);
        var result = await handler.Handle(new ResetSettingsCommand { Items = [ResetItems.WorkingHours], RestaurantName = CompanyName, Password = Password }, default);

        Assert.True(result.IsSuccess, result.Error);
        Branch branch = await _db.Branches.SingleAsync(b => b.Id == _branch.Id);
        Assert.Null(branch.OpensAt);
        Assert.Equal(string.Empty, branch.HoursNote);
        Assert.Equal("0532 000 48 48", branch.GetSiteContent().WhatsappPhone);
        Assert.Equal("Başlık", (await _db.Companies.SingleAsync(c => c.Id == _company.Id)).GetPublishedSite().Headline);
    }

    // ── Hesabı kapat ─────────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Close_ThenCancel_StopsStaffAndPublicSite_ThenRestoresEverything()
    {
        User waiter = User.Create("Garson", "", "5551111111");
        _db.Users.Add(waiter);
        _db.UserBranches.Add(UserBranch.Create(waiter, _branch, "garson", null, UserRole.Waiter));
        _db.RefreshTokens.Add(RefreshToken.Create(waiter.Id, _branch.Id, UserRole.Waiter, "staff", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1), false, null, null));
        _db.RefreshTokens.Add(RefreshToken.Create(_ownerUser.Id, _company.Id, UserRole.Owner, "owner", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1), false, null, null));
        await _db.SaveChangesAsync();

        CompanyClosureCache cache = new();
        var close = await new CloseAccountCommandHandler(_db, _owner, new FakePasswordHasher(), NullLogger<CloseAccountCommandHandler>.Instance, cache)
            .Handle(new CloseAccountCommand { RestaurantName = CompanyName, Password = Password }, default);

        Assert.True(close.IsSuccess, close.Error);
        Company company = await _db.Companies.SingleAsync(c => c.Id == _company.Id);
        Assert.True(company.IsClosed);
        Assert.Equal(company.ClosedAt!.Value.AddDays(30), company.DeletionScheduledAt);
        Assert.NotNull((await _db.RefreshTokens.SingleAsync(t => t.TokenHash == "staff")).RevokedAt);
        Assert.Null((await _db.RefreshTokens.SingleAsync(t => t.TokenHash == "owner")).RevokedAt);
        Assert.True(cache.TryGet(company.Id, DateTime.UtcNow, out bool closed) && closed);

        // Müşteri sitesi ve personel girişi durur; sahip girebilir ve "kapanıyor" bilgisini alır.
        var tenant = new FakeTenantResolver { Slug = "silme-testi" };
        Assert.Null(await CustomerSiteScope.ResolveCompanyAsync(_db, tenant, default));
        Assert.True(await CustomerSiteScope.IsClosedAsync(_db, tenant, default));

        waiter.SetPasswordHash($"hashed_{Password}");
        await _db.SaveChangesAsync();
        var login = new LoginCommandHandler(_db, new FakePasswordHasher(), new FakeJwtTokenGenerator(), tenant, new ConfigurationBuilder().Build());
        var staffLogin = await login.Handle(new LoginCommand { UserName = "garson", Password = Password }, default);
        Assert.Equal(LoginCommandHandler.ClosedRestaurantMessage, staffLogin.Error);
        var ownerLogin = await login.Handle(new LoginCommand { Email = "ayse@test.com", Password = Password }, default);
        Assert.True(ownerLogin.IsSuccess, ownerLogin.Error);
        Assert.True(ownerLogin.Value!.AccountClosing);

        var cancel = await new CancelAccountClosureCommandHandler(_db, _owner, NullLogger<CancelAccountClosureCommandHandler>.Instance, cache)
            .Handle(new CancelAccountClosureCommand(), default);

        Assert.True(cancel.IsSuccess, cancel.Error);
        company = await _db.Companies.SingleAsync(c => c.Id == _company.Id);
        Assert.False(company.IsClosed);
        Assert.Null(company.DeletionScheduledAt);
        Assert.NotNull(await CustomerSiteScope.ResolveCompanyAsync(_db, tenant, default));
        Assert.True((await login.Handle(new LoginCommand { UserName = "garson", Password = Password }, default)).IsSuccess);
    }

    [Fact]
    public async Task Close_WrongPassword_KeepsCompanyOpen()
    {
        var result = await new CloseAccountCommandHandler(_db, _owner, new FakePasswordHasher(), NullLogger<CloseAccountCommandHandler>.Instance)
            .Handle(new CloseAccountCommand { RestaurantName = CompanyName, Password = "yanlis" }, default);

        Assert.Equal(OwnerDataAccess.WrongPasswordMessage, result.Error);
        Assert.False((await _db.Companies.SingleAsync(c => c.Id == _company.Id)).IsClosed);
    }

    [Fact]
    public async Task Refresh_StaffSessionOfClosedCompany_IsRejected()
    {
        User waiter = User.Create("Garson", "", "5551111111");
        _db.Users.Add(waiter);
        _db.UserBranches.Add(UserBranch.Create(waiter, _branch, "garson", null, UserRole.Waiter));
        const string raw = "ham-token";
        _db.RefreshTokens.Add(RefreshToken.Create(waiter.Id, _branch.Id, UserRole.Waiter, RefreshTokenHasher.Hash(raw),
            DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1), false, null, null));
        _company.Close(DateTime.UtcNow);
        await _db.SaveChangesAsync();

        var handler = new RefreshTokenCommandHandler(_db, new FakeJwtTokenGenerator(), new ConfigurationBuilder().Build());
        var result = await handler.Handle(new RefreshTokenCommand { RefreshToken = raw }, default);

        Assert.False(result.IsSuccess);
    }

    // ── 30 gün sonra kalıcı silme ────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Purge_AfterGracePeriod_DeletesCompanyAndOwnFiles_NeverShared_AndIsIdempotent()
    {
        SalesSeed sale = await SeedSaleAsync(_branch, imageKey: $"products/{_branch.Id:N}/adana.webp");
        Category drinks = Category.Create("İçecek", _branch.Id);
        _db.Categories.Add(drinks);
        _db.Products.Add(Product.Create("Çay", 20m, "shared/stock/cay.webp", drinks.Id));
        PublishSite(SiteSnapshot.Empty with
        {
            CoverImage = $"site/{_branch.Id:N}/cover.webp", Content = SiteContent.Empty.WithGalleryImage("shared/stock/salon.webp"),
        });
        _db.Reservations.Add(Reservation.Create(sale.Table, "Ali", "555", DateTime.UtcNow.AddDays(1), ""));
        _db.ContactMessages.Add(ContactMessage.Create(_branch.Id, "Ali", "555", ContactMessageType.Oneri, "Güzel"));
        _db.AuditLogs.Add(AuditLog.Create(_branch.Id, "Ayşe", AuditLogCategory.System, AuditLogSeverity.Info, "X", "x"));
        _db.DeliveryZones.Add(DeliveryZone.Create(_branch.Id, "Moda", 20m, 100m, 30, 0));

        User waiter = User.Create("Garson", "", "5551111111");
        User shared = User.Create("İki İşli", "", "5552222222");
        _db.Users.AddRange(waiter, shared);
        _db.UserBranches.Add(UserBranch.Create(waiter, _branch, "garson", null, UserRole.Waiter));
        _db.UserBranches.Add(UserBranch.Create(shared, _branch, "iki", null, UserRole.Cashier));

        // Başka bir şirket: dokunulmamalı.
        User otherOwner = User.Create("Başka Sahip", "baska@test.com", "5553333333");
        _db.Users.Add(otherOwner);
        Company other = Company.Create("Başka", otherOwner);
        SetId(other, Guid.NewGuid());
        other.Slug = "baska";
        _db.Companies.Add(other);
        Branch otherBranch = AddBranch("Başka Şube", other);
        _db.UserBranches.Add(UserBranch.Create(shared, otherBranch, "iki", null, UserRole.Cashier));
        _db.RefreshTokens.Add(RefreshToken.Create(_ownerUser.Id, _company.Id, UserRole.Owner, "owner", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(1), false, null, null));

        DateTime closedAt = new(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        _company.Close(closedAt);
        await _db.SaveChangesAsync();

        var purger = new CompanyPurger(_db, _storage, NullLogger<CompanyPurger>.Instance);

        // Süre dolmadan hiçbir şey silinmez.
        Assert.Equal(0, await purger.PurgeDueAsync(closedAt.AddDays(29), default));
        Assert.True(await _db.Companies.AnyAsync(c => c.Id == _company.Id));

        Assert.Equal(1, await purger.PurgeDueAsync(closedAt.AddDays(30), default));

        Assert.False(await _db.Companies.AnyAsync(c => c.Id == _company.Id));
        Assert.False(await _db.Branches.AnyAsync(b => b.CompanyId == _company.Id));
        Assert.Empty(await _db.Orders.ToListAsync());
        Assert.Empty(await _db.Products.ToListAsync());
        Assert.Empty(await _db.Tables.ToListAsync());
        Assert.Empty(await _db.Reservations.ToListAsync());
        Assert.Empty(await _db.CashRegisters.ToListAsync());
        Assert.Empty(await _db.DeliveryZones.ToListAsync());
        Assert.Empty(await _db.ContactMessages.ToListAsync());
        Assert.False(await _db.AuditLogs.AnyAsync(a => a.BranchId == _branch.Id));
        Assert.Empty(await _db.RefreshTokens.ToListAsync());
        Assert.False(await _db.Users.AnyAsync(u => u.Id == _ownerUser.Id || u.Id == waiter.Id));

        // Başka şirket ve oradaki çalışan yerinde.
        Assert.True(await _db.Companies.AnyAsync(c => c.Id == other.Id));
        Assert.True(await _db.Users.AnyAsync(u => u.Id == shared.Id));
        Assert.True(await _db.UserBranches.AnyAsync(ub => ub.BranchId == otherBranch.Id));

        Assert.Contains($"products/{_branch.Id:N}/adana.webp", _storage.DeletedKeys);
        Assert.Contains($"site/{_branch.Id:N}/cover.webp", _storage.DeletedKeys);
        Assert.Contains($"products/{_branch.Id:N}/", _storage.DeletedFolders);
        Assert.Contains($"site/{_branch.Id:N}/", _storage.DeletedFolders);
        Assert.Contains($"products/{_company.Id:N}/", _storage.DeletedFolders);
        Assert.DoesNotContain(_storage.DeletedKeys, StorageKeys.IsShared);
        Assert.DoesNotContain(_storage.DeletedFolders, StorageKeys.IsShared);
        Assert.DoesNotContain(_storage.DeletedFolders, f => f.Contains(otherBranch.Id.ToString("N")));

        // Slug boşa çıktı; ikinci tur bir şey yapmaz.
        Assert.False(await _db.Companies.AnyAsync(c => c.Slug == "silme-testi"));
        Assert.Equal(0, await purger.PurgeDueAsync(closedAt.AddDays(31), default));
    }

    [Fact]
    public async Task Purge_CdnFailure_DoesNotRollBackDataDeletion()
    {
        await SeedSaleAsync(_branch, imageKey: $"products/{_branch.Id:N}/adana.webp");
        _company.Close(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        await _db.SaveChangesAsync();
        _storage.ThrowOnDelete = true;

        int purged = await new CompanyPurger(_db, _storage, NullLogger<CompanyPurger>.Instance).PurgeDueAsync(new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc), default);

        Assert.Equal(1, purged);
        Assert.False(await _db.Companies.AnyAsync(c => c.Id == _company.Id));
        Assert.Empty(await _db.Orders.ToListAsync());
    }

    [Fact]
    public async Task Purge_CancelledClosure_IsNotPurged()
    {
        _company.Close(new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc));
        _company.CancelClosure();
        await _db.SaveChangesAsync();

        int purged = await new CompanyPurger(_db, _storage, NullLogger<CompanyPurger>.Instance).PurgeDueAsync(new DateTime(2026, 3, 1, 0, 0, 0, DateTimeKind.Utc), default);

        Assert.Equal(0, purged);
        Assert.True(await _db.Companies.AnyAsync(c => c.Id == _company.Id));
    }

    // ── CSV ──────────────────────────────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Export_Sales_ZipHasOrdersAndPaymentsCsv()
    {
        await SeedSaleAsync(_branch);

        var result = await new ExportDataQueryHandler(_db, _owner).Handle(new ExportDataQuery { Groups = [DataGroups.Sales, DataGroups.Menu] }, default);

        Assert.True(result.IsSuccess, result.Error);
        using ZipArchive zip = new(new MemoryStream(result.Value!.Content));
        Assert.Contains(zip.Entries, e => e.Name == "odemeler.csv");
        using StreamReader reader = new(zip.GetEntry("siparisler.csv")!.Open(), Encoding.UTF8);
        string csv = await reader.ReadToEndAsync();
        Assert.Contains("Adana", csv);
        Assert.Contains("Merkez", csv);

        var menuOnly = await new ExportDataQueryHandler(_db, _owner).Handle(new ExportDataQuery { Groups = [DataGroups.Menu] }, default);
        Assert.False(menuOnly.IsSuccess);
    }
}
