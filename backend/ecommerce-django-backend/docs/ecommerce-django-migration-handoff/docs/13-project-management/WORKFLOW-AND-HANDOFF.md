# Team Workflow and Developer Handoff

## 1. Git branching policy

Do not work directly on `main`. Use `development` as the integration branch and feature branches for each migration unit.

```text
development
├── feat/migration-audit
├── feat/user-service
├── feat/product-service
├── feat/order-service
├── feat/payment-service
├── feat/notification-service
├── feat/api-gateway
├── feat/docker-compose
├── feat/github-actions
└── feat/kubernetes-monitoring
```

Workflow:

```text
Create feature branch
        ↓
Implement one scoped change
        ↓
Run tests
        ↓
Review diff
        ↓
Commit
        ↓
Push feature branch
        ↓
Open Pull Request to development
        ↓
Review and merge
```

## 2. Suggested commit format

- `docs: add migration architecture`
- `feat(user): extract account service`
- `feat(product): add inventory reservation endpoint`
- `refactor(order): replace cross-service foreign keys`
- `test(payment): cover duplicate callbacks`
- `chore(infra): add compose environment`

## 3. Pull request checklist

- [ ] Scope is limited to one service or infrastructure concern.
- [ ] No direct edits to `main`.
- [ ] Tests pass.
- [ ] Existing business behavior is preserved or changes are documented.
- [ ] No secrets or database dumps included.
- [ ] Database migrations are included and reviewed.
- [ ] API documentation is updated.
- [ ] README/setup instructions are updated.
- [ ] Rollback considerations are understood.

## 4. Handoff requirements per service

A service is not considered handed off until it has:
- Responsibility and data ownership documented.
- Local setup instructions.
- Environment variable reference.
- Database migration instructions.
- API documentation.
- Health endpoint.
- Unit/API tests.
- Dockerfile.
- Known limitations.
- Example request and response.
- Clear owner for unresolved tasks.

## 5. Suggested team roles

- Backend/domain owner: Django service extraction and business logic.
- Database owner: PostgreSQL databases, data migration, validation.
- Infrastructure owner: Docker, Compose, CI/CD, Kubernetes.
- Integration/documentation owner: API contracts, gateway, diagrams, presentation.

One person can hold multiple roles. Keep pull requests small enough for another team member to review.
