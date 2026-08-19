# Phone & Email Verification — Work Plan

Put this file in `docs/verification-plan.md`.
Give it to Claude Code and work **one phase at a time**. Do not do all phases in one prompt.

---

## Goal

- **Phone verification is mandatory.** Sent automatically right after register. The user cannot use the app until the phone is verified.
- **Email verification is optional / later.** The code is sent only when the user asks for it (from the profile page). It does not block anything for now.
- **Login is allowed** when the phone is not verified, but the user is redirected to the verification page and only gets a transition token.
- **SMS/email providers stay fake for now.** `SmsSender` and `EmailSender` already log the code — that is enough for development.

---

## Current state (already exists)

| Piece | File |
|---|---|
| `VerificationCode` entity (`Type`, `Status`, `Attempts`, `ExpiresAt`) | `Backend/RestaurantBill.Domain/Entities/VerificationCode.cs` |
| `VerificationCodeType` (Phone / Email), `VerificationCodeStatus` (Pending / Verified / Expired / Failed) | `Backend/RestaurantBill.Domain/Enums/` |
| Send handler | `.../Features/Auths/Commands/SendVerificationCode/SendVerificationCodeCommandHandler.cs` |
| Verify handler | `.../Features/Auths/Commands/VerifyCode/VerifyCodeCommandHandler.cs` |
| Login handler | `.../Features/Auths/Commands/Login/LoginCommandHandler.cs` |
| Register handler (returns a transition token) | `.../Features/Auths/Commands/Register/RegisterCommandHandler.cs` |
| Fake senders (log only) | `Backend/RestaurantBill.Infrastructure/Services/SmsSender.cs`, `EmailSender.cs` |
| Verification page | `frontend/src/pages/PhoneVerificationPage.tsx` |
| Frontend API calls | `frontend/src/features/auth/api/authService.ts` |

---

## Phase 1 — Domain: remember the verification

**This is the most important phase. Right now nothing remembers that a user verified their phone, so the whole verification page can be skipped by just logging in again.**

1. `User` entity: add `IsPhoneVerified` and `IsEmailVerified` (`bool`, private set, default `false`), plus `MarkPhoneVerified()` and `MarkEmailVerified()` methods.
2. `VerificationCode` entity: add `MarkAsExpired()` and `MarkAsFailed()`. The enum values exist but no method ever sets them.
3. EF Core migration for the two new `User` columns.
4. Domain tests in `RestaurantBill.Domain.Tests/Entities/UserTests.cs`: new user starts unverified; `MarkPhoneVerified()` sets the flag.

## Phase 2 — SendVerificationCode handler

5. If the requested type is already verified on the `User` → `Result.Failure` ("already verified"). No point sending a code again.
6. Before creating a new code, mark all still-`Pending` codes **of the same type** for that user as `Expired`. Otherwise old codes stay valid.
7. **Cooldown:** if a code of that type was created less than 60 seconds ago → failure, with the remaining seconds in the message. Without this, the resend button can send unlimited SMS — that becomes real money when a provider is connected.
8. Keep the 5-minute expiry.

## Phase 3 — VerifyCode handler (contains a real bug)

9. **Add `Type` to `VerifyCodeCommand` and filter by it.** Today the handler takes the newest `Pending` code and ignores the type. It works only because email codes are never created yet. As soon as a phone code and an email code can be pending together, the handler compares the typed code against the wrong row and always answers "wrong code".
10. Enforce a maximum of 5 attempts → `MarkAsFailed()`, and stop accepting that code.
11. Expired code → `MarkAsExpired()` instead of leaving it `Pending` forever.
12. On success, call `MarkPhoneVerified()` / `MarkEmailVerified()` on the **User**, not only `MarkAsVerified()` on the code row.
13. Token behaviour by type:
    - `Phone` → return the real Owner token + `NeedsSlugSetup` (same as today).
    - `Email` → the user is already logged in. Return success only, no new token.
14. Update the validator to require a valid `Type`.
15. Application tests for: wrong code, expired code, too many attempts, wrong type, happy path.

## Phase 4 — Login

16. `LoginResponseDto`: add `NeedsPhoneVerification`.
17. In `LoginCommandHandler`, when the owner's phone is not verified → return the **transition token** (`GenerateTransitionToken`) instead of the full Owner token, with `NeedsPhoneVerification = true`.
18. Employee login is not affected — only owners register with a phone number.

## Phase 5 — Frontend

19. `authService.verifyCode` and `sendCode`: send the `Type` field. Update the `Code` type in `features/auth/types/index.ts`.
20. Login page: if `needsPhoneVerification` → `navigate("/verify-phone")`.
21. `PhoneVerificationPage.tsx`:
    - **Bug:** `useEffect(() => { sendCode(); }, [])` runs twice in React StrictMode during development, so two codes are sent and only the second one works. Guard it with a `useRef` flag.
    - Add a 60-second countdown and disable the resend button while it runs (must match the backend cooldown).
    - Show the backend error message properly (wrong code / expired / too many attempts).
22. Route guard: a user holding only a transition token cannot reach `/owner` pages.
23. `ProfilePage.tsx`: next to the email field show a badge — "Verified" (green) or "Not verified" + a **Verify** button. Button → `sendCode({ type: Email })` → a modal with a 6-digit input → `verifyCode({ type: Email })`.
24. The profile page needs to know the flags, so `GET /api/user/me` (or whichever endpoint fills the profile) must return `isPhoneVerified` and `isEmailVerified`.

---

## Open question — decide later

Which action should *require* a verified email? (password reset, invoice email, staff invite...) Until this is decided, email verification is only a button in the profile page and blocks nothing.

## Notes for Claude Code

- Follow the existing patterns: CQRS + MediatR, `Result` / `Result<T>`, FluentValidation validators, repositories through `IUnitOfWork`.
- Error messages in this codebase are written in Turkish — keep that.
- Tests use hand-written fakes (`FakeUnitOfWork`, `FakeGenericRepository<T>`); no mocking libraries.
- Never log or return the verification code itself in an API response.
- Run `dotnet test Backend/RestaurantBill.sln` after each phase.
