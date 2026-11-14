using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.Stats.Commands.UpdateDashboardLayout;

public class UpdateDashboardLayoutCommand : IRequest<Result<List<string>>>
{
    /// <summary>Görünecek kartlar, sırasıyla. null = varsayılana dön.</summary>
    public List<string>? Cards { get; set; }
}

public class UpdateDashboardLayoutCommandValidator : AbstractValidator<UpdateDashboardLayoutCommand>
{
    public UpdateDashboardLayoutCommandValidator()
    {
        When(x => x.Cards is not null, () =>
        {
            // Bilinmeyen kimlik reddedilmez, kaydederken atlanır: eski bir istemci kaldırılmış bir kartı
            // ("live", "overdue") hâlâ gönderebilir.
            RuleFor(x => x.Cards!)
                .Must(cards => cards.Distinct().Count() == cards.Count).WithMessage("Bir kart birden fazla kez seçilemez.");
        });
    }
}

public class UpdateDashboardLayoutCommandHandler : IRequestHandler<UpdateDashboardLayoutCommand, Result<List<string>>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public UpdateDashboardLayoutCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Result<List<string>>> Handle(UpdateDashboardLayoutCommand request, CancellationToken cancellationToken)
    {
        User? user = await _db.Users.FirstOrDefaultAsync(u => u.Id == _currentUser.UserId, cancellationToken);
        if (user is null) return Result<List<string>>.Failure("Kullanıcı bulunamadı.");

        List<string>? cards = request.Cards?.Where(DashboardCards.IsKnown).ToList();
        user.SetDashboardCards(cards);
        await _db.SaveChangesAsync(cancellationToken);

        return Result<List<string>>.Success(cards ?? DashboardCards.Default.ToList());
    }
}
