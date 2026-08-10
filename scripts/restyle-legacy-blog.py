#!/usr/bin/env python3
"""Bring the 53 legacy blog articles onto the current design.

    python3 scripts/restyle-legacy-blog.py            # transform in place
    python3 scripts/restyle-legacy-blog.py --check    # verify, change nothing
    python3 scripts/restyle-legacy-blog.py --from DIR # re-run from a snapshot

WHAT THIS IS FOR

public/blog holds 53 articles exported by an Astro build that is gone. They
were the old black theme: a particle canvas, a mouse-follow glow, two families
from fonts.googleapis.com on the critical path, and not one colour, size or
link in common with the site around them. They are also where organic and AI
traffic lands, so they are the first thing a new reader sees.

THE RULES THIS SCRIPT WORKS UNDER

1.  THE ARTICLE BODY IS NOT TOUCHED. Everything inside <div class=
    "article-content"> comes out byte for byte identical, and --check proves
    it against the snapshot rather than trusting that it did. The only edit to
    that element is dropping "scroll-animation" from its own class attribute,
    a class whose sole purpose was to be faded in by the observer this script
    deletes.

2.  THE "MEDICALLY REVIEWED BY" BYLINE IS NOT TOUCHED. Nine clinicians are
    named across these files. The words, the names and the credentials come
    through unchanged; only the wrapper's class changes, so the line stops
    being grey-on-black and becomes the byline the new articles wear. Read the
    note at the top of components/blog/ReviewStatus.jsx before going near it.
    A pre-launch pass deleted these and the owner has restored them twice.

3.  NOTHING 404s AND NOTHING LOSES CONTENT. Slugs, canonical URLs, JSON-LD,
    titles, meta descriptions, OG and Twitter cards and every internal link are
    carried through untouched.

HOW IT WORKS

String surgery, not a parse-and-reserialise. A DOM library would rewrite
entities, attribute quoting and whitespace across 53 published health articles,
and "byte for byte" would stop being checkable. So each region is located by an
exact anchor string, its end is found with a balanced-tag scanner
(scripts/legacy_html.py), and the span is spliced. Every byte outside a spliced
region is the byte that was there before.

Anchors are asserted, never best-effort: a file whose markup does not match
raises and the whole run aborts before writing anything. Half a transform
across 53 live articles is worse than none.
"""

import argparse
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from legacy_html import cut, find_matching_end, replace_element, replace_once  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG = os.path.join(ROOT, "public", "blog")

# The year printed in the footer if scripting is off. The <span> next to it is
# refreshed from the clock, so this file does not become the next "(c) 2025".
FALLBACK_YEAR = "2026"

# --------------------------------------------------------------------------
# The chrome, transcribed from components/blog/BlogChrome.jsx.
#
# Same two links in the header, same five in the footer, same disclaimer, in
# the same order. If that component changes, this string changes with it.
# --------------------------------------------------------------------------

HEADER = (
    '<a class="pv-skip" href="#article">Skip to the article</a>'
    '<header class="pv-site-header">'
    '<div class="pv-site-header__inner">'
    '<a href="/" class="pv-brand">'
    '<img src="/icon.png" alt="" width="28" height="28">'
    "<span>Pelvi Health</span>"
    "</a>"
    '<a href="/blog" class="pv-site-header__link">All articles</a>'
    "</div>"
    "</header>"
)

FOOTER = (
    '<footer class="pv-site-footer">'
    '<div class="pv-site-footer__inner">'
    '<p class="pv-site-footer__note"><strong>Medical disclaimer.</strong> '
    "Pelvi Health publishes general education about pelvic health. It is not "
    "medical advice, it is not a diagnosis, and no article here can know what "
    "is happening in your body. If something hurts, if something is bleeding, "
    "or if a symptom is new and you do not know why, see a doctor or a pelvic "
    "health physiotherapist.</p>"
    '<nav class="pv-site-footer__nav">'
    '<a href="/blog">Articles</a>'
    '<a href="/">Build my plan</a>'
    '<a href="/contact.html">Contact</a>'
    '<a href="/privacy-policy">Privacy</a>'
    '<a href="/terms">Terms</a>'
    "</nav>"
    '<p class="pv-site-footer__copy">&copy; <span id="pv-year">'
    + FALLBACK_YEAR
    + "</span> Pelvi Health</p>"
    "</div>"
    "</footer>"
    # Six lines of the old module script drew a particle field on every scroll
    # frame. This is what is left of the JavaScript on these pages: one
    # expression, inline, no request, so a copyright year cannot go stale on 53
    # files nobody will remember to edit next January.
    '<script>var y=document.getElementById("pv-year");'
    "if(y){y.textContent=new Date().getFullYear()}</script>"
)

# The CTA, transcribed from prose.jsx AppCTA. It points at "/", the eight
# question funnel, which is the only thing on this domain that takes money.
# The legacy card it replaces also pointed at "/", so no link changes meaning.
CTA = (
    '<aside class="pv-cta">'
    '<p class="pv-cta__kicker">From the people who wrote this</p>'
    '<p class="pv-cta__lead">Pelvi builds you a 90-day plan and then walks you '
    "through it, five minutes at a time.</p>"
    '<p class="pv-cta__body">Nine goals, a 90-day program behind each one, and '
    "533 filmed exercises so you can see the movement instead of reading it. "
    "Answer eight questions and you will see the plan before you pay for "
    "anything.</p>"
    '<a class="pv-cta__button" href="/">Build my plan</a>'
    "</aside>"
)

STYLES = (
    '<link rel="preload" href="/fonts/inter-latin-v1.woff2" as="font" '
    'type="font/woff2" crossorigin>'
    '<link rel="stylesheet" href="/blog-legacy.css">'
)

MARKER = "/blog-legacy.css"


# --------------------------------------------------------------------------
# Head
# --------------------------------------------------------------------------
def transform_head(html):
    """Drop the third-party font and the dead Astro CSS; add ours."""
    # Two preconnects and a render-blocking stylesheet at fonts.googleapis.com,
    # for Inter plus Lora. Inter is self hosted now and Lora is not in the
    # design at all, so an article no longer waits on Google to paint.
    html = replace_once(html, '<link rel="preconnect" href="https://fonts.googleapis.com">', "")
    html = replace_once(
        html, '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>', ""
    )
    html = re.sub(
        r'<link href="https://fonts\.googleapis\.com/css2\?[^"]*" rel="stylesheet">', "", html
    )
    if "fonts.googleapis.com" in html or "fonts.gstatic.com" in html:
        raise ValueError("a Google Fonts reference survived")

    # The old theme's compiled CSS. Both files stay on disk for now; nothing
    # references them once all 53 are transformed.
    html = replace_once(html, '<link rel="stylesheet" href="/blog.css">', STYLES)
    html = re.sub(r'<link rel="stylesheet" href="/_astro/[^"]*">', "", html)

    # Inline <style> blocks: the particle canvas and mouse-glow positioning,
    # and the dark theme's own overrides.
    while True:
        i = html.find("<style>")
        if i == -1:
            break
        html = html[:i] + html[find_matching_end(html, i, "style") :]

    # theme-color painted the phone's browser chrome black to match a page that
    # is no longer black. #FAF9FA is app.background and is what app/blog/layout
    # declares for the new articles.
    html = replace_once(
        html,
        '<meta name="theme-color" content="#000000">',
        '<meta name="theme-color" content="#FAF9FA">',
    )
    return html


# --------------------------------------------------------------------------
# Body
# --------------------------------------------------------------------------
def transform_body(html):
    # --- the two decorations, and the script that drove them ---------------
    # A full-page <canvas> repainting up to 150 particles at 60fps for the life
    # of the visit, plus a div chasing the cursor on every mousemove. On a
    # phone, which is 98% of the traffic, the glow is unreachable and the
    # canvas is pure battery.
    html = replace_element(html, '<canvas id="particle-canvas" aria-hidden="true">', "canvas", "")
    html = replace_element(html, '<div id="mouse-glow" aria-hidden="true">', "div", "")

    i = html.find('<script type="module">')
    if i == -1:
        raise ValueError("module script not found")
    html = html[:i] + html[find_matching_end(html, i, "script") :]
    if "particle-canvas" in html or "mouse-glow" in html:
        raise ValueError("a particle canvas or mouse glow reference survived")

    # --- shell -------------------------------------------------------------
    html = re.sub(r'<body class="overflow-x-hidden">', '<body class="pv-doc">', html, count=1)

    start, end = cut(html, '<header class="fixed top-0 left-0 right-0 z-20 p-4 backdrop-blur-sm bg-black/30">', "header")
    html = html[:start] + HEADER + html[end:]

    # pt-24 existed only to clear the fixed header that just went away.
    # #article is the skip link's landing.
    html = replace_once(html, '<main class="pt-24">', '<main class="pv-main" id="article">')
    html = replace_once(html, '<div class="container mx-auto px-4">', '<div class="container">')

    html = replace_once(
        html,
        '<nav class="breadcrumb text-sm text-gray-400 mb-8" aria-label="Breadcrumb">',
        '<nav class="pv-breadcrumb" aria-label="Breadcrumb">',
    )
    # The last crumb is now clipped by CSS rather than by a `truncate` class
    # that stopped compiling when the old bundle went.
    html = replace_once(html, '<li class="text-white truncate">', "<li>")

    # --- article head ------------------------------------------------------
    html = replace_once(html, '<header class="mb-12">', '<header class="pv-article-head">')
    html = replace_once(
        html,
        '<span class="text-sm font-bold uppercase text-pink-400">',
        '<span class="pv-kicker">',
    )
    html = re.sub(r'<h1 class="serif[^"]*">', '<h1 class="pv-title">', html, count=1)

    # THE BYLINE WRAPPER. This is as close as this script gets to the
    # "Medically reviewed by" line: the container's class, and nothing else.
    # The date, the clinician's name and their credentials inside it are the
    # owner's content and pass through untouched.
    html = replace_once(
        html, '<div class="mt-6 text-sm text-gray-400">', '<div class="pv-byline">'
    )

    # --- body blocks -------------------------------------------------------
    # `scroll-animation` was the hook for an IntersectionObserver that faded
    # blocks in. The observer is gone, so the class is dead weight; if any
    # future stylesheet ever gave it opacity:0 with no observer to undo it, a
    # third of the article would be invisible. That has happened here before.
    html = html.replace(
        '<section class="key-takeaways scroll-animation" aria-labelledby="takeaways-heading">',
        '<section class="key-takeaways" aria-labelledby="takeaways-heading">',
    )
    html = html.replace(
        '<div class="article-content space-y-6 scroll-animation">',
        '<div class="article-content">',
    )

    # Both app CTA cards: the one in the article and the one in the sidebar.
    # The sidebar copy is dropped entirely rather than restyled, because the
    # layout is a single column now and it would just be the same card twice.
    html = replace_element(
        html,
        '<div class="app-cta-card p-6 rounded-2xl text-center my-12 scroll-animation glass-card" data-astro-cid-tqcoi4xv>',
        "div",
        CTA,
    )
    html = replace_element(
        html, '<div class="app-cta-card p-6 rounded-2xl text-center">', "div", ""
    )
    if "app-cta-card" in html:
        raise ValueError("an app-cta-card survived")

    # --- FAQ ---------------------------------------------------------------
    html = replace_once(
        html, '<section id="faq" class="mt-16 scroll-animation">', '<section id="faq" class="pv-faq">'
    )
    html = replace_once(
        html,
        '<h2 class="serif text-3xl font-bold text-white mb-6">Frequently Asked Questions</h2>'
        '<div class="space-y-4">',
        "<h2>Frequently Asked Questions</h2>" '<div class="pv-faq-list">',
    )
    # The <details> keep their dead utility classes; blog-legacy.css styles them
    # structurally, so no answer text is disturbed.

    # --- read next, and the article's own disclaimer -----------------------
    html = replace_once(
        html,
        '<section class="mt-16"><h2 class="serif text-2xl font-bold text-white mb-4">Keep Reading</h2>'
        '<div class="space-y-3">',
        '<section class="pv-related"><h2>Keep Reading</h2><div class="pv-related-list">',
    )
    html = replace_once(
        html,
        '<section class="mt-16 p-4 border border-neutral-800 rounded-lg bg-neutral-900/50">',
        '<section class="pv-disclaimer">',
    )

    # --- contents ----------------------------------------------------------
    # The old "On This Page" nav was a sticky sidebar in a two column grid,
    # hidden below `lg` by a class that stopped compiling when the old bundle
    # went. Left where it was it would have appeared on phones, and CSS alone
    # could only have ordered it above the whole <article>, which put eleven
    # links between the reader and the headline.
    #
    # So the list is lifted out of the sidebar and re-inserted where
    # ArticleShell puts it: after the key takeaways, as a closed <details>. The
    # <ul> and every anchor inside it move verbatim; only the wrapper is new.
    start, end = cut(html, '<aside class="hidden lg:block">', "aside")
    aside = html[start:end]
    u_start = aside.find('<ul class="space-y-2 text-sm">')
    if u_start == -1:
        raise ValueError("table of contents list not found")
    toc_list = aside[u_start : find_matching_end(aside, u_start, "ul")]
    count = toc_list.count("<li>")
    if count < 1:
        raise ValueError("table of contents is empty")
    toc_list = toc_list.replace(
        '<ul class="space-y-2 text-sm">', "<ul>", 1
    )
    # Strip the dead hover-on-black utilities from the anchors. The href, the
    # text and the order are untouched.
    toc_list = toc_list.replace(' class="text-gray-400 hover:text-white transition"', "")
    html = html[:start] + html[end:]

    contents = (
        '<details class="pv-toc">'
        '<summary>On this page <span aria-hidden="true">(' + str(count) + ")</span></summary>"
        + toc_list
        + "</details>"
    )

    # Anchored on the end of the FIRST key takeaways card, which is where it
    # sits in every one of the 53 and is stable even in the one file whose
    # article block is nested inside a duplicate of itself.
    k_start, k_end = cut(
        html, '<section class="key-takeaways" aria-labelledby="takeaways-heading">', "section"
    )
    html = html[:k_end] + contents + html[k_end:]

    # --- footer ------------------------------------------------------------
    start, end = cut(html, '<footer class="py-8 px-4 text-center text-gray-500 text-sm">', "footer")
    html = html[:start] + FOOTER + html[end:]
    if "2025 Pelvi Health. All rights reserved" in html:
        raise ValueError("the old copyright line survived")

    return html


def transform(html):
    if MARKER in html:
        raise ValueError("already transformed")
    return transform_body(transform_head(html))


# --------------------------------------------------------------------------
# Verification
# --------------------------------------------------------------------------
def article_bodies(html):
    """Every .article-content element, inner HTML, in document order."""
    out, pos = [], 0
    anchor_new = '<div class="article-content">'
    anchor_old = '<div class="article-content space-y-6 scroll-animation">'
    while True:
        i_new = html.find(anchor_new, pos)
        i_old = html.find(anchor_old, pos)
        cands = [(i, a) for i, a in ((i_new, anchor_new), (i_old, anchor_old)) if i != -1]
        if not cands:
            return out
        i, anchor = min(cands)
        end = find_matching_end(html, i, "div")
        out.append(html[i + len(anchor) : end - len("</div>")])
        pos = i + len(anchor)


# --------------------------------------------------------------------------
# Normalisation for the byte-for-byte body comparison.
#
# One article, top-5-foods-that-irritate-your-bladder, was exported with its
# whole block nested inside a second copy of itself, so for that one file a
# key takeaways card, an app CTA and a second .article-content all sit INSIDE
# .article-content. Comparing raw bytes would flag it as changed, correctly but
# uselessly, because the only things that moved in there are the three
# rewrites this script is supposed to make.
#
# So both sides are put through the SAME normalisation and then compared.
# Everything the normaliser touches is enumerated here and nowhere else: a
# class attribute on the body wrapper, a class attribute on the takeaways
# wrapper, and the marketing card, which is swapped by design. Prose is not in
# this list and cannot be normalised away.
# --------------------------------------------------------------------------
def normalise_body(text):
    text = text.replace(
        '<div class="article-content space-y-6 scroll-animation">',
        '<div class="article-content">',
    )
    text = text.replace(
        '<section class="key-takeaways scroll-animation" aria-labelledby="takeaways-heading">',
        '<section class="key-takeaways" aria-labelledby="takeaways-heading">',
    )
    for anchor, tag in (
        (
            '<div class="app-cta-card p-6 rounded-2xl text-center my-12 scroll-animation glass-card" data-astro-cid-tqcoi4xv>',
            "div",
        ),
        ('<aside class="pv-cta">', "aside"),
    ):
        text = replace_element(text, anchor, tag, "\x00CTA\x00")
    return text


TAGS = re.compile(r"<[^>]+>")
DROPPED_ELEMENTS = re.compile(
    r"<(script|style|svg)\b.*?</\1>", re.S | re.I
)


def visible_text(html):
    """Words a reader actually sees, as a list, for a whole-document check.

    This is the backstop behind the body comparison. The body check proves the
    prose is untouched; this one proves nothing was dropped ANYWHERE else in
    the document either, chrome included, and it is why the transform can be
    trusted not to have quietly eaten a heading or an FAQ answer.
    """
    html = DROPPED_ELEMENTS.sub(" ", html)
    return TAGS.sub(" ", html).split()


BYLINE_RE = re.compile(r"Medically reviewed by\s*<a[^>]*>(.*?)</a>", re.S)


def bylines(html):
    return BYLINE_RE.findall(html)


def jsonld(html):
    return re.findall(
        r'<script type="application/ld\+json">(.*?)</script>', html, re.S
    )


def canonical(html):
    m = re.search(r'<link rel="canonical" href="([^"]*)"', html)
    return m.group(1) if m else None


# The only visible words this script is allowed to remove from a page. All of
# them are chrome: the old header nav, the old marketing card, the old footer.
# Anything else disappearing from a published health article is a bug, and the
# run aborts on it.
REMOVABLE_TEXT = " ".join(
    [
        "Features Blog Get Started Start My Plan",  # old header nav and button
        "Your Personal AI Physio-Coach",  # old CTA card, in body and in sidebar
        "Stop leaks, pain & intimacy issues with a 5-min daily plan built for you.",
        "Start My 5-Min Journey",
        "On This Page",  # recased to "On this page"
        "Terms of Use Privacy Policy Blog Contact",  # old footer nav
        "&copy; © 2025 Pelvi Health. All rights reserved.",
    ]
)


def compare(before, after, label, errors):
    b_bodies = [normalise_body(b) for b in article_bodies(before)]
    a_bodies = [normalise_body(b) for b in article_bodies(after)]
    if b_bodies != a_bodies:
        errors.append(f"{label}: ARTICLE BODY CHANGED")
    if not b_bodies:
        errors.append(f"{label}: NO ARTICLE BODY FOUND")

    # Whole-document backstop: nothing readable may vanish outside the prose
    # either. Counting, not just set membership, so a heading that lost one of
    # its two occurrences still trips it.
    b_words, a_words = visible_text(before), visible_text(after)
    allowed = set(REMOVABLE_TEXT.split())
    lost = []
    a_counts = {}
    for w in a_words:
        a_counts[w] = a_counts.get(w, 0) + 1
    b_counts = {}
    for w in b_words:
        b_counts[w] = b_counts.get(w, 0) + 1
    for w, n in b_counts.items():
        if n > a_counts.get(w, 0) and w not in allowed:
            lost.append(f"{w}x{n - a_counts.get(w, 0)}")
    if lost:
        errors.append(f"{label}: TEXT LOST {sorted(lost)[:12]}")

    if bylines(before) != bylines(after):
        errors.append(
            f"{label}: BYLINE CHANGED {bylines(before)!r} -> {bylines(after)!r}"
        )
    if jsonld(before) != jsonld(after):
        errors.append(f"{label}: JSON-LD CHANGED")
    if canonical(before) != canonical(after):
        errors.append(f"{label}: CANONICAL CHANGED")

    # Every href in the old file must still be in the new one, except the ones
    # this script is meant to remove.
    dropped = {
        "https://fonts.googleapis.com",
        "https://fonts.gstatic.com",
        "/blog.css",
        "/_astro/_slug_.CQzeT8_j.css",
        "/#features",  # no #features anchor exists anywhere on this site
        "/#pricing",  # nor #pricing; both were dead nav from the Astro landing
        "/logo.png",  # the 28px mark is /icon.png, as in BlogHeader
    }
    b_links = {
        h
        for h in re.findall(r'href="([^"]*)"', before)
        if h not in dropped and not h.startswith("https://fonts.")
    }
    a_links = set(re.findall(r'href="([^"]*)"', after))
    missing = b_links - a_links
    if missing:
        errors.append(f"{label}: LINKS LOST {sorted(missing)}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="verify only, write nothing")
    ap.add_argument("--from", dest="src", help="snapshot of the pristine files to re-run from")
    args = ap.parse_args()

    # --check compares the live file against the untransformed original. With no
    # original to compare to it would be comparing each file with itself and
    # reporting green every time, which is worse than not running it: the whole
    # value of this mode is proving the article bodies and the bylines survived.
    if args.check and not args.src:
        print(
            "--check needs --from DIR, a copy of the files as they were before the\n"
            "transform (git worktree, tarball, or `git show HEAD:<path>` dumped to\n"
            "a directory). Without it there is nothing to compare against and a\n"
            "pass would mean nothing.",
            file=sys.stderr,
        )
        return 2

    slugs = sorted(
        d for d in os.listdir(BLOG) if os.path.isfile(os.path.join(BLOG, d, "index.html"))
    )
    if len(slugs) != 53:
        print(f"expected 53 articles, found {len(slugs)}", file=sys.stderr)

    errors, results = [], []
    for slug in slugs:
        live = os.path.join(BLOG, slug, "index.html")
        src = os.path.join(args.src, slug, "index.html") if args.src else live
        before = open(src, encoding="utf-8").read()

        if args.check:
            after = open(live, encoding="utf-8").read()
            if MARKER not in after:
                errors.append(f"{slug}: NOT TRANSFORMED")
                continue
            compare(before, after, slug, errors)
            continue

        try:
            after = transform(before)
        except Exception as exc:  # noqa: BLE001
            errors.append(f"{slug}: {exc}")
            continue
        compare(before, after, slug, errors)
        results.append((live, after))

    if errors:
        print("FAILED, nothing written:", file=sys.stderr)
        for e in errors:
            print("  " + e, file=sys.stderr)
        return 1

    if args.check:
        print(f"checked {len(slugs)} articles: bodies, bylines, JSON-LD, canonicals, links all intact")
        return 0

    for path, html in results:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(html)
    print(f"restyled {len(results)} articles")
    return 0


if __name__ == "__main__":
    sys.exit(main())
