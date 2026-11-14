namespace RestaurantBill.Application.Interfaces;

// İsteği yapan istemcinin adresi (girişsiz uçlarda kötüye kullanım sınırları için). Proxy arkasında X-Forwarded-For'un
// ilk adresidir; bilinmiyorsa boş.
public interface IClientInfo
{
    string IpAddress { get; }
}
