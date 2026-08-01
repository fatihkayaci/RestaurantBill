using FluentValidation;
namespace RestaurantBill.Application.Features.Tables.Commands.ReservationTable;

public class ReservationTableCommandValidator : AbstractValidator<ReservationTableCommand>
{
    public ReservationTableCommandValidator()
    {
        RuleFor(x => x.TableId)
            .NotEqual(Guid.Empty).WithMessage("Geçerli bir masa seçilmelidir.");

        RuleFor(x => x.GuestName)
            .NotEmpty().WithMessage("Misafir adı boş olamaz.")
            .MaximumLength(100).WithMessage("Misafir adı en fazla 100 karakter olabilir.");

        RuleFor(x => x.Contact)
            .MaximumLength(30).WithMessage("İletişim bilgisi en fazla 30 karakter olabilir.");

        RuleFor(x => x.ReservationTime)
            .NotEmpty().WithMessage("Rezervasyon saati boş olamaz.")
            .Matches(@"^([01]\d|2[0-3]):[0-5]\d$").WithMessage("Rezervasyon saati SS:DD formatında olmalıdır.");

        RuleFor(x => x.Note)
            .MaximumLength(500).WithMessage("Not alanı en fazla 500 karakter olabilir.");
    }
}
