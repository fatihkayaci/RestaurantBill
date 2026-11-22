namespace RestaurantBill.Domain.Entities
{
    /// <summary>
    /// Masa QR'ının açtığı menü ekranında müşteriye açık işlemler ve bölümler (değişmez değer nesnesi). Şubede hiç
    /// kaydedilmemişse <see cref="Default"/> geçerlidir: Popüler bölümü dışında hepsi açık (bugünkü davranış).
    /// </summary>
    public sealed class QrFeatures
    {
        /// <summary>Menüden sipariş talebi gönderme; kapalıysa menü yalnızca görüntülenir.</summary>
        public bool OrderingEnabled { get; }
        public bool CallWaiterEnabled { get; }
        /// <summary>Masanın açık hesabı için "Hesap iste".</summary>
        public bool BillRequestEnabled { get; }
        /// <summary>Paket servis sayfasına bağlantı; şube online sipariş almıyorsa yine görünmez.</summary>
        public bool DeliveryLinkEnabled { get; }
        /// <summary>Rezervasyon sayfasına bağlantı; online rezervasyon kapalıysa yine görünmez.</summary>
        public bool ReservationLinkEnabled { get; }
        /// <summary>Menü başındaki "Öne Çıkanlar" bölümü ("Sitede ve QR menüde öne çıkar" işaretli ürünler). Varsayılan açık.</summary>
        public bool FeaturedSectionEnabled { get; }
        /// <summary>"Popüler" bölümü: son 30 günde en çok satılanlar; yeterli satış yoksa görünmez. Varsayılan kapalı.</summary>
        public bool PopularSectionEnabled { get; }

        private QrFeatures(bool orderingEnabled, bool callWaiterEnabled, bool billRequestEnabled, bool deliveryLinkEnabled, bool reservationLinkEnabled,
            bool featuredSectionEnabled, bool popularSectionEnabled)
        {
            OrderingEnabled = orderingEnabled;
            CallWaiterEnabled = callWaiterEnabled;
            BillRequestEnabled = billRequestEnabled;
            DeliveryLinkEnabled = deliveryLinkEnabled;
            ReservationLinkEnabled = reservationLinkEnabled;
            FeaturedSectionEnabled = featuredSectionEnabled;
            PopularSectionEnabled = popularSectionEnabled;
        }

        public static QrFeatures Create(bool orderingEnabled, bool callWaiterEnabled, bool billRequestEnabled, bool deliveryLinkEnabled, bool reservationLinkEnabled,
            bool featuredSectionEnabled = true, bool popularSectionEnabled = false)
            => new(orderingEnabled, callWaiterEnabled, billRequestEnabled, deliveryLinkEnabled, reservationLinkEnabled,
                featuredSectionEnabled, popularSectionEnabled);

        public static QrFeatures Default { get; } = new(true, true, true, true, true, featuredSectionEnabled: true, popularSectionEnabled: false);
    }
}
