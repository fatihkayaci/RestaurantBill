using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities;
public class Company : BaseEntity
{
    public Guid OwnerUserId { get; private set; }
    public User OwnerUser { get; private set; } = default!;
    public string Name { get; private set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;


    protected Company(){ }

    public static Company Create(string name, User ownerUser)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Kategori adı boş olamaz.");

        if (ownerUser == null)
            throw new DomainException("Geçersiz Kullanıcı.");
        
        return new Company
        {
            Name = name,
            OwnerUser = ownerUser,
            OwnerUserId = ownerUser.Id
        };
    }

    // ── Hesap kapatma ──────────────────────────────────────────────────────────────────────────────
    // Sahibi hesabı kapatınca şirket hemen durur (personel girişi, müşteri sitesi, QR, sipariş). Sahip bekleme süresi
    // boyunca girip vazgeçebilir; süre dolunca arka plan işi şirketi ve tüm verisini kalıcı olarak siler.

    public const int ClosureGraceDays = 30;

    /// <summary>Hesabın kapatıldığı an; null ise şirket çalışıyor.</summary>
    public DateTime? ClosedAt { get; private set; }
    /// <summary>Bu andan sonra şirket kalıcı olarak silinir.</summary>
    public DateTime? DeletionScheduledAt { get; private set; }

    public bool IsClosed => ClosedAt is not null;

    public void Close(DateTime nowUtc)
    {
        if (IsClosed)
            throw new DomainException("Hesap zaten kapatılmış.");
        ClosedAt = nowUtc;
        DeletionScheduledAt = nowUtc.AddDays(ClosureGraceDays);
    }

    public void CancelClosure()
    {
        if (!IsClosed)
            throw new DomainException("Hesap kapatılmamış.");
        ClosedAt = null;
        DeletionScheduledAt = null;
    }

    public bool IsDueForDeletion(DateTime nowUtc) => IsClosed && DeletionScheduledAt is { } due && due <= nowUtc;

    // ── Restoran sitesi (şirket geneli, tek site) ──────────────────────────────────────────────────
    // Tasarım, yazılar, fotoğraflar ve SEO bütün şubelerde aynıdır; şubeye ait olanlar (saatler, WhatsApp, nasıl gelinir,
    // adres, menü) seçilen şubeden gelir (Branch.SiteFor). Taslak + Yayınla: müşteri sitesi yayındaki hâli (Site) okur,
    // düzenleyici yalnız taslağı (SiteDraft) değiştirir, Yayınla taslağı yayına kopyalar.

    /// <summary>Yayındaki site (jsonb); null ise hiç yayınlanmamış (boş site).</summary>
    public SiteSnapshot? Site { get; private set; }
    /// <summary>Yayınlanmamış taslak (jsonb); null ise taslak yok, düzenleyici yayındaki hâli gösterir.</summary>
    public SiteSnapshot? SiteDraft { get; private set; }
    /// <summary>Taslağın sürümü: her taslak yazımında, yayında ve atmada artar. Eski sürümle kaydetmek "başkası düzenledi" çatışmasıdır.</summary>
    public int SiteDraftVersion { get; private set; }
    public DateTime? SiteDraftUpdatedAt { get; private set; }
    public DateTime? SitePublishedAt { get; private set; }

    /// <summary>Müşterinin şu an gördüğü site (şubeye ait alanlar boş; şubeyle birleştirmek için Branch.SiteFor).</summary>
    public SiteSnapshot GetPublishedSite() => (Site ?? SiteSnapshot.Empty).WithoutBranchInfo();

    /// <summary>Düzenleyicide görünen hâl: taslak varsa o, yoksa yayındaki.</summary>
    public SiteSnapshot GetSiteDraft() => SiteDraft?.WithoutBranchInfo() ?? GetPublishedSite();

    public bool IsSiteDraftStale(int version) => version != SiteDraftVersion;

    public void SaveSiteDraft(SiteSnapshot draft, DateTime nowUtc)
    {
        SiteDraft = draft.WithoutBranchInfo();
        SiteDraftVersion++;
        SiteDraftUpdatedAt = nowUtc;
    }

    /// <summary>Taslağı yayına alır (yoksa bir şey değişmez) ve taslağı kapatır.</summary>
    public void PublishSiteDraft(DateTime nowUtc)
    {
        if (SiteDraft is { } draft)
            Site = draft.WithoutBranchInfo();
        SiteDraft = null;
        SiteDraftVersion++;
        SiteDraftUpdatedAt = null;
        SitePublishedAt = nowUtc;
    }

    /// <summary>Taslağı siler; site son yayınlanan hâline döner.</summary>
    public void DiscardSiteDraft()
    {
        SiteDraft = null;
        SiteDraftVersion++;
        SiteDraftUpdatedAt = null;
    }

    /// <summary>Yayında ya da taslakta kullanılan bütün site fotoğrafı anahtarları: bunlardan biri silinmez.</summary>
    public IReadOnlySet<string> SiteImageKeysInUse()
    {
        HashSet<string> keys = [.. GetPublishedSite().ImageKeys()];
        if (SiteDraft is { } draft) keys.UnionWith(draft.ImageKeys());
        return keys;
    }

    /// <summary>
    /// Sitenin metinleri, fotoğrafları, teması ve taslağı silinir. Artık kullanılmayan fotoğraf anahtarlarını döner
    /// (dosyaları silmek çağıranın işi; paylaşılan anahtarlar silinmez). Şubelerin saatleri ve WhatsApp'ı şubededir.
    /// </summary>
    public IReadOnlyList<string> ResetSite()
    {
        List<string> keys = [.. SiteImageKeysInUse()];
        Site = null;
        SiteDraft = null;
        SiteDraftVersion++;
        SiteDraftUpdatedAt = null;
        SitePublishedAt = null;
        return keys;
    }

    public void UpdateName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new DomainException("Marka adı boş olamaz.");

        Name = name;
    }
}