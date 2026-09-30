"""Version 1 caption layout. Only inserted line breaks change display text.

The original Caption remains the semantic authority. Measurement is performed
against the same system font and explicit pixel size used by FFmpeg.
"""
import math
import re

from PIL import ImageFont


def layout_caption(text: str, font_path: str, canvas: tuple[int, int]) -> dict:
    if not isinstance(text, str) or len(text) > 16384:
        raise ValueError("CAPTION_LAYOUT_TEXT_INVALID")
    width, height = canvas
    if width < 32 or height < 32:
        raise ValueError("CAPTION_LAYOUT_CANVAS_TOO_SMALL")
    size = max(2, round(min(height * 0.045, width * 0.035)))
    border = max(1, round(size / 16))
    spacing = max(1, round(size * 0.2))
    font = ImageFont.truetype(font_path, size)
    available = math.floor(width * 0.9) - border * 2 - 4

    def fits(value: str) -> bool:
        box = font.getbbox(value)
        return max(font.getlength(value), box[2] - box[0]) <= available

    lines: list[str] = []
    # Keep whitespace, punctuation and explicit newlines. Never strip or replace
    # a character to make a caption fit; break oversized tokens by actual glyphs.
    for paragraph in text.split("\n"):
        line = ""
        for token in re.findall(r"\s+|\S+", paragraph):
            if fits(line + token):
                line += token
                continue
            if line:
                lines.append(line)
                line = ""
            for character in token:
                if not fits(line + character):
                    if not line:
                        raise ValueError("CAPTION_LAYOUT_GLYPH_TOO_WIDE")
                    lines.append(line)
                    line = ""
                line += character
        lines.append(line)
    ascent, descent = font.getmetrics()
    # A finite readable-size block; excessive captions fail instead of shrinking
    # to unreadable type or silently losing words. 45% leaves the picture visible.
    block_height = len(lines) * (ascent + descent) + max(0, len(lines) - 1) * spacing
    if block_height + border * 2 > height * 0.45:
        raise ValueError("CAPTION_LAYOUT_CAPACITY_EXCEEDED")
    return {"text": "\n".join(lines), "fontsize": size, "line_spacing": spacing,
            "borderw": border, "line_count": len(lines), "measured_height": block_height}
