using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;

namespace RestaurantBill.Domain.Entities;

public class Shift : BaseEntity
{
    public Guid BranchId { get; private set; }
    public Branch Branch { get; private set; } = default!;

    public Guid CashRegisterId { get; private set; }
    public CashRegister CashRegister { get; private set; } = default!;

    public Guid OpenedByUserId { get; private set; }
    public Guid? ClosedByUserId { get; private set; }

    public decimal ExpectedOpeningBalance { get; private set; }
    public decimal OpeningBalance { get; private set; }
    public decimal OpeningDifference { get; private set; }
    public DateTime? OpeningDifferenceApprovedAt { get; private set; }
    public Guid? OpeningDifferenceApprovedByUserId { get; private set; }
    public decimal ExpectedClosingBalance { get; private set; }
    public decimal? CountedClosingBalance { get; private set; }
    public decimal? Difference { get; private set; }

    public DateTime? ClosingDifferenceApprovedAt { get; private set; }
    public Guid? ClosingDifferenceApprovedByUserId { get; private set; }

    public DateTime OpenedAt { get; private set; }
    public DateTime? ClosedAt { get; private set; }

    public ShiftStatus Status { get; private set; } = ShiftStatus.Open;
    public string? Note { get; private set; }

    protected Shift() { }

    public static Shift Create(Guid branchId, Guid cashRegisterId, Guid openedByUserId, decimal expectedOpeningBalance, decimal openingBalance)
    {
        if (branchId == Guid.Empty)
            throw new DomainException("Geçersiz şube ID'si.");

        if (cashRegisterId == Guid.Empty)
            throw new DomainException("Geçersiz kasa ID'si.");

        if (openedByUserId == Guid.Empty)
            throw new DomainException("Geçersiz kullanıcı ID'si.");

        if (openingBalance < 0)
            throw new DomainException("Açılış bakiyesi negatif olamaz.");

        return new Shift
        {
            BranchId = branchId,
            CashRegisterId = cashRegisterId,
            OpenedByUserId = openedByUserId,
            ExpectedOpeningBalance = expectedOpeningBalance,
            OpeningBalance = openingBalance,
            OpeningDifference = openingBalance - expectedOpeningBalance,
            ExpectedClosingBalance = openingBalance,
            OpenedAt = DateTime.UtcNow
        };
    }

    public void Close(Guid closedByUserId, decimal expectedClosingBalance, decimal countedClosingBalance, string? note = null)
    {
        if (Status != ShiftStatus.Open)
            throw new DomainException("Bu vardiya zaten kapatılmış.");

        if (closedByUserId == Guid.Empty)
            throw new DomainException("Geçersiz kullanıcı ID'si.");

        if (countedClosingBalance < 0)
            throw new DomainException("Sayılan bakiye negatif olamaz.");

        ClosedByUserId = closedByUserId;
        ExpectedClosingBalance = expectedClosingBalance;
        CountedClosingBalance = countedClosingBalance;
        Difference = countedClosingBalance - expectedClosingBalance;
        ClosedAt = DateTime.UtcNow;
        Status = ShiftStatus.Closed;
        Note = note;
    }

    public void ApproveOpeningDifference(Guid approvedByUserId)
    {
        if (OpeningDifference == 0)
            throw new DomainException("Bu vardiyada onaylanacak bir açılış farkı yok.");

        if (OpeningDifferenceApprovedAt is not null)
            throw new DomainException("Bu vardiyanın açılış farkı zaten onaylanmış.");

        if (approvedByUserId == Guid.Empty)
            throw new DomainException("Geçersiz kullanıcı ID'si.");

        OpeningDifferenceApprovedAt = DateTime.UtcNow;
        OpeningDifferenceApprovedByUserId = approvedByUserId;
    }

    public void ApproveDifference(Guid approvedByUserId)
    {
        if (Status != ShiftStatus.Closed)
            throw new DomainException("Sadece kapanmış vardiyaların farkı onaylanabilir.");

        if (Difference is null or 0)
            throw new DomainException("Bu vardiyada onaylanacak bir fark yok.");

        if (ClosingDifferenceApprovedAt is not null)
            throw new DomainException("Bu vardiyanın farkı zaten onaylanmış.");

        if (approvedByUserId == Guid.Empty)
            throw new DomainException("Geçersiz kullanıcı ID'si.");

        ClosingDifferenceApprovedAt = DateTime.UtcNow;
        ClosingDifferenceApprovedByUserId = approvedByUserId;
    }
}
