namespace RestaurantBill.Application.DTOs;
public class BulkCreateTablesResultDto
{
    /// <summary>Oluşturulan masaların adları.</summary>
    public List<string> CreatedNames { get; set; } = new();
    /// <summary>Bölgede zaten olduğu için atlanan adlar.</summary>
    public List<string> SkippedNames { get; set; } = new();
}
