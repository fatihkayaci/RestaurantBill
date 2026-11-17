namespace RestaurantBill.Application.DTOs.CustomerSite;

// Görsel site düzenleyicisi (Taslak + Yayınla). Ayrıntılı sözleşme: docs/site-editor.md.

public class SiteEditorDto
{
    /// <summary>Taslağın sürümü. Kaydet/geri al/yayınla/at isteklerinde geri gönderilir; eskiyse 409 döner.</summary>
    public int Version { get; set; }
    /// <summary>Taslak yayındakinden farklı mı ("N yayınlanmamış değişiklik").</summary>
    public bool HasChanges { get; set; }
    /// <summary>Değişen alanlar, ekrandaki sırayla. "Geri al": POST site/draft/revert { fields: [field] }.</summary>
    public List<SiteChangeDto> Changes { get; set; } = [];
    public DateTime? DraftUpdatedAt { get; set; }
    /// <summary>Son "Yayınla" (UTC); hiç yayınlanmadıysa null.</summary>
    public DateTime? PublishedAt { get; set; }
    /// <summary>Düzenleyicide görünen hâl (taslak yoksa yayındakiyle aynı). RegionDetails şubenin bütün bölümlerini içerir.</summary>
    public BranchSiteDto Draft { get; set; } = new();
    /// <summary>Müşterinin şu an gördüğü hâl.</summary>
    public BranchSiteDto Published { get; set; } = new();
    /// <summary>Taslağın Google/paylaşım değerleri (önizleme kartları için).</summary>
    public SiteEditorSeoDto Seo { get; set; } = new();
    /// <summary>"https://ocak.sophram.com"; slug yoksa boş.</summary>
    public string SiteUrl { get; set; } = string.Empty;
}

public class SiteChangeDto
{
    /// <summary>"coverImage", "tagline", "values", "region:{id}"...</summary>
    public string Field { get; set; } = string.Empty;
    /// <summary>"Kapak fotoğrafı", "Bölüm · Salon".</summary>
    public string Label { get; set; } = string.Empty;
    /// <summary>"Anasayfa", "Hakkımızda", "Mekân", "İletişim", "Tema", "Google ve paylaşım".</summary>
    public string Page { get; set; } = string.Empty;
}

public class SiteEditorSeoDto : SiteSeoDto
{
    public string AutoTitle { get; set; } = string.Empty;
    public string AutoDescription { get; set; } = string.Empty;
    public string AutoShareImageUrl { get; set; } = string.Empty;
    public bool TitleIsAuto { get; set; }
    public bool DescriptionIsAuto { get; set; }
    public bool ShareImageIsAuto { get; set; }
    /// <summary>Alt sayfaların otomatik başlıkları: { "/menu": "Menü · Ocak", ... }.</summary>
    public Dictionary<string, string> PageTitles { get; set; } = [];
}

/// <summary>Taslağa yazan isteklerin sonucu. Conflict: istemcinin sürümü eski; hiçbir şey yazılmadı, Editor güncel hâldir.</summary>
public class SiteDraftResultDto
{
    public bool Conflict { get; set; }
    public SiteEditorDto Editor { get; set; } = new();
}
