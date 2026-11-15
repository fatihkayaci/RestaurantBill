using MediatR;
using Microsoft.EntityFrameworkCore;
using RestaurantBill.Application.Common;
using RestaurantBill.Application.DTOs.ContactMessages;
using RestaurantBill.Application.Interfaces;
using RestaurantBill.Domain.Entities;
using RestaurantBill.Domain.Shared;

namespace RestaurantBill.Application.Features.ContactMessages;

// Admin "Şikayet ve Öneriler": restoran sitesinin İletişim formundan gelen mesajlar. Liste ve sayaç çalışılan
// şube(ler)le, okundu/silme işlemleri erişilebilir şubelerle sınırlıdır.
internal static class ContactMessageScope
{
    public const string NotFoundMessage = "Mesaj bulunamadı.";

    public static async Task<ContactMessage?> FindAccessibleAsync(IAppDbContext db, ICurrentUserService currentUser, Guid id, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetAccessibleBranchIdsAsync(currentUser, cancellationToken);
        return await db.ContactMessages
            .FirstOrDefaultAsync(m => m.Id == id && branchIds.Contains(m.BranchId) && !m.IsDeleted, cancellationToken);
    }
}

public class GetContactMessagesQuery : IRequest<Result<List<ContactMessageDto>>>
{
    /// <summary>true: yalnızca okunmamışlar.</summary>
    public bool UnreadOnly { get; set; }
}

public class GetContactMessagesQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetContactMessagesQuery, Result<List<ContactMessageDto>>>
{
    public async Task<Result<List<ContactMessageDto>>> Handle(GetContactMessagesQuery request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetWorkingBranchIdsAsync(currentUser, cancellationToken);

        IQueryable<ContactMessage> query = db.ContactMessages.AsNoTracking()
            .Where(m => branchIds.Contains(m.BranchId) && !m.IsDeleted);
        if (request.UnreadOnly)
            query = query.Where(m => !m.IsRead);

        List<ContactMessageDto> items = await query
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new ContactMessageDto
            {
                Id = m.Id,
                Name = m.Name,
                Contact = m.Contact,
                Type = m.Type,
                Message = m.Message,
                IsRead = m.IsRead,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Result<List<ContactMessageDto>>.Success(items);
    }
}

/// <summary>Yan menüdeki rozet: okunmamış mesaj sayısı.</summary>
public class GetUnreadContactMessageCountQuery : IRequest<Result<ContactMessageUnreadCountDto>>
{
}

public class GetUnreadContactMessageCountQueryHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<GetUnreadContactMessageCountQuery, Result<ContactMessageUnreadCountDto>>
{
    public async Task<Result<ContactMessageUnreadCountDto>> Handle(GetUnreadContactMessageCountQuery request, CancellationToken cancellationToken)
    {
        List<Guid> branchIds = await db.GetWorkingBranchIdsAsync(currentUser, cancellationToken);
        int count = await db.ContactMessages.AsNoTracking()
            .CountAsync(m => branchIds.Contains(m.BranchId) && !m.IsRead && !m.IsDeleted, cancellationToken);
        return Result<ContactMessageUnreadCountDto>.Success(new ContactMessageUnreadCountDto { Count = count });
    }
}

public class MarkContactMessageReadCommand : IRequest<Result>
{
    public Guid Id { get; set; }
}

public class MarkContactMessageReadCommandHandler(IAppDbContext db, ICurrentUserService currentUser, TimeProvider clock)
    : IRequestHandler<MarkContactMessageReadCommand, Result>
{
    public async Task<Result> Handle(MarkContactMessageReadCommand request, CancellationToken cancellationToken)
    {
        ContactMessage? message = await ContactMessageScope.FindAccessibleAsync(db, currentUser, request.Id, cancellationToken);
        if (message is null)
            return Result.Failure(ContactMessageScope.NotFoundMessage);

        message.MarkAsRead(clock.GetUtcNow().UtcDateTime);
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class DeleteContactMessageCommand : IRequest<Result>
{
    public Guid Id { get; set; }
}

public class DeleteContactMessageCommandHandler(IAppDbContext db, ICurrentUserService currentUser)
    : IRequestHandler<DeleteContactMessageCommand, Result>
{
    public async Task<Result> Handle(DeleteContactMessageCommand request, CancellationToken cancellationToken)
    {
        ContactMessage? message = await ContactMessageScope.FindAccessibleAsync(db, currentUser, request.Id, cancellationToken);
        if (message is null)
            return Result.Failure(ContactMessageScope.NotFoundMessage);

        message.MarkAsDeleted();
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}
