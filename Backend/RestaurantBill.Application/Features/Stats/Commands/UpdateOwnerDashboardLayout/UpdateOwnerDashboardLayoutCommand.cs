using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Stats.Commands.UpdateOwnerDashboardLayout;

public class UpdateOwnerDashboardLayoutCommand : IRequest<Result<List<string>>>
{
    /// <summary>Kartların yeni sırası. null = varsayılana dön.</summary>
    public List<string>? Widgets { get; set; }
}

public class UpdateOwnerDashboardLayoutCommandValidator : AbstractValidator<UpdateOwnerDashboardLayoutCommand>
{
    public const int MaxWidgets = 50;

    public UpdateOwnerDashboardLayoutCommandValidator()
    {
        When(x => x.Widgets is not null, () =>
        {
            // Bilinmeyen kimlik reddedilmez, kaydederken atlanır (eski/yeni istemci sürüm farkı).
            RuleFor(x => x.Widgets!)
                .Must(w => w.Count <= MaxWidgets).WithMessage($"En fazla {MaxWidgets} kart gönderilebilir.")
                .Must(w => w.All(id => !string.IsNullOrWhiteSpace(id) && id.Length <= 50)).WithMessage("Geçersiz kart kimliği.")
                .Must(w => w.Distinct().Count() == w.Count).WithMessage("Bir kart birden fazla kez gönderilemez.");
        });
    }
}

public class UpdateOwnerDashboardLayoutCommandHandler : IRequestHandler<UpdateOwnerDashboardLayoutCommand, Result<List<string>>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public UpdateOwnerDashboardLayoutCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<List<string>>> Handle(UpdateOwnerDashboardLayoutCommand request, CancellationToken cancellationToken)
    {
        User? user = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        if (user is null) return Result<List<string>>.Failure("Kullanıcı bulunamadı.");

        // Yalnızca bilinen kimlikler saklanır; eksikler okurken sona eklenir.
        List<string>? widgets = request.Widgets?.Where(OwnerDashboardWidgets.IsKnown).ToList();
        user.SetOwnerDashboardWidgets(widgets);
        await _db.SaveChangesAsync(cancellationToken);

        return Result<List<string>>.Success(OwnerDashboardWidgets.Merge(widgets));
    }
}
