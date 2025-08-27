"""
Export Worker - DOCX, PDF, Markdown renderers with S3 upload
"""

import os
import sys
import logging
from typing import Dict, Any
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
import uvicorn

from .renderers.docx_renderer import DocxRenderer
from .renderers.pdf_renderer import PdfRenderer
from .renderers.md_renderer import MdRenderer
from .storage.s3_client import S3Client


logging.basicConfig(format="%(message)s", stream=sys.stdout, level=logging.INFO)
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer(),
    ]
)
logger = structlog.get_logger()


class ExportRequest(BaseModel):
    export_id: str
    content: Dict[str, Any] = Field(..., description="Resume or cover letter structured content")
    format: str = Field(..., description="docx|pdf|md")
    filename: str = Field(..., description="base filename without extension")


class ExportResponse(BaseModel):
    export_id: str
    format: str
    s3_key: str
    url: str


docx_renderer: DocxRenderer | None = None
pdf_renderer: PdfRenderer | None = None
md_renderer: MdRenderer | None = None
s3: S3Client | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global docx_renderer, pdf_renderer, md_renderer, s3
    docx_renderer = DocxRenderer()
    pdf_renderer = PdfRenderer()
    md_renderer = MdRenderer()
    s3 = S3Client(
        bucket=os.getenv("S3_BUCKET", "local-exports"),
        endpoint=os.getenv("S3_ENDPOINT"),
        region=os.getenv("S3_REGION", "us-east-1"),
        access_key=os.getenv("S3_ACCESS_KEY", "minio"),
        secret_key=os.getenv("S3_SECRET_KEY", "minio123"),
        use_ssl=os.getenv("S3_USE_SSL", "false").lower() == "true",
    )
    try:
        yield
    finally:
        pass


app = FastAPI(title="Export Worker", version="1.0.0", lifespan=lifespan)


@app.post("/export", response_model=ExportResponse)
async def export(req: ExportRequest):
    if req.format not in {"docx", "pdf", "md"}:
        raise HTTPException(status_code=400, detail="unsupported format")

    if not (docx_renderer and pdf_renderer and md_renderer and s3):
        raise HTTPException(status_code=503, detail="exporter unavailable")

    if req.format == "docx":
        data = await docx_renderer.render(req.content)
        key = f"exports/{req.export_id}/{req.filename}.docx"
    elif req.format == "pdf":
        data = await pdf_renderer.render(req.content)
        key = f"exports/{req.export_id}/{req.filename}.pdf"
    else:
        data = await md_renderer.render(req.content)
        key = f"exports/{req.export_id}/{req.filename}.md"

    await s3.put_object(key, data)
    url = await s3.get_presigned_url(key)
    return ExportResponse(export_id=req.export_id, format=req.format, s3_key=key, url=url)


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8006")))


