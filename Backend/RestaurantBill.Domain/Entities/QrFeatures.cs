namespace RestaurantBill.Domain.Entities
{
    /// <summary>
    /// Masa QR'ının açtığı karşılama ekranında müşteriye açık işlemler (değişmez değer nesnesi). Şubede hiç
    /// kaydedilmemişse <see cref="Default"/> geçerlidir: hepsi açık (bugünkü davranış).
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

        private QrFeatures(bool orderingEnabled, bool callWaiterEnabled, bool billRequestEnabled, bool deliveryLinkEnabled, bool reservationLinkEnabled)
        {
            OrderingEnabled = orderingEnabled;
            CallWaiterEnabled = callWaiterEnabled;
            BillRequestEnabled = billRequestEnabled;
            DeliveryLinkEnabled = deliveryLinkEnabled;
            ReservationLinkEnabled = reservationLinkEnabled;
        }

        public static QrFeatures Create(bool orderingEnabled, bool callWaiterEnabled, bool billRequestEnabled, bool deliveryLinkEnabled, bool reservationLinkEnabled)
            => new(orderingEnabled, callWaiterEnabled, billRequestEnabled, deliveryLinkEnabled, reservationLinkEnabled);

        public static QrFeatures Default { get; } = new(true, true, true, true, true);
    }
}
