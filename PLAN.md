# PLAN.md — AI-Powered Resume & Cover Letter Builder

## Goal
Deliver a SaaS tool where users paste a job description and upload a resume to generate ATS-friendly resumes and targeted cover letters, complete with quantified STAR-style bullets, ATS score/gap analysis, and export options.

## Build Strategy
- Full-stack continuous build: no phases/stops, one continuous pipeline.
- Frontend: Next.js 14, MUI + Tailwind.
- Backend: NestJS API Gateway, Python NLP/LLM workers, Postgres + pgvector, Redis, NATS, S3/R2.
- Workers handle parsing, normalization, optimization, cover letter drafting, ATS scoring, and exports.
- Multi-tenant with RLS isolation; consent and PII redaction enforced.
- Exports in DOCX, PDF, MD, and plain text for ATS.
- CI/CD with GitHub Actions and Terraform; blue/green deployments.
- Testing: unit, integration, regression, E2E, load, chaos, security.

## Success Criteria
- Median ATS score uplift ≥25 points after optimization.
- Time-to-first optimized variant ≤60s from intake.
- Export completion rate ≥98%.
- ≥80% thumbs-up rating on suggestions.
- Pipeline success ≥99%; export latency p95 <4s; error budget respected.
