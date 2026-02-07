namespace RestaurantBill.Core.DTOs;
public class TableResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Note { get; set; } = string.Empty;
    public int Status { get; set; }
    public string UserName { get; set; } = string.Empty;
}
