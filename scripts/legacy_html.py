# Shared helpers for the public/blog transform.
#
# These files are minified single-line HTML exported by the old Astro build.
# Nothing here parses and re-serialises them, and that is deliberate: any
# round trip through a DOM library rewrites entities, attribute quoting and
# whitespace across 53 published health articles, and "keep every word byte for
# byte" then becomes something you can only verify by eye.
#
# So the transform is pure string surgery. We locate a region by an exact
# anchor string, find the matching close tag with the scanner below, and splice.
# Every byte outside a spliced region is the byte that was there before.

import re

# Elements that never have a closing tag. `<canvas>` is NOT one of them, which
# is why the particle canvas needs the balanced scanner rather than a regex.
VOID = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}

# Inside these, "<div>" is text, not markup. The legacy pages carry a JSON-LD
# block and a module script, and the JSON-LD contains escaped HTML in its
# description fields.
RAW_TEXT = {"script", "style"}

_TAG = re.compile(r"<(/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(/?)>", re.S)
_COMMENT = re.compile(r"<!--.*?-->", re.S)


def find_matching_end(html, start, tag):
    """Index just past the close tag matching the element opening at `start`.

    `start` must be the index of the "<" of the opening tag. Raises if the
    document is unbalanced, because a silent wrong answer here would truncate
    an article.
    """
    m = _TAG.match(html, start)
    if not m or m.group(1) or m.group(2).lower() != tag.lower():
        raise ValueError(f"no <{tag}> opening at offset {start}: {html[start:start + 80]!r}")
    if m.group(4) or tag.lower() in VOID:
        return m.end()

    depth = 1
    pos = m.end()
    while depth:
        # Skip comments wholesale so "<!-- <div> -->" cannot move the depth.
        c = _COMMENT.match(html, pos)
        if c:
            pos = c.end()
            continue
        t = _TAG.search(html, pos)
        if not t:
            raise ValueError(f"unbalanced <{tag}> starting at {start}")
        name = t.group(2).lower()
        if name in RAW_TEXT and not t.group(1):
            close = html.lower().find(f"</{name}>", t.end())
            if close == -1:
                raise ValueError(f"unterminated <{name}>")
            pos = close + len(name) + 3
            continue
        if name == tag.lower():
            if t.group(1):
                depth -= 1
            elif not t.group(4) and name not in VOID:
                depth += 1
        pos = t.end()
    return pos


def cut(html, anchor, tag, occurrence=0):
    """(start, end) of the whole element whose opening tag literally is `anchor`."""
    pos = -1
    for _ in range(occurrence + 1):
        pos = html.find(anchor, pos + 1)
        if pos == -1:
            raise ValueError(f"anchor not found: {anchor[:70]!r}")
    return pos, find_matching_end(html, pos, tag)


def replace_element(html, anchor, tag, replacement):
    """Replace every element whose opening tag literally is `anchor`."""
    out, pos = [], 0
    while True:
        i = html.find(anchor, pos)
        if i == -1:
            out.append(html[pos:])
            return "".join(out)
        end = find_matching_end(html, i, tag)
        out.append(html[pos:i])
        out.append(replacement)
        pos = end


def replace_once(html, old, new, *, required=True, count=1):
    """Literal replace that refuses to no-op silently."""
    n = html.count(old)
    if n == 0:
        if required:
            raise ValueError(f"literal not found: {old[:90]!r}")
        return html
    if count is not None and n != count and required:
        raise ValueError(f"expected {count} of {old[:60]!r}, found {n}")
    return html.replace(old, new)
