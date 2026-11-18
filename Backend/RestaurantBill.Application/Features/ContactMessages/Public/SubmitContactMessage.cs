using FluentValidation;
using MediatR;
using RestaurantBill.Application.DTOs;
using RestaurantBill.Application.Features.CustomerSite;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Enums;
using RestaurantBill.Domain.Exceptions;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.ContactMessages.Public;

/// <summary>
/// Restoran sitesinin İletişim sayfasındaki form: ziyaretçi öneri, şikâyet ya da başka bir mesaj bırakır.
/// Şube slug + BranchId'den çözülür (verilmezse şirketin ilk şubesi). Mesaj admin panelinde okunur.
/// </summary>
public class SubmitContactMessageCommand : IRequest<Result>
{
    public Guid? BranchId { get; set; }
    public string Name { get; set; } = string.Empty;
    /// <summary>Telefon ya da e-posta; isteğe bağlı.</summary>
    public string? Contact { get; set; }
    public ContactMessageType Type { get; set; }
    public string Message { get; set; } = string.Empty;
    /// <summary>Bal küpü: formda gizli alan, insan doldurmaz. Doluysa istek botsa sayılır.</summary>
    public string? Website { get; set; }
}

public class SubmitContactMessageCommandValidator : AbstractValidator<SubmitContactMessageCommand>
{
    public SubmitContactMessageCommandValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Adınızı girin.")
            .MaximumLength(ContactMessage.NameMaxLength).WithMessage($"Ad en fazla {ContactMessage.NameMaxLength} karakter olabilir.");
        RuleFor(x => x.Contact)
            .MaximumLength(ContactMessage.ContactMaxLength).WithMessage($"İletişim bilgisi en fazla {ContactMessage.ContactMaxLength} karakter olabilir.");
        RuleFor(x => x.Type)
            .IsInEnum().WithMessage("Mesaj türünü seçin.");
        RuleFor(x => x.Message)
            .NotEmpty().WithMessage("Mesajınızı yazın.")
            .Must(m => m is null || m.Trim().Length >= ContactMessage.MessageMinLength).WithMessage($"Mesajınız en az {ContactMessage.MessageMinLength} karakter olmalı.")
            .MaximumLength(ContactMessage.MessageMaxLength).WithMessage($"Mesajınız en fazla {ContactMessage.MessageMaxLength} karakter olabilir.");
    }
}

public class SubmitContactMessageCommandHandler(IAppDbContext db, ITenantResolver tenant, ITableNotificationService tableNotifications)
    : IRequestHandler<SubmitContactMessageCommand, Result>
{
    public const string HoneypotMessage = "Mesajınız gönderilemedi. Lütfen sayfayı yenileyip tekrar deneyin.";
    public const string RestaurantNotFoundMessage = "Restoran bulunamadı.";

    public async Task<Result> Handle(SubmitContactMessageCommand request, CancellationToken cancellationToken)
    {
        // Bot: hiçbir şey yazılmaz, hangi alanın ele verdiği söylenmez.
        if (!string.IsNullOrWhiteSpace(request.Website))
            return Result.Failure(HoneypotMessage);

        Company? company = await CustomerSiteScope.ResolveCompanyAsync(db, tenant, cancellationToken);
        if (company is null)
            return Result.Failure(RestaurantNotFoundMessage);

        Branch? branch = await CustomerSiteScope.ResolveBranchAsync(db, company.Id, request.BranchId, cancellationToken);
        if (branch is null)
            return Result.Failure(RestaurantNotFoundMessage);

        ContactMessage message;
        try
        {
            message = ContactMessage.Create(branch.Id, request.Name, request.Contact, request.Type, request.Message);
        }
        catch (DomainException ex)
        {
            return Result.Failure(ex.Message);
        }

        db.ContactMessages.Add(message);
        await db.SaveChangesAsync(cancellationToken);

        // Managers get a toast on any admin screen; the message itself is read on the contact messages page.
        await tableNotifications.SendCustomerActivityAsync(branch.Id, new CustomerActivityDto
        {
            Kind = CustomerActivityDto.ContactMessage,
            GuestName = message.Name,
            OccurredAt = message.CreatedAt,
        });
        return Result.Success();
    }
}
