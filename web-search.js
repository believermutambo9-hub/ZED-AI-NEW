// ==========================================
// ZED WEB SEARCH
// Free search using DuckDuckGo
// ==========================================

export async function webSearch(query) {
  if (!query || typeof query !== "string") {
    return {
      ok: false,
      results: [],
      error: "Search query is missing."
    };
  }

  const cleanQuery = query.trim();

  if (!cleanQuery) {
    return {
      ok: false,
      results: [],
      error: "Search query is empty."
    };
  }

  try {
    const url =
      "https://html.duckduckgo.com/html/?q=" +
      encodeURIComponent(cleanQuery);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36"
      }
    });

    if (!response.ok) {
      throw new Error(
        `Search service returned ${response.status}`
      );
    }

    const html = await response.text();

    const results = [];

    const resultBlocks =
      html.split('class="result results_links');

    for (let i = 1; i < resultBlocks.length; i++) {
      const block = resultBlocks[i];

      const titleMatch =
        block.match(
          /class="result__a"[^>]*>([\s\S]*?)<\/a>/
        );

      const linkMatch =
        block.match(
          /class="result__a"[^>]*href="([^"]+)"/
        );

      const snippetMatch =
        block.match(
          /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/
        ) ||
        block.match(
          /class="result__snippet"[^>]*>([\s\S]*?)<\/td>/
        );

      if (!titleMatch || !linkMatch) {
        continue;
      }

      const cleanText = (text) =>
        text
          .replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/\s+/g, " ")
          .trim();

      const title =
        cleanText(titleMatch[1]);

      const snippet =
        snippetMatch
          ? cleanText(snippetMatch[1])
          : "";

      let link =
        linkMatch[1];

      // DuckDuckGo sometimes returns a redirect URL.
      if (link.startsWith("//")) {
        link = "https:" + link;
      }

      results.push({
        title,
        link,
        snippet
      });

      // Keep the search small and fast.
      if (results.length >= 8) {
        break;
      }
    }

    return {
      ok: true,
      query: cleanQuery,
      results
    };

  } catch (error) {

    console.error(
      "Web search error:",
      error
    );

    return {
      ok: false,
      results: [],
      error:
        error.message ||
        "Web search failed."
    };
  }
}


// ==========================================
// DECIDE WHETHER ZED SHOULD SEARCH
// ==========================================

export function shouldSearchWeb(message) {
  if (
    !message ||
    typeof message !== "string"
  ) {
    return false;
  }

  const text =
    message.toLowerCase().trim();

  const searchWords = [
    "latest",
    "today",
    "tonight",
    "tomorrow",
    "yesterday",
    "current",
    "currently",
    "now",
    "news",
    "update",
    "updates",
    "recent",
    "recently",
    "this week",
    "this month",
    "this year",
    "what happened",
    "who won",
    "score",
    "scores",
    "result",
    "results",
    "fixture",
    "fixtures",
    "match",
    "matches",
    "football",
    "soccer",
    "premier league",
    "champions league",
    "afcon",
    "world cup",
    "league table",
    "standings",
    "transfer",
    "transfers",
    "player",
    "players",
    "team",
    "teams",
    "weather",
    "price",
    "prices",
    "cost",
    "exchange rate",
    "currency",
    "youtube",
    "facebook",
    "tiktok",
    "instagram",
    "search",
    "look up",
    "find online",
    "on the internet",
    "website",
    "web"
  ];

  return searchWords.some(
    word => text.includes(word)
  );
}
