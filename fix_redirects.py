#!/usr/bin/env python3
"""
Fix WinHTTrack mirror: remove base tags & redirect scripts,
convert www.npackpm.com absolute URLs to relative local paths.
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlparse, urlunparse

ROOT = Path(__file__).resolve().parent

# Site domains (mirror target) — NOT npack.com.cn (external)
SITE_HOSTS = frozenset(
    {
        "www.npackpm.com",
        "npackpm.com",
        "www.npack.com",
        "npack.com",
    }
)

# Match mirror site only (not npack.com.cn etc.)
ABS_SITE_RE = r"(?:www\.)?npackpm\.com|www\.npack\.com(?![a-z.])"

MIRRORED_RE = re.compile(
    r"<!--\s*Mirrored from\s+(https?://)?([^/\s]+)?([^?\s]*)(?:\?[^\s]*)?\s+by HTTrack",
    re.IGNORECASE,
)

BASE_TAG_RE = re.compile(
    r"<base\s[^>]*href\s*=\s*[\"'][^\"']*[\"'][^>]*>\s*",
    re.IGNORECASE,
)

# Anti-hotlink / forced redirect script blocks
REDIRECT_SCRIPT_RES = [
    re.compile(
        r"<script[^>]*>[\s\S]*?"
        r"(?:window\.)?location\.(?:host|hostname)\s*!==?\s*[\"'][^\"']+[\"']"
        r"[\s\S]*?"
        r"(?:window\.)?location(?:\.href)?\s*=[\s\S]*?"
        r"</script>\s*",
        re.IGNORECASE,
    ),
    re.compile(
        r"<script[^>]*>[\s\S]*?"
        r"(?:window\.)?location\.(?:host|hostname)\s*!==?\s*[\"'][^\"']+[\"']"
        r"[\s\S]*?"
        r"top\.location(?:\.href)?\s*=[\s\S]*?"
        r"</script>\s*",
        re.IGNORECASE,
    ),
    re.compile(
        r"<script[^>]*>[\s\S]*?"
        r"top\.location(?:\.href)?\s*=\s*[\"']https?://[^\"']+[\"']"
        r"[\s\S]*?"
        r"</script>\s*",
        re.IGNORECASE,
    ),
]

ABS_URL_RE = re.compile(
    rf"(?P<attr>href|src|action|content|data-url|data-link)\s*=\s*"
    rf"(?P<q>[\"'])"
    rf"(?P<url>https?://{ABS_SITE_RE}[^\"']*)"
    rf"(?P=q)",
    re.IGNORECASE,
)

PLAIN_ABS_RE = re.compile(
    rf"https?://{ABS_SITE_RE}(?:/[^\"'\s<>]*)?",
    re.IGNORECASE,
)


def normalize_url_path(path: str) -> str:
    path = unquote(path.split("?")[0].split("#")[0])
    if not path.startswith("/"):
        path = "/" + path
    path = path.rstrip("/") or "/"
    return path.lower()


def build_url_index(root: Path) -> dict[str, Path]:
    """Map normalized site URL paths -> local file paths."""
    index: dict[str, Path] = {}
    for dirpath, _, filenames in os.walk(root):
        for name in filenames:
            if not name.lower().endswith((".html", ".htm")):
                continue
            fp = Path(dirpath) / name
            if fp.name == "fix_redirects.py":
                continue
            try:
                text = fp.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            for m in MIRRORED_RE.finditer(text):
                raw_path = m.group(3) or "/"
                norm = normalize_url_path(raw_path)
                index.setdefault(norm, fp)
                # Also index without trailing semantics for directory URLs
                if norm != "/":
                    index.setdefault(norm + "/", fp)

    # Fallback: map filesystem paths for common patterns
    for dirpath, _, filenames in os.walk(root):
        for name in filenames:
            if not name.lower().endswith((".html", ".htm")):
                continue
            fp = Path(dirpath) / name
            rel = fp.relative_to(root).as_posix()
            if name.lower() == "index.html":
                url_path = "/" + rel[: -len("/index.html")]
            else:
                url_path = "/" + rel[: -len(".html")].replace(".htm", "")
            norm = normalize_url_path(url_path)
            index.setdefault(norm, fp)

    return index


def resolve_local(url: str, url_index: dict[str, Path], root: Path) -> Path | None:
    parsed = urlparse(url)
    host = (parsed.netloc or "").lower()
    if host and host not in SITE_HOSTS:
        return None
    path = normalize_url_path(parsed.path or "/")
    if path in url_index:
        return url_index[path]
    # Try with .html suffix
    if not path.endswith(".html"):
        candidate = path + ".html"
        if candidate in url_index:
            return url_index[candidate]
    # Try index.html in directory
    for suffix in ("/index.html", "/index.htm"):
        candidate = path.rstrip("/") + suffix
        norm = normalize_url_path(candidate)
        if norm in url_index:
            return url_index[norm]
    # Direct file guess under root
    rel = path.lstrip("/")
    if not rel:
        guess = root / "index.html"
        return guess if guess.is_file() else None
    for ext in ("", ".html", ".htm"):
        guess = root / (rel + ext)
        if guess.is_file():
            return guess
        guess_dir = root / rel / "index.html"
        if guess_dir.is_file():
            return guess_dir
    return None


def to_relative(target: Path, source: Path, root: Path) -> str:
    rel = os.path.relpath(target, source.parent).replace("\\", "/")
    return rel


def replace_abs_in_attr(
    match: re.Match, url_index: dict[str, Path], root: Path, source: Path
) -> str:
    url = match.group("url")
    target = resolve_local(url, url_index, root)
    if target is None:
        # Strip domain, keep site-root-relative path for assets
        parsed = urlparse(url)
        path = parsed.path.lstrip("/")
        if parsed.query:
            path += "?" + parsed.query
        if not path:
            new_url = "index.html"
        else:
            target_path = root / path.split("?")[0]
            if target_path.is_file():
                new_url = to_relative(target_path, source, root)
            elif (target_path.parent / "index.html").is_file():
                new_url = to_relative(target_path.parent / "index.html", source, root)
            elif target_path.with_suffix(".html").is_file():
                new_url = to_relative(target_path.with_suffix(".html"), source, root)
            else:
                new_url = to_relative(target_path, source, root)
            if "?" in url:
                new_url += "?" + urlparse(url).query
        return f'{match.group("attr")}={match.group("q")}{new_url}{match.group("q")}'
    new_url = to_relative(target, source, root)
    parsed = urlparse(url)
    if parsed.query and "?" not in new_url:
        new_url += "?" + parsed.query
    if parsed.fragment:
        new_url += "#" + parsed.fragment
    return f'{match.group("attr")}={match.group("q")}{new_url}{match.group("q")}'


def replace_plain_url(
    url: str, url_index: dict[str, Path], root: Path, source: Path
) -> str:
    target = resolve_local(url, url_index, root)
    if target:
        new_url = to_relative(target, source, root)
        parsed = urlparse(url)
        if parsed.query and "?" not in new_url:
            new_url += "?" + parsed.query
        return new_url
    parsed = urlparse(url)
    path = parsed.path.lstrip("/")
    if not path:
        return "index.html"
    try:
        return to_relative(root / path.split("?")[0], source, root)
    except ValueError:
        return path


def process_file(
    fp: Path, url_index: dict[str, Path], root: Path
) -> tuple[bool, dict[str, int]]:
    stats = {"base_removed": 0, "scripts_removed": 0, "urls_fixed": 0}
    try:
        original = fp.read_text(encoding="utf-8", errors="replace")
    except OSError as e:
        print(f"  skip {fp}: {e}", file=sys.stderr)
        return False, stats

    text = original

    new_text, n = BASE_TAG_RE.subn("", text)
    if n:
        stats["base_removed"] = n
        text = new_text

    for pat in REDIRECT_SCRIPT_RES:
        new_text, n = pat.subn("", text)
        if n:
            stats["scripts_removed"] += n
            text = new_text

    def attr_repl(m: re.Match) -> str:
        stats["urls_fixed"] += 1
        return replace_abs_in_attr(m, url_index, root, fp)

    text = ABS_URL_RE.sub(attr_repl, text)

    # Fix remaining plain absolute URLs in JSON-LD etc. (not in external attrs already done)
    def plain_repl(m: re.Match) -> str:
        stats["urls_fixed"] += 1
        return replace_plain_url(m.group(0), url_index, root, fp)

    text = PLAIN_ABS_RE.sub(plain_repl, text)

    if text != original:
        fp.write_text(text, encoding="utf-8", newline="")
        return True, stats
    return False, stats


def main() -> None:
    root = ROOT
    print("Building URL index from Mirrored-from comments...")
    url_index = build_url_index(root)
    print(f"  {len(url_index)} URL paths indexed")

    total_changed = 0
    totals = {"base_removed": 0, "scripts_removed": 0, "urls_fixed": 0}

    html_files: list[Path] = []
    for dirpath, _, filenames in os.walk(root):
        for name in filenames:
            if name.lower().endswith((".html", ".htm")) and name != "fix_redirects.py":
                html_files.append(Path(dirpath) / name)

    print(f"Processing {len(html_files)} HTML files...")
    for i, fp in enumerate(html_files, 1):
        changed, stats = process_file(fp, url_index, root)
        if changed:
            total_changed += 1
            for k, v in stats.items():
                totals[k] += v
        if i % 500 == 0:
            print(f"  ... {i}/{len(html_files)}")

    print("\nDone.")
    print(f"  Files modified: {total_changed}")
    print(f"  Base tags removed: {totals['base_removed']}")
    print(f"  Redirect scripts removed: {totals['scripts_removed']}")
    print(f"  Absolute URLs converted: {totals['urls_fixed']}")


if __name__ == "__main__":
    main()
