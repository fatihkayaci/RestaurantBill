namespace RestaurantBill.Application.Common;

public class BunnyStorageOptions
{
    public const string SectionName = "BunnyStorage";

    public string StorageZoneName { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string AccessKey { get; set; } = string.Empty;
    public string CdnBaseUrl { get; set; } = string.Empty;
}
