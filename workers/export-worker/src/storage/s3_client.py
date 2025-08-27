from __future__ import annotations

import os
from typing import Optional
import boto3
from botocore.client import Config


class S3Client:
    def __init__(
        self,
        bucket: str,
        endpoint: Optional[str],
        region: str,
        access_key: str,
        secret_key: str,
        use_ssl: bool,
    ) -> None:
        self.bucket = bucket
        session = boto3.session.Session()
        self.client = session.client(
            "s3",
            region_name=region,
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            use_ssl=use_ssl,
            config=Config(s3={"addressing_style": "path"}),
        )

        # Ensure bucket exists (best-effort)
        try:
            self.client.head_bucket(Bucket=bucket)
        except Exception:
            try:
                self.client.create_bucket(Bucket=bucket)
            except Exception:
                pass

    async def put_object(self, key: str, data: bytes) -> None:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=self._guess_content_type(key))

    async def get_presigned_url(self, key: str, expires: int = 3600) -> str:
        return self.client.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires,
        )

    def _guess_content_type(self, key: str) -> str:
        if key.endswith(".pdf"):
            return "application/pdf"
        if key.endswith(".docx"):
            return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        if key.endswith(".md"):
            return "text/markdown; charset=utf-8"
        return "application/octet-stream"


