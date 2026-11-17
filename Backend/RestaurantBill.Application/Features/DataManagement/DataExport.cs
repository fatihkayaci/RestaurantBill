using System.Globalization;
using System.IO.Compression;
using System.Text;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.DataManagement;

// "CSV olarak indir": seçilen şubelerin seçilen geçmiş gruplarını, silme ekranındaki tarih süzgeciyle, bir ZIP içinde
// grup başına CSV olarak verir. Excel'in Türkçe ayarı için ayraç ";" ve dosyalar UTF-8 BOM'ludur; saatler şubenin yerel saati.

public class ExportDataQuery : DataSelection, IRequest<Result<DataExportFile>>
{
}

public class ExportDataQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<ExportDataQuery, Result<DataExportFile>>
{
    public const string NoHistoryMessage = "İndirmek için en az bir geçmiş grubu seçin (satış, rezervasyon, paket sipariş, mesaj, işlem kaydı).";

    private static readonly CultureInfo Tr = CultureInfo.GetCultureInfo("tr-TR");

    public async Task<Result<DataExportFile>> Handle(ExportDataQuery request, CancellationToken cancellationToken)
    {
        (Company? company, List<DeletionPlan> plans, string? error) =
            await SelectionResolver.ResolveAsync(db, currentUser, request, tracking: false, cancellationToken);
        if (error is not null)
            return Result<DataExportFile>.Failure(error);

        List<string> groups = plans[0].Groups.Where(DataGroups.History.Contains).ToList();
        if (groups.Count == 0)
            return Result<DataExportFile>.Failure(NoHistoryMessage);

        Dictionary<string, Csv> files = [];
        Csv File(string name, params string[] header)
        {
            if (!files.TryGetValue(name, out Csv? csv))
                files[name] = csv = new Csv(header);
            return csv;
        }

        foreach (DeletionPlan plan in plans)
        {
            TimeZoneInfo zone = CustomerSiteScope.ZoneOf(plan.Branch.TimeZoneId);
            string Local(DateTime? utc) => utc is DateTime u
                ? TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(u, DateTimeKind.Utc), zone).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture)
                : string.Empty;
            string branch = plan.Branch.BranchName;
            Guid b = plan.BranchId;
            DateTime? c = plan.CutoffUtc;

            if (plan.Has(DataGroups.Sales))
            {
                var items = await db.OrderItems.AsNoTracking()
                    .Where(oi => oi.Order.BranchId == b && (c == null || oi.Order.CreatedAt < c))
                    .OrderBy(oi => oi.Order.CreatedAt)
                    .Select(oi => new
                    {
                        oi.OrderId, oi.Order.CreatedAt, oi.Order.Status, oi.Order.OrderType, Table = oi.Order.Table != null ? oi.Order.Table.Name : "",
                        OrderTotal = oi.Order.TotalPrice,
                        Name = oi.Product != null ? oi.Product.Name : oi.SetMenu != null ? oi.SetMenu.Name : "",
                        oi.Quantity, oi.UnitPrice, oi.TaxRate, ItemStatus = oi.Status, oi.Note,
                    })
                    .ToListAsync(cancellationToken);
                Csv orders = File("siparisler.csv", "Şube", "Adisyon", "Tarih", "Durum", "Tür", "Masa", "Ürün", "Adet", "Birim fiyat", "KDV %", "Kalem durumu", "Not", "Adisyon toplamı");
                foreach (var i in items)
                    orders.Add(branch, Short(i.OrderId), Local(i.CreatedAt), i.Status.ToString(), i.OrderType.ToString(), i.Table, i.Name,
                        i.Quantity.ToString(Tr), Money(i.UnitPrice), Money(i.TaxRate), i.ItemStatus.ToString(), i.Note, Money(i.OrderTotal));

                var payments = await db.Payments.AsNoTracking()
                    .Where(p => p.Order.BranchId == b && (c == null || p.Order.CreatedAt < c))
                    .OrderBy(p => p.CreatedAt)
                    .Select(p => new { p.Id, p.OrderId, p.CreatedAt, p.PaymentMethod, p.TotalAmount, p.Matrah, p.TaxAmount, p.DiscountAmount, p.DiscountNote, p.IsOnAccount })
                    .ToListAsync(cancellationToken);
                var lines = await db.PaymentLineItems.AsNoTracking()
                    .Where(l => l.Payment.Order.BranchId == b && (c == null || l.Payment.Order.CreatedAt < c))
                    .Select(l => new { l.PaymentId, l.ProductName, l.Quantity })
                    .ToListAsync(cancellationToken);
                ILookup<Guid, string> linesByPayment = lines.ToLookup(l => l.PaymentId, l => $"{l.Quantity} x {l.ProductName}");
                Csv paymentCsv = File("odemeler.csv", "Şube", "Ödeme", "Adisyon", "Tarih", "Yöntem", "Tutar", "Matrah", "KDV", "İndirim", "İndirim notu", "Hesaba", "Kalemler");
                foreach (var p in payments)
                    paymentCsv.Add(branch, Short(p.Id), Short(p.OrderId), Local(p.CreatedAt), p.PaymentMethod.ToString(), Money(p.TotalAmount),
                        Money(p.Matrah), Money(p.TaxAmount), Money(p.DiscountAmount), p.DiscountNote, p.IsOnAccount ? "Evet" : "Hayır",
                        string.Join(", ", linesByPayment[p.Id]));

                var shifts = await db.Shifts.AsNoTracking()
                    .Where(s => s.BranchId == b && (c == null || s.OpenedAt < c))
                    .OrderBy(s => s.OpenedAt)
                    .Select(s => new { s.Id, Register = s.CashRegister.Name, s.OpenedAt, s.ClosedAt, s.OpeningBalance, s.ExpectedClosingBalance, s.CountedClosingBalance, s.Difference, s.Status })
                    .ToListAsync(cancellationToken);
                Csv shiftCsv = File("vardiyalar.csv", "Şube", "Vardiya", "Kasa", "Açılış", "Kapanış", "Açılış bakiyesi", "Beklenen kapanış", "Sayılan kapanış", "Fark", "Durum");
                foreach (var s in shifts)
                    shiftCsv.Add(branch, Short(s.Id), s.Register, Local(s.OpenedAt), Local(s.ClosedAt), Money(s.OpeningBalance), Money(s.ExpectedClosingBalance),
                        Money(s.CountedClosingBalance), Money(s.Difference), s.Status.ToString());

                var cash = await db.CashTransactions.AsNoTracking()
                    .Where(t => t.CashRegister.BranchId == b && (c == null || t.CreatedAt < c))
                    .OrderBy(t => t.CreatedAt)
                    .Select(t => new { Register = t.CashRegister.Name, t.CreatedAt, t.Type, t.Amount })
                    .ToListAsync(cancellationToken);
                Csv cashCsv = File("kasa-hareketleri.csv", "Şube", "Kasa", "Tarih", "Tür", "Tutar");
                foreach (var t in cash)
                    cashCsv.Add(branch, t.Register, Local(t.CreatedAt), t.Type.ToString(), Money(t.Amount));
            }

            if (plan.Has(DataGroups.Reservations))
            {
                var rows = await db.Reservations.AsNoTracking()
                    .Where(r => r.Table.Region.BranchId == b && (c == null || r.ReservationTime < c))
                    .OrderBy(r => r.ReservationTime)
                    .Select(r => new { r.Code, r.ReservationTime, Table = r.Table.Name, r.GuestName, r.Contact, r.PartySize, r.Status, r.Note })
                    .ToListAsync(cancellationToken);
                Csv csv = File("rezervasyonlar.csv", "Şube", "Kod", "Tarih", "Masa", "Misafir", "İletişim", "Kişi", "Durum", "Not");
                foreach (var r in rows)
                    csv.Add(branch, r.Code, Local(r.ReservationTime), r.Table, r.GuestName, r.Contact, r.PartySize.ToString(Tr), r.Status.ToString(), r.Note);
            }

            if (plan.Has(DataGroups.Delivery))
            {
                var rows = await db.DeliveryOrders.AsNoTracking()
                    .Where(d => d.BranchId == b && (c == null || d.CreatedAt < c))
                    .OrderBy(d => d.CreatedAt)
                    .Select(d => new { d.Number, d.CreatedAt, d.Status, d.CustomerName, d.CustomerPhone, d.Address, d.ZoneName, d.Subtotal, d.DeliveryFee, d.Total, d.PaymentPreference })
                    .ToListAsync(cancellationToken);
                Csv csv = File("paket-siparisler.csv", "Şube", "No", "Tarih", "Durum", "Müşteri", "Telefon", "Adres", "Bölge", "Ara toplam", "Teslimat", "Toplam", "Ödeme");
                foreach (var d in rows)
                    csv.Add(branch, d.Number.ToString(Tr), Local(d.CreatedAt), d.Status.ToString(), d.CustomerName, d.CustomerPhone, d.Address, d.ZoneName,
                        Money(d.Subtotal), Money(d.DeliveryFee), Money(d.Total), d.PaymentPreference.ToString());
            }

            if (plan.Has(DataGroups.Messages))
            {
                var rows = await db.ContactMessages.AsNoTracking()
                    .Where(m => m.BranchId == b && (c == null || m.CreatedAt < c))
                    .OrderBy(m => m.CreatedAt)
                    .Select(m => new { m.CreatedAt, m.Type, m.Name, m.Contact, m.Message })
                    .ToListAsync(cancellationToken);
                Csv csv = File("mesajlar.csv", "Şube", "Tarih", "Tür", "Ad", "İletişim", "Mesaj");
                foreach (var m in rows)
                    csv.Add(branch, Local(m.CreatedAt), m.Type.ToString(), m.Name, m.Contact, m.Message);
            }

            if (plan.Has(DataGroups.AuditLogs))
            {
                var rows = await db.AuditLogs.AsNoTracking()
                    .Where(a => a.BranchId == b && (c == null || a.CreatedAt < c))
                    .OrderBy(a => a.CreatedAt)
                    .Select(a => new { a.CreatedAt, a.ActorName, a.Category, a.Severity, a.Action, a.Message })
                    .ToListAsync(cancellationToken);
                Csv csv = File("islem-kayitlari.csv", "Şube", "Tarih", "Kişi", "Kategori", "Önem", "İşlem", "Açıklama");
                foreach (var a in rows)
                    csv.Add(branch, Local(a.CreatedAt), a.ActorName, a.Category.ToString(), a.Severity.ToString(), a.Action, a.Message);
            }
        }

        using MemoryStream zip = new();
        using (ZipArchive archive = new(zip, ZipArchiveMode.Create, leaveOpen: true))
        {
            foreach ((string name, Csv csv) in files)
            {
                ZipArchiveEntry entry = archive.CreateEntry(name, CompressionLevel.Optimal);
                await using Stream stream = entry.Open();
                byte[] bytes = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray();
                await stream.WriteAsync(bytes, cancellationToken);
            }
        }

        string slug = string.IsNullOrWhiteSpace(company!.Slug) ? "restoran" : company.Slug;
        return Result<DataExportFile>.Success(new DataExportFile
        {
            FileName = $"{slug}-veriler-{DateTime.UtcNow:yyyy-MM-dd}.zip",
            Content = zip.ToArray(),
        });
    }

    private static string Short(Guid id) => id.ToString("N")[..8];
    private static string Money(decimal? value) => value?.ToString("0.##", Tr) ?? string.Empty;

    private sealed class Csv(string[] header)
    {
        private readonly StringBuilder _text = new StringBuilder().AppendLine(Line(header));

        public void Add(params string?[] cells) => _text.AppendLine(Line(cells));

        public override string ToString() => _text.ToString();

        // Ayraç, tırnak ya da satır sonu içeren hücre tırnağa alınır. "=", "+", "-", "@" ile başlayan metin Excel'de formül
        // sayılmasın diye başına ' eklenir (CSV enjeksiyonu): müşterinin yazdığı ad/not/mesaj da bu dosyaya girer.
        private static string Line(IEnumerable<string?> cells) => string.Join(';', cells.Select(Cell));

        private static string Cell(string? value)
        {
            string v = value ?? string.Empty;
            if (v.Length > 0 && "=+-@".Contains(v[0]) && !decimal.TryParse(v, NumberStyles.Number, Tr, out _))
                v = "'" + v;
            return v.IndexOfAny([';', '"', '\n', '\r']) >= 0 ? $"\"{v.Replace("\"", "\"\"")}\"" : v;
        }
    }
}
