namespace RestaurantBill.Domain.Enums;

// Restoran sitesindeki şubeye ait fotoğraflar.
public enum SiteImageSlot
{
    /// <summary>Ana sayfanın tam ekran giriş fotoğrafı.</summary>
    Cover = 1,
    /// <summary>"Hikâyemiz" bölümündeki fotoğraf.</summary>
    About = 2,
    /// <summary>Hakkımızda'daki usta / kurucu portresi.</summary>
    Founder = 3,
    /// <summary>Google/WhatsApp paylaşım önizlemesinin görseli; boşsa kapak kullanılır.</summary>
    Share = 4,

    // Alt sayfaların kendi kapakları; boşsa kapak (Mekân'da galeri → hikâye → kapak) kullanılır.
    /// <summary>Menü sayfasının kapağı.</summary>
    MenuHero = 5,
    /// <summary>Hakkımızda sayfasının kapağı.</summary>
    AboutHero = 6,
    /// <summary>Mekân sayfasının kapağı.</summary>
    VenueHero = 7,
    /// <summary>İletişim sayfasının kapağı.</summary>
    ContactHero = 8,
    /// <summary>Rezervasyon sayfasının kapağı.</summary>
    ReservationHero = 9
}
