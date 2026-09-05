const TISTORY_RSS_URL = "https://paski.tistory.com/rss";
const NOTE_LIMIT = 5;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/lab-notes") {
      return getLabNotes();
    }

    return env.ASSETS.fetch(request);
  },
};

async function getLabNotes() {
  try {
    const response = await fetch(TISTORY_RSS_URL, {
      cf: {
        cacheEverything: true,
        cacheTtl: 300,
      },
    });

    if (!response.ok) {
      throw new Error(`Tistory RSS request failed: ${response.status}`);
    }

    const xml = await response.text();
    const notes = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/gi))
      .map((match) => toLabNote(match[1]))
      .filter(Boolean)
      .slice(0, NOTE_LIMIT);

    return jsonResponse({ notes });
  } catch (error) {
    console.error("Unable to load Tistory RSS", error);
    return jsonResponse({ notes: [] }, 502);
  }
}

function toLabNote(itemXml) {
  const title = readTag(itemXml, "title");
  const url = readTag(itemXml, "link");
  const publishedAt = formatPublishedAt(readTag(itemXml, "pubDate"));

  if (!title || !isTistoryPostUrl(url)) {
    return null;
  }

  return { title, url, publishedAt };
}

function readTag(xml, tagName) {
  const match = xml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  if (!match) return "";

  return decodeXml(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim());
}

function isTistoryPostUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "paski.tistory.com";
  } catch {
    return false;
  }
}

function formatPublishedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}.${month}.${day}`;
}

function decodeXml(value) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      "Content-Type": "application/json; charset=UTF-8",
    },
  });
}
