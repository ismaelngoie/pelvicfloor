# Two Cloudflare toggles are overriding this repo's SEO rules

Neither of these is a code change. Both are switches in the Cloudflare dashboard
for the pelvi.health zone, and until they are flipped, `public/robots.txt` in
this repo has close to no effect on the live site. This is the highest leverage
item on the SEO list precisely because it is a toggle rather than work.

Measured against https://pelvi.health on 9 Aug 2026, not inferred.

## 1. The AI bot block is returning 403 to the bots that cite you

Sending a request to `https://pelvi.health/blog` with each user agent:

| User agent | Response |
| --- | --- |
| ClaudeBot | 403 |
| Claude-SearchBot | 403 |
| OAI-SearchBot | 403 |
| GPTBot | 403 |
| PerplexityBot | 403 |
| ChatGPT-User | 403 |
| Googlebot | 200 (after redirect) |
| bingbot | 200 (after redirect) |
| curl | 200 (after redirect) |
| a nonsense bot name | 200 (after redirect) |

The last row is the tell. A bot name that does not exist gets served normally,
so this is not a general bot defence. It is Cloudflare's managed AI bot rule
matching a specific list of AI user agents.

**What it costs.** `Claude-SearchBot`, `OAI-SearchBot`, `PerplexityBot` and
`ChatGPT-User` are not training crawlers. They are the fetchers an assistant
uses to open a page while answering a live question. A 403 to those means that
when someone asks an assistant to compare pelvic floor apps, this site cannot be
opened, cannot be quoted, and cannot be linked. For a new app with no brand
equity, that is the entire acquisition channel for AI search.

**Where to change it.** Cloudflare dashboard, pelvi.health zone, under the
bot and AI crawler controls (Cloudflare has shipped this as "AI Crawl Control",
previously "AI Audit", and as a "Block AI Scrapers and Crawlers" managed rule
under Security). The switch to turn off is whichever one is blocking AI
crawlers. Cloudflare moves this menu between releases, so search the dashboard
for "AI crawlers" rather than trusting a fixed path.

**What to allow when you find it.** Allow the retrieval and search agents:
`OAI-SearchBot`, `ChatGPT-User`, `Claude-SearchBot`, `Claude-User`,
`PerplexityBot`, `Perplexity-User`. Whether you also allow the training agents
`GPTBot` and `ClaudeBot` is a separate judgement, covered at the bottom of this
note.

## 2. Managed robots.txt is overwriting the site's own rules

`https://pelvi.health/robots.txt` today does not serve the file in this repo.
Cloudflare prepends a block of its own, and the live file reads:

```
# BEGIN Cloudflare Managed content
User-agent: *
Content-Signal: search=yes,ai-train=no,use=reference
Allow: /
User-agent: Amazonbot
Disallow: /
... Applebot-Extended, Bytespider, CCBot, ClaudeBot,
    Google-Extended, GPTBot, meta-externalagent all Disallow: /
# END Cloudflare Managed Content

User-Agent: *          <- the site's own group, second in the file
Allow: /
Disallow: /api/
...
```

Two concrete problems.

**The site's protective rules are the second `User-agent: *` group.** Google
merges same agent groups, so Google is fine. Plenty of other parsers take only
the first matching group and stop. Those parsers see Cloudflare's bare
`Allow: /` and never read the site's own `Disallow: /api/`, `/app`, `/admin`.

**Cloudflare's block contradicts the site on training.** Its group declares
`ai-train=no` and disallows `GPTBot`, `ClaudeBot` and `Google-Extended`. The
repo's file declares `ai-train=yes` and allows them. Whichever answer is right,
the site is currently publishing both.

**Where to change it.** Cloudflare dashboard, pelvi.health zone, Security >
Settings, the "Managed robots.txt" setting. Turn it off. The moment it is off,
`public/robots.txt` from this repo is served verbatim and both problems go away
together.

## What was done in code, so the rules survive either way

Because a dashboard toggle is outside this repo's control, the private paths no
longer depend on robots.txt at all:

- `public/_headers` now sets `X-Robots-Tag: noindex` on `/app`, `/app/*`,
  `/admin`, `/welcome` and on their `.txt` siblings. Nothing can prepend itself
  in front of a response header.
- The `.txt` files were a real hole. Next writes a React Server Component
  payload beside every exported route, so `/admin.txt` and `/app.txt` served the
  same screens as `text/plain` with a 200. The `noindex` meta tag in the HTML
  did not cover them, because a meta tag is only read inside HTML, and the
  robots.txt rules did not match them either. They were indexable.
- `public/robots.txt` was rewritten so the site ships exactly one
  `User-agent: *` group, with the AI bots split into a retrieval group and a
  training group that can be changed independently.

## Deliberately not done: llms.txt

It was considered and skipped. Google has stated it has no effect on Search or
AI Overviews, no major assistant consumes it for retrieval, and published
measurements of AI bot traffic find the overwhelming majority of llms.txt files
are never fetched at all. It is inert rather than harmful, so nothing breaks if
someone adds one later, but it is an hour better spent on the two toggles above.
This note exists so it does not get added as cargo.

## The one open judgement call

`public/robots.txt` currently allows the training bots `GPTBot` and `ClaudeBot`
and declares `Content-Signal: ai-train=yes`. That was a prior decision and this
pass preserved it rather than reversing it quietly, but it deserves a conscious
yes or no from you, because the argument runs both ways:

- **For allowing:** the blog is how a model comes to know this category exists,
  and presence in the model is the only shelf space a brand this size gets free.
- **For blocking:** the 61 article blog is the whole SEO moat, and training use
  gives it away with no citation and no link back in return.

Retrieval should stay allowed either way. If you decide to block training, flip
only the training group in `public/robots.txt` and change the `ai-train` value
in the `Content-Signal` line to match. Both are commented in place.
