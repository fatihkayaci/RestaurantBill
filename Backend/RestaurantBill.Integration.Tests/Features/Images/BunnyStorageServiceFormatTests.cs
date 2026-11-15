using System.Net;
using Microsoft.Extensions.Options;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Infrastructure.Services;
using SkiaSharp;

namespace RestaurantBill.Integration.Tests.Features.Images;

/// <summary>
/// Yükleme yalnızca JPEG/PNG/WebP kabul eder (biçim dosyanın baytlarından), 40 MP üstünü reddeder,
/// kutuya sığdırır, EXIF yönünü uygular ve WebP yükler. Reddedilen dosya için depoya istek gitmez.
/// </summary>
public class BunnyStorageServiceFormatTests
{
    private sealed class RecordingHandler : HttpMessageHandler
    {
        public int Calls { get; private set; }
        public byte[]? Body { get; private set; }
        public string? ContentType { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Calls++;
            Body = request.Content is null ? null : await request.Content.ReadAsByteArrayAsync(cancellationToken);
            ContentType = request.Content?.Headers.ContentType?.MediaType;
            return new HttpResponseMessage(HttpStatusCode.Created);
        }
    }

    private static (BunnyStorageService Service, RecordingHandler Handler) CreateService()
    {
        var handler = new RecordingHandler();
        var options = Options.Create(new BunnyStorageOptions { StorageZoneName = "test-zone", AccessKey = "test-key" });
        return (new BunnyStorageService(new HttpClient(handler), options), handler);
    }

    [Theory]
    [InlineData("shared/stock/adana.webp", 0)]
    [InlineData("products/branch/own.webp", 1)]
    public async Task Delete_NeverSendsARequest_ForSharedKeys(string key, int expectedCalls)
    {
        var (service, handler) = CreateService();

        await service.DeleteAsync(key, CancellationToken.None);

        Assert.Equal(expectedCalls, handler.Calls);
    }

    private static byte[] Encode(int width, int height, SKEncodedImageFormat format, Action<SKCanvas>? draw = null)
    {
        using var bitmap = new SKBitmap(width, height);
        using (var canvas = new SKCanvas(bitmap))
        {
            canvas.Clear(SKColors.White);
            draw?.Invoke(canvas);
        }
        using SKData data = bitmap.Encode(format, 90);
        return data.ToArray();
    }

    private static (SKEncodedImageFormat Format, int Width, int Height) Inspect(byte[] bytes)
    {
        using SKData data = SKData.CreateCopy(bytes);
        using SKCodec codec = SKCodec.Create(data);
        return (codec.EncodedFormat, codec.Info.Width, codec.Info.Height);
    }

    private static async Task AssertRejected<TException>(byte[] bytes) where TException : ImageUploadException
    {
        var (service, handler) = CreateService();
        using var stream = new MemoryStream(bytes);

        await Assert.ThrowsAsync<TException>(() => service.UploadAsync(stream, Guid.NewGuid(), CancellationToken.None));

        Assert.Equal(0, handler.Calls);
    }

    [Fact]
    public async Task Png_IsAccepted_AndUploadedAsWebp()
    {
        var (service, handler) = CreateService();
        using var png = new MemoryStream(Encode(40, 20, SKEncodedImageFormat.Png));

        string key = await service.UploadAsync(png, Guid.NewGuid(), CancellationToken.None);

        Assert.EndsWith(".webp", key);
        Assert.StartsWith("products/", key);
        Assert.Equal(1, handler.Calls);
        Assert.Equal("image/webp", handler.ContentType);
        Assert.Equal(SKEncodedImageFormat.Webp, Inspect(handler.Body!).Format);
    }

    [Fact]
    public async Task Tiff_IsRejected_WithTurkishMessage_WithoutUploading()
    {
        // Küçük bir TIFF başlığı ("II*\0" + IFD ofseti): Skia'da TIFF çözücü yok, biçim tanınmaz.
        byte[] tiff = [0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        var (service, handler) = CreateService();
        using var stream = new MemoryStream(tiff);

        var ex = await Assert.ThrowsAsync<UnsupportedImageFormatException>(
            () => service.UploadAsync(stream, Guid.NewGuid(), CancellationToken.None));

        Assert.Equal("Desteklenmeyen görsel biçimi. JPEG, PNG veya WebP yükleyin.", ex.Message);
        Assert.Equal(0, handler.Calls);
    }

    [Fact]
    public async Task Bmp_IsRejected_EvenThoughSkiaCanDecodeIt()
    {
        // 1×1, 24 bit BMP: Skia çözebilir ama izin listesinde değil.
        byte[] bmp =
        [
            0x42, 0x4D, 0x3A, 0, 0, 0, 0, 0, 0, 0, 0x36, 0, 0, 0,
            0x28, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 24, 0, 0, 0, 0, 0, 4, 0, 0, 0,
            0x13, 0x0B, 0, 0, 0x13, 0x0B, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            0xFF, 0x00, 0x00, 0x00,
        ];
        Assert.Equal(SKEncodedImageFormat.Bmp, Inspect(bmp).Format);

        await AssertRejected<UnsupportedImageFormatException>(bmp);
    }

    [Fact]
    public async Task RandomBytes_AreRejected_WithoutUploading()
    {
        byte[] bytes = new byte[512];
        new Random(42).NextBytes(bytes);

        await AssertRejected<UnsupportedImageFormatException>(bytes);
    }

    [Fact]
    public async Task ImageAbove40Megapixels_IsRejected_BeforeDecoding()
    {
        // 8000×5001 = 40,008,000 piksel; tek renk olduğu için JPEG dosyası küçük kalır.
        byte[] jpeg = Encode(8000, 5001, SKEncodedImageFormat.Jpeg);

        await AssertRejected<ImageTooLargeException>(jpeg);
    }

    [Theory]
    [InlineData(1600, 400, 800, 800, 200)]  // yatay: uzun kenar 800'e iner
    [InlineData(300, 1200, 800, 200, 800)]  // dikey
    [InlineData(3000, 1000, 800, 800, 267)] // yuvarlama ImageSharp ile aynı
    [InlineData(100, 50, 800, 100, 50)]     // küçük görsel büyütülmez
    [InlineData(800, 600, 800, 800, 600)]   // kutuya tam sığan görsel aynı kalır
    [InlineData(2400, 1000, 2000, 2000, 833)] // site kapak sınırı
    public async Task Image_IsFittedToMaxSize_KeepingAspectRatio(int width, int height, int maxSize, int expectedWidth, int expectedHeight)
    {
        var (service, handler) = CreateService();
        using var png = new MemoryStream(Encode(width, height, SKEncodedImageFormat.Png));

        await service.UploadAsync(png, Guid.NewGuid(), "site", maxSize, CancellationToken.None);

        var (format, outWidth, outHeight) = Inspect(handler.Body!);
        Assert.Equal(SKEncodedImageFormat.Webp, format);
        Assert.Equal((expectedWidth, expectedHeight), (outWidth, outHeight));
    }

    [Fact]
    public async Task JpegWithExifOrientation6_IsRotatedClockwise()
    {
        // Sol yarı kırmızı, sağ yarı mavi; EXIF 6 = "görüntülerken 90° saat yönünde döndür" (telefon dik çekim).
        byte[] jpeg = Encode(200, 100, SKEncodedImageFormat.Jpeg, canvas =>
        {
            using var red = new SKPaint { Color = SKColors.Red };
            using var blue = new SKPaint { Color = SKColors.Blue };
            canvas.DrawRect(0, 0, 100, 100, red);
            canvas.DrawRect(100, 0, 100, 100, blue);
        });
        byte[] withExif = InsertExifOrientation(jpeg, 6);

        var (service, handler) = CreateService();
        using var stream = new MemoryStream(withExif);
        await service.UploadAsync(stream, Guid.NewGuid(), CancellationToken.None);

        using SKBitmap output = SKBitmap.Decode(handler.Body!);
        // Kutudan küçük olduğu için boyut korunur, yalnızca döndürülür: 200×100 → 100×200.
        Assert.Equal((100, 200), (output.Width, output.Height));
        SKColor top = output.GetPixel(50, 25);
        SKColor bottom = output.GetPixel(50, 175);
        Assert.True(top.Red > 200 && top.Blue < 60, $"üst kırmızı olmalı: {top}");
        Assert.True(bottom.Blue > 200 && bottom.Red < 60, $"alt mavi olmalı: {bottom}");
    }

    /// <summary>JPEG'in SOI işaretinden hemen sonra yalnızca Orientation etiketi olan bir EXIF APP1 bölümü ekler.</summary>
    private static byte[] InsertExifOrientation(byte[] jpeg, ushort orientation)
    {
        byte[] app1 =
        [
            0xFF, 0xE1, 0x00, 0x22,                         // APP1, uzunluk 34
            (byte)'E', (byte)'x', (byte)'i', (byte)'f', 0, 0,
            0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, // TIFF başlığı (little endian), IFD0 ofseti 8
            0x01, 0x00,                                     // 1 kayıt
            0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, // 0x0112 Orientation, SHORT, adet 1
            (byte)orientation, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00,                         // sonraki IFD yok
        ];
        return [.. jpeg.AsSpan(0, 2), .. app1, .. jpeg.AsSpan(2)];
    }
}
