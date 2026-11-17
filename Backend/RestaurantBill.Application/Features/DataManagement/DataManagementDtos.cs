namespace RestaurantBill.Application.Features.DataManagement;

public sealed record CountLineDto(string Label, int Count);

public class DeletionGroupDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public List<CountLineDto> Lines { get; set; } = [];
    /// <summary>Tarih süzgeci bu gruba uygulandı mı ("şu tarihten eski olanlar").</summary>
    public bool DateFiltered { get; set; }
}

public class BranchDeletionPreviewDto
{
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public List<DeletionGroupDto> Groups { get; set; } = [];
}

public class DeletionPreviewDto
{
    public List<BranchDeletionPreviewDto> Branches { get; set; } = [];
    /// <summary>Doluysa silme yapılamaz; her biri neyin önce yapılması gerektiğini söyler.</summary>
    public List<string> Blockers { get; set; } = [];
    public int TotalCount { get; set; }
}

public class ResetItemPreviewDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class BranchResetPreviewDto
{
    public Guid BranchId { get; set; }
    public string BranchName { get; set; } = string.Empty;
    public List<ResetItemPreviewDto> Items { get; set; } = [];
}

public class ResetPreviewDto
{
    public List<BranchResetPreviewDto> Branches { get; set; } = [];
}

public class DataOptionDto
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool AcceptsDate { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class DataBranchDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

/// <summary>"Verileri sil" sayfasının açılışı: şirketin adı (onayda yazılacak), şubeler ve seçenekler.</summary>
public class DataManagementOverviewDto
{
    public string CompanyName { get; set; } = string.Empty;
    public List<DataBranchDto> Branches { get; set; } = [];
    public List<DataOptionDto> Groups { get; set; } = [];
    public List<DataOptionDto> ResetItems { get; set; } = [];
    public int ClosureGraceDays { get; set; }
}

public class ClosureStatusDto
{
    public string CompanyName { get; set; } = string.Empty;
    public bool IsClosed { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime? DeletionScheduledAt { get; set; }
}

public class ClosurePreviewDto
{
    public string CompanyName { get; set; } = string.Empty;
    public int GraceDays { get; set; }
    public DateTime DeletionDate { get; set; }
    public List<BranchDeletionPreviewDto> Branches { get; set; } = [];
    public int StaffCount { get; set; }
}

public class DataExportFile
{
    public string FileName { get; set; } = string.Empty;
    public byte[] Content { get; set; } = [];
}
