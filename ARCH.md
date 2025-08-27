# ARCH.md — AI-Powered Resume & Cover Letter Builder

## Topology
- **Frontend/BFF:** Next.js 14 (Vercel); Server Actions for presigned uploads and small mutations; SSR for editor and review links.
- **API Gateway:** NestJS (Node 20) with OpenAPI 3.1, Problem+JSON, Zod validation, RBAC (Casbin), RLS, rate limits, Idempotency-Key, Request-ID.
- **Workers:** Python (FastAPI control):
  - parse-resume-worker (PDF/DOCX → JSON)
  - parse-jd-worker
  - taxonomy-worker (skills normalization)
  - optimize-worker (bullets, keywords, variants)
  - cover-letter-worker
  - ats-check-worker
  - export-worker (DOCX/PDF/MD)
  - scrape-worker (LinkedIn, URLs)
  - analytics-worker
- **Event Bus/Queues:** NATS + Redis Streams; Celery/RQ orchestration.
- **Datastores:** Postgres 16 + pgvector; S3/R2 for uploads/exports; Redis; optional ClickHouse for analytics.
- **Observability:** OpenTelemetry, Prometheus/Grafana, Sentry.
- **Secrets:** Cloud Secrets Manager/KMS.

## Data Model
- Orgs, users, memberships, API keys.
- Projects and Jobs (JD text, parsed entities).
- Resumes and Variants (optimized JSON, ATS scores, gaps, readability).
- Cover Letters linked to Variants.
- Assets & Exports (S3 keys).
- Skills taxonomy + embeddings.
- Comments and Audit log.

## API Surface
- **Auth/Users:** login, refresh, me, usage.
- **Projects/Jobs:** CRUD, JD parse.
- **Resumes/Variants:** upload, create variants, optimize, approve.
- **Cover Letters:** draft, update.
- **Exports:** create export (docx/pdf/md).
- **Search:** semantic search across resumes/JDs.
- **Comments:** add threaded comments.
- All mutations require Idempotency-Key; errors use Problem+JSON.

## Pipelines
1. Resume upload → parse → normalized JSON.
2. JD ingest → parse → requirements vector set.
3. Optimization: match resume vs JD → generate STAR bullets → keyword infusion → ATS checks → score.
4. Cover Letter: role/company aware draft, tone guard.
5. Export: render DOCX/PDF/MDX → upload to S3 → signed link.
6. Analytics: aggregate score uplifts, never store PII without consent.

## Realtime
- WS/SSE for progress, ATS scoring, and inline bullet suggestions.
- Presence for collaborators; soft locks on sections.

## Security
- TLS/HSTS/CSP; KMS-encrypted secrets; signed URLs.
- RLS tenant isolation.
- Consent gating for LinkedIn/URL scraping.
- DSR endpoints; retention windows.
- SSO/SAML/OIDC; SCIM for enterprise.
