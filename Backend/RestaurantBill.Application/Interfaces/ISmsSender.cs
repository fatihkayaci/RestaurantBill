namespace RestaurantBill.Application.Interfaces;

public interface ISmsSender
{
    /// <summary>Gerçek bir SMS sağlayıcısı yapılandırılmış mı. Yalnızca loglayan gönderici false döner; müşteri
    /// telefon doğrulaması (OTP) bu durumda istenmez.</summary>
    bool IsConfigured { get; }

    Task SendAsync(string phoneNumber, string message);
}
