using RestaurantBill.Application.Interfaces;
using SkiaSharp;

namespace RestaurantBill.Infrastructure.Services
{
    /// <summary>
    /// Yüklenen görseli doğrular, sınır kutusuna sığdırır ve WebP'ye çevirir (SkiaSharp, MIT).
    /// Biçim dosyanın baytlarından (SKCodec) tespit edilir; istemcinin Content-Type'ına güvenilmez.
    /// </summary>
    public static class UploadImageProcessor
    {
        /// <summary>
        /// Yalnızca bu biçimler çözülür (savunma derinliği): Skia GIF, BMP, ICO, WBMP vb. de okuyabilir ama
        /// bunlara ihtiyacımız yok; kabul edilen saldırı yüzeyini dar tutuyoruz.
        /// </summary>
        private static readonly HashSet<SKEncodedImageFormat> AllowedFormats =
            [SKEncodedImageFormat.Jpeg, SKEncodedImageFormat.Png, SKEncodedImageFormat.Webp];

        /// <summary>Sıkıştırma bombası sınırı: küçük bir dosya devasa boyut bildirebilir; tam çözümlemeden önce reddedilir.</summary>
        public const long MaxPixelCount = 40_000_000;

        public const int WebpQuality = 80;

        /// <summary>
        /// Görseli çözer; <paramref name="maxSize"/>×<paramref name="maxSize"/> kutusundan büyükse en-boy oranını koruyarak
        /// küçültür (küçük görseller büyütülmez, olduğu boyutta kalır), EXIF yönünü piksellere uygular ve kalite 80 WebP olarak döner.
        /// </summary>
        /// <exception cref="UnsupportedImageFormatException">Dosya JPEG, PNG ya da WebP değil.</exception>
        /// <exception cref="ImageTooLargeException">Piksel sayısı <see cref="MaxPixelCount"/>'u aşıyor.</exception>
        /// <exception cref="InvalidDataException">Biçim tanındı ama içerik çözülemedi/kodlanamadı.</exception>
        public static byte[] ToWebp(byte[] content, int maxSize)
        {
            using SKData data = SKData.CreateCopy(content);
            using SKCodec? codec = SKCodec.Create(data);
            if (codec is null || !AllowedFormats.Contains(codec.EncodedFormat))
                throw new UnsupportedImageFormatException();

            SKImageInfo sourceInfo = codec.Info;
            if (sourceInfo.Width <= 0 || sourceInfo.Height <= 0)
                throw new InvalidDataException("Görsel boyutu okunamadı.");
            if ((long)sourceInfo.Width * sourceInfo.Height > MaxPixelCount)
                throw new ImageTooLargeException();

            using SKBitmap decoded = SKBitmap.Decode(codec)
                ?? throw new InvalidDataException("Görsel çözülemedi.");

            // Kutu kare olduğundan boyutu yön uygulanmadan önce hesaplamak sonucu değiştirmez.
            (int targetWidth, int targetHeight) = FitWithin(decoded.Width, decoded.Height, maxSize);
            bool shrink = targetWidth != decoded.Width || targetHeight != decoded.Height;

            // Kutuya zaten sığıyorsa yeniden örnekleme yok; yalnızca yön uygulanıp WebP'ye çevrilir.
            using SKBitmap? shrunk = shrink
                ? decoded.Resize(decoded.Info.WithSize(targetWidth, targetHeight), new SKSamplingOptions(SKFilterMode.Linear, SKMipmapMode.Linear))
                    ?? throw new InvalidDataException("Görsel yeniden boyutlandırılamadı.")
                : null;
            SKBitmap resized = shrunk ?? decoded;

            using SKBitmap? reoriented = codec.EncodedOrigin == SKEncodedOrigin.TopLeft
                ? null
                : ApplyOrigin(resized, codec.EncodedOrigin);
            using SKData webp = (reoriented ?? resized).Encode(SKEncodedImageFormat.Webp, WebpQuality)
                ?? throw new InvalidDataException("Görsel WebP'ye çevrilemedi.");
            return webp.ToArray();
        }

        /// <summary>
        /// Kutudan büyükse uzun kenarı <paramref name="maxSize"/> yapar (yuvarlama eski ImageSharp <c>ResizeMode.Max</c> ile aynı,
        /// en az 1 px); kutuya sığan görselin boyutunu değiştirmez. ImageSharp küçük görselleri de kutuya kadar büyütüyordu,
        /// bu bilerek bırakıldı: bulanıklaştırıyor ve dosyayı boşuna büyütüyordu.
        /// </summary>
        public static (int Width, int Height) FitWithin(int width, int height, int maxSize)
        {
            if (width <= maxSize && height <= maxSize)
                return (width, height);
            if (width > height)
                return (maxSize, Math.Max(1, (int)MathF.Round(height * (maxSize / (float)width))));
            return (Math.Max(1, (int)MathF.Round(width * (maxSize / (float)height))), maxSize);
        }

        /// <summary>
        /// EXIF yönünü piksellere uygular. ImageSharp çıktıda EXIF'i koruyordu (tarayıcı döndürüyordu); Skia WebP'ye
        /// meta veri yazmadığı için döndürmeyi burada yapmazsak telefon fotoğrafları yan görünür.
        /// </summary>
        private static SKBitmap ApplyOrigin(SKBitmap source, SKEncodedOrigin origin)
        {
            int w = source.Width, h = source.Height;
            bool swap = origin is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop
                or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;

            // x' = ScaleX·x + SkewX·y + TransX,  y' = SkewY·x + ScaleY·y + TransY
            SKMatrix matrix = origin switch
            {
                SKEncodedOrigin.TopRight => new SKMatrix(-1, 0, w, 0, 1, 0, 0, 0, 1),     // yatay ayna
                SKEncodedOrigin.BottomRight => new SKMatrix(-1, 0, w, 0, -1, h, 0, 0, 1), // 180°
                SKEncodedOrigin.BottomLeft => new SKMatrix(1, 0, 0, 0, -1, h, 0, 0, 1),   // dikey ayna
                SKEncodedOrigin.LeftTop => new SKMatrix(0, 1, 0, 1, 0, 0, 0, 0, 1),       // transpoze
                SKEncodedOrigin.RightTop => new SKMatrix(0, -1, h, 1, 0, 0, 0, 0, 1),     // 90° saat yönü
                SKEncodedOrigin.RightBottom => new SKMatrix(0, -1, h, -1, 0, w, 0, 0, 1), // ters transpoze
                SKEncodedOrigin.LeftBottom => new SKMatrix(0, 1, 0, -1, 0, w, 0, 0, 1),   // 90° saat yönü tersi
                _ => SKMatrix.Identity,
            };

            var result = new SKBitmap(source.Info.WithSize(swap ? h : w, swap ? w : h));
            using var canvas = new SKCanvas(result);
            canvas.Clear(SKColors.Transparent);
            canvas.SetMatrix(matrix);
            // Döndürme/ayna tam piksel eşlemesi; ara değer gerekmez.
            canvas.DrawBitmap(source, 0, 0, new SKSamplingOptions(SKFilterMode.Nearest), null);
            return result;
        }
    }
}
