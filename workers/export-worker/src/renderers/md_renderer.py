from typing import Dict, Any


class MdRenderer:
    async def render(self, content: Dict[str, Any]) -> bytes:
        lines: list[str] = []
        title = content.get("title") or content.get("name") or "Resume"
        lines.append(f"# {title}")
        for section, value in content.items():
            if section in {"title", "name"}:
                continue
            lines.append("")
            lines.append(f"## {section.title()}")
            if isinstance(value, str):
                lines.append(value)
            elif isinstance(value, list):
                for item in value:
                    lines.append(f"- {item}")
            elif isinstance(value, dict):
                for k, v in value.items():
                    lines.append(f"- **{k}**: {v}")
            else:
                lines.append(str(value))

        text = "\n".join(lines)
        return text.encode("utf-8")


