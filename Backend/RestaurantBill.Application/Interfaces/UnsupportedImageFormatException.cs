namespace RestaurantBill.Application.Interfaces;

/// <summary>
/// Yüklenen görsel kabul edilmedi; <see cref="Exception.Message"/> doğrudan kullanıcıya gösterilir.
/// <see cref="IImageStorageService"/> fırlatır, yükleme handler'ları <c>Result.Failure</c>'a çevirir.
/// </summary>
public abstract class ImageUploadException : Exception
{
    protected ImageUploadException(string userMessage, Exception? innerException = null)
        : base(userMessage, innerException)
    {
    }
}

/// <summary>
/// Dosyanın içeriği (istemcinin gönderdiği Content-Type değil, dosyanın kendisi) izin verilen
/// görsel biçimlerinden (JPEG, PNG, WebP) biri değil.
/// </summary>
public sealed class UnsupportedImageFormatException : ImageUploadException
{
    public const string UserMessage = "Desteklenmeyen görsel biçimi. JPEG, PNG veya WebP yükleyin.";

    public UnsupportedImageFormatException(Exception? innerException = null)
        : base(UserMessage, innerException)
    {
    }
}

/// <summary>Görselin piksel sayısı sınırı aşıyor (sıkıştırma bombasına karşı, tam çözümlemeden önce kontrol edilir).</summary>
public sealed class ImageTooLargeException : ImageUploadException
{
    public const string UserMessage = "Görselin çözünürlüğü çok yüksek. En fazla 40 megapiksel bir görsel yükleyin.";

    public ImageTooLargeException()
        : base(UserMessage)
    {
    }
}
