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
    public Guid? OpeningAdjustmentTransactionId { get; private set; }
    public DifferenceReviewStatus OpeningDifferenceReviewStatus { get; private set; } = DifferenceReviewStatus.Pending;
    public DateTime? OpeningDifferenceReviewedAt { get; private set; }
    public Guid? OpeningDifferenceReviewedByUserId { get; private set; }
    public string? OpeningDifferenceReviewNote { get; private set; }

    public decimal ExpectedClosingBalance { get; private set; }
    public decimal? CountedClosingBalance { get; private set; }
    public decimal? Difference { get; private set; }
    public DifferenceReviewStatus? ClosingDifferenceReviewStatus { get; private set; }
    public DateTime? ClosingDifferenceReviewedAt { get; private set; }
    public Guid? ClosingDifferenceReviewedByUserId { get; private set; }
    public string? ClosingDifferenceReviewNote { get; private set; }

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

    public void LinkOpeningAdjustmentTransaction(Guid transactionId)
    {
        OpeningAdjustmentTransactionId = transactionId;
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
        ClosingDifferenceReviewStatus = DifferenceReviewStatus.Pending;
        ClosedAt = DateTime.UtcNow;
        Status = ShiftStatus.Closed;
        Note = note;
    }

    public void ApproveOpeningDifference(Guid approvedByUserId)
    {
        if (OpeningDifference == 0)
            throw new DomainException("Bu vardiyada incelenecek bir açılış farkı yok.");

        if (OpeningDifferenceReviewStatus != DifferenceReviewStatus.Pending)
            throw new DomainException("Bu vardiyanın açılış farkı zaten incelenmiş.");

        if (approvedByUserId == Guid.Empty)
            throw new DomainException("Geçersiz kullanıcı ID'si.");

        OpeningDifferenceReviewStatus = DifferenceReviewStatus.Approved;
        OpeningDifferenceReviewedAt = DateTime.UtcNow;
        OpeningDifferenceReviewedByUserId = approvedByUserId;
    }

    public void RejectOpeningDifference(Guid rejectedByUserId, string? note)
    {
        if (OpeningDifference == 0)
            throw new DomainException("Bu vardiyada incelenecek bir açılış farkı yok.");

        if (OpeningDifferenceReviewStatus != DifferenceReviewStatus.Pending)
            throw new DomainException("Bu vardiyanın açılış farkı zaten incelenmiş.");

        if (rejectedByUserId == Guid.Empty)
            throw new DomainException("Geçersiz kullanıcı ID'si.");

        OpeningDifferenceReviewStatus = DifferenceReviewStatus.Rejected;
        OpeningDifferenceReviewedAt = DateTime.UtcNow;
        OpeningDifferenceReviewedByUserId = rejectedByUserId;
        OpeningDifferenceReviewNote = note;
    }

    public void ApproveDifference(Guid approvedByUserId)
    {
        if (Status != ShiftStatus.Closed)
            throw new DomainException("Sadece kapanmış vardiyaların farkı incelenebilir.");

        if (Difference is null or 0)
            throw new DomainException("Bu vardiyada incelenecek bir fark yok.");

        if (ClosingDifferenceReviewStatus != DifferenceReviewStatus.Pending)
            throw new DomainException("Bu vardiyanın kapanış farkı zaten incelenmiş.");

        if (approvedByUserId == Guid.Empty)
            throw new DomainException("Geçersiz kullanıcı ID'si.");

        ClosingDifferenceReviewStatus = DifferenceReviewStatus.Approved;
        ClosingDifferenceReviewedAt = DateTime.UtcNow;
        ClosingDifferenceReviewedByUserId = approvedByUserId;
    }

    public void RejectDifference(Guid rejectedByUserId, string? note)
    {
        if (Status != ShiftStatus.Closed)
            throw new DomainException("Sadece kapanmış vardiyaların farkı incelenebilir.");

        if (Difference is null or 0)
            throw new DomainException("Bu vardiyada incelenecek bir fark yok.");

        if (ClosingDifferenceReviewStatus != DifferenceReviewStatus.Pending)
            throw new DomainException("Bu vardiyanın kapanış farkı zaten incelenmiş.");

        if (rejectedByUserId == Guid.Empty)
            throw new DomainException("Geçersiz kullanıcı ID'si.");

        ClosingDifferenceReviewStatus = DifferenceReviewStatus.Rejected;
        ClosingDifferenceReviewedAt = DateTime.UtcNow;
        ClosingDifferenceReviewedByUserId = rejectedByUserId;
        ClosingDifferenceReviewNote = note;
    }
}
