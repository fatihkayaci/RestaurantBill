# Contributing to RestaurantBill

First off, thanks for taking the time to contribute! 🎉

This document explains how to get the project running and the conventions we follow.

## 🚀 Getting Started

See the [README](README.md#-getting-started) for full setup. The short version:

```bash
# 1. Fork & clone the repo
git clone https://github.com/<your-username>/RestaurantBill.git
cd RestaurantBill

# 2. Create a .env file in the root (see README)

# 3. Run everything with Docker
docker compose up --build
```

## 🐛 Found a bug / have an idea?

1. Check the [open issues](https://github.com/fatihkayaci/RestaurantBill/issues) first — it may already be tracked.
2. If not, open a new issue using the **Bug Report** or **Feature Request** template.
3. Looking for something to work on? Issues labeled **`good first issue`** are a great place to start.

## 🔀 Pull Request Workflow

1. **Branch off `main`.** Never commit directly to `main`.
   - Use a descriptive branch name: `feat/cashier-tip-field`, `fix/pos-trash-icon`, `refactor/restaurant-dto`.
2. **Make focused changes.** One PR should address one topic — split unrelated changes into separate PRs.
3. **Target `main`** when opening the PR, and link the related issue (e.g. `Closes #12`).

## ✍️ Commit Messages

Write commit messages in English using [Conventional Commits](https://www.conventionalcommits.org/) prefixes:

```
feat:     a new feature
fix:      a bug fix
refactor: code change that neither fixes a bug nor adds a feature
chore:    tooling, config, or maintenance
docs:     documentation only
```

Example: `feat(cashier): model tip as a separate transaction field`

## 📐 Code Conventions

### Backend (.NET)
- Follow **Clean Architecture** layering: Domain → Application → Infrastructure / Persistence → WebAPI.
- New use cases are MediatR handlers in `RestaurantBill.Application`; repository implementations go in `RestaurantBill.Persistence`.
- Use **FluentValidation** for validation — not Data Annotations.
- Prefer **explicit types** over `var` for readability.
- Throw `BaseException` derivatives (`BusinessException`, `NotFoundException`, …) instead of raw exceptions.
- Write comments in English.

### Frontend (React + TypeScript)
- **No `any`** — always define a proper TypeScript type.
- API types live in `features/<domain>/types.ts`; new API calls go through `axiosInstance` in `src/api/`.
- Component file names are **PascalCase** (`OrderCard.tsx`).
- Remove `console.log` statements before opening a PR.

## ✅ Before You Open a PR

- The project builds and runs (`docker compose up --build`).
- No leftover debug logs or commented-out code.
- The PR description explains **what** changed and **why**.

Thanks again! 🙌
