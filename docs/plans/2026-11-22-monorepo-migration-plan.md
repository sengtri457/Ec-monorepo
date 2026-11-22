# Monorepo Migration Plan

**Goal:** Transform the EC project into a modern, high-performance polyglot monorepo (Turborepo + pnpm workspaces + shared TypeScript/Python packages) while preserving 100% backward compatibility with existing Docker Compose and Next.js operations.

---

### Task List

| Task | Description | Status |
| :--- | :--- | :--- |
| Task 1 | Initialize root workspace configuration (`package.json`, `pnpm-workspace.yaml`, `.npmrc`) | Pending |
| Task 2 | Configure Turborepo build pipeline (`turbo.json`) for dev, build, lint, and test | Pending |
| Task 3 | Create shared packages: `packages/typescript-config` and `packages/types` | Pending |
| Task 4 | Create shared Python utility package: `packages/py-common` (JWT, KHQR, DRF standard responses) | Pending |
| Task 5 | Wire `ec-online-shop` to workspace shared packages and root scripts | Pending |
| Task 6 | Add root developer CLI commands for Docker & services orchestration | Pending |
| Task 7 | Run full monorepo verification (`pnpm install`, `turbo run build`, `turbo run lint`) | Pending |
