from typing import Dict, Any
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas
from io import BytesIO


class PdfRenderer:
    async def render(self, content: Dict[str, Any]) -> bytes:
        buf = BytesIO()
        c = canvas.Canvas(buf, pagesize=LETTER)
        width, height = LETTER

        y = height - 50
        title = content.get("title") or content.get("name") or "Resume"
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, y, str(title))
        y -= 30

        c.setFont("Helvetica", 10)
        for section, value in content.items():
            if section in {"title", "name"}:
                continue
            if y < 60:
                c.showPage()
                y = height - 50
                c.setFont("Helvetica", 10)
            c.setFont("Helvetica-Bold", 12)
            c.drawString(50, y, section.title())
            y -= 18
            c.setFont("Helvetica", 10)
            text = c.beginText(60, y)
            text.setLeading(14)
            for line in self._normalize_lines(value):
                text.textLine(line)
                y -= 14
                if y < 60:
                    c.drawText(text)
                    c.showPage()
                    y = height - 50
                    text = c.beginText(60, y)
                    text.setLeading(14)
            c.drawText(text)
            y -= 10

        c.save()
        return buf.getvalue()

    def _normalize_lines(self, value: Any):
        if isinstance(value, str):
            return value.splitlines() or [value]
        if isinstance(value, list):
            return [str(v) for v in value]
        if isinstance(value, dict):
            return [f"{k}: {v}" for k, v in value.items()]
        return [str(value)]


