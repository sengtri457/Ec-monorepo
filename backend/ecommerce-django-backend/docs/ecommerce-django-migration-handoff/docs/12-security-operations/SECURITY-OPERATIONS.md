# Security and Operational Guidelines

## 1. Secrets and configuration

- Keep `.env` files out of Git.
- Commit `.env.example` with placeholders only.
- Use GitHub Actions secrets for CI credentials.
- Use Kubernetes Secrets for deployment credentials.
- Rotate any credential accidentally committed.

## 2. Django settings

For deployment:
- `DEBUG=False`.
- Load a strong secret key from environment variables.
- Configure `ALLOWED_HOSTS`.
- Restrict CORS to the actual frontend origin.
- Configure secure cookies and HTTPS settings where applicable.
- Avoid exposing internal service endpoints publicly.

## 3. Authentication and authorization

- Validate JWT signatures and expiry.
- Enforce permissions in each service.
- Do not trust user identifiers sent by the browser.
- Protect internal endpoints with service credentials or signed service tokens.
- Do not treat Nginx routing alone as authentication.

## 4. Payment handling

- Validate provider callbacks using the provider's supported verification mechanism.
- Make callback handling idempotent.
- Do not mark a payment successful based only on a frontend redirect.
- Never log secret keys, payment credentials, or sensitive provider payloads.
- Keep payment state transitions explicit and auditable.

## 5. Logging and error handling

- Log request ID, service, endpoint, status, and duration where practical.
- Do not return stack traces to clients.
- Do not log passwords, tokens, or payment secrets.
- Set timeouts for service calls.
- Return controlled errors when a downstream service is unavailable.

## 6. Operational checklist

- [ ] Health endpoint exists for each service.
- [ ] Database backups are documented.
- [ ] Environment variables are documented.
- [ ] Logs can be inspected per service.
- [ ] Service timeouts are configured.
- [ ] Payment callbacks are validated and idempotent.
- [ ] Secrets are not committed.
