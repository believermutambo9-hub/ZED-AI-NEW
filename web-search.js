// ==========================================
// ZED WEB SEARCH
// Free web search using DuckDuckGo
// ==========================================


/* =========================
   CLEAN HTML
========================= */

function cleanText(value = "") {

  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCharCode(
          Number(code)
        );
      } catch {
        return "";
      }
    })
    .replace(/\s+/g, " ")
    .trim();
}


/* =========================
   CLEAN URL
========================= */

function cleanUrl(url = "") {

  let result =
    String(url).trim();

  if (!result) {
    return "";
  }

  if (result.startsWith("//")) {
    result =
      "https:" + result;
  }

  /*
   * DuckDuckGo sometimes returns
   * redirect URLs such as:
   *
   * /l/?uddg=https%3A%2F%2Fexample.com
   */

  try {

    if (
      result.includes("uddg=")
    ) {

      const parsed =
        new URL(
          result,
          "https://duckduckgo.com"
        );

      const destination =
        parsed.searchParams.get(
          "uddg"
        );

      if (destination) {
        result =
          decodeURIComponent(
            destination
          );
      }
    }

  } catch {
    // Keep original URL.
  }

  return result;
}


/* =========================
   CREATE SEARCH QUERY
========================= */

function buildSearchQuery(query) {

  const text =
    query
      .trim();

  const lower =
    text.toLowerCase();

  /*
   * Football/current-score questions
   */

  const footballWords = [
    "football",
    "soccer",
    "score",
    "scores",
    "result",
    "results",
    "fixture",
    "fixtures",
    "match",
    "matches",
    "premier league",
    "champions league",
    "world cup",
    "afcon",
    "super league",
    "league table",
    "standings",
    "transfer",
    "transfers"
  ];

  const isFootball =
    footballWords.some(
      word =>
        lower.includes(word)
    );

  if (isFootball) {

    return (
      `${text} today latest scores results ` +
      "football matches"
    );
  }

  return text;
}


/* =========================
   DUCKDUCKGO SEARCH
========================= */

export async function webSearch(
  query
) {

  if (
    !query ||
    typeof query !== "string"
  ) {

    return {
      ok: false,
      results: [],
      error:
        "Search query is missing."
    };

  }

  const cleanQuery =
    query.trim();

  if (!cleanQuery) {

    return {
      ok: false,
      results: [],
      error:
        "Search query is empty."
    };

  }


  const searchQuery =
    buildSearchQuery(
      cleanQuery
    );


  try {

    console.log(
      "DuckDuckGo query:",
      searchQuery
    );


    const url =
      "https://html.duckduckgo.com/html/?q=" +
      encodeURIComponent(
        searchQuery
      );


    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {

            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
              "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",

            "Accept":
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",

            "Accept-Language":
              "en-US,en;q=0.9",

            "Cache-Control":
              "no-cache",

            "Pragma":
              "no-cache"
          }
        }
      );


    if (!response.ok) {

      throw new Error(
        `DuckDuckGo returned HTTP ${response.status}`
      );

    }


    const html =
      await response.text();


    if (
      !html ||
      html.length < 100
    ) {

      throw new Error(
        "DuckDuckGo returned an empty response."
      );

    }


    console.log(
      "DuckDuckGo response length:",
      html.length
    );


    const results = [];


    /*
     * Method 1:
     * Standard DuckDuckGo HTML results.
     */

    const resultRegex =
      /<div[^>]*class=["'][^"']*result[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;


    let match;

    while (
      (match =
        resultRegex.exec(html)) !==
      null
    ) {

      const block =
        match[1];


      const titleMatch =
        block.match(
          /<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*>([\s\S]*?)<\/a>/i
        );


      const linkMatch =
        block.match(
          /<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["']/i
        );


      const snippetMatch =
        block.match(
          /<a[^>]*class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/a>/i
        ) ||
        block.match(
          /<div[^>]*class=["'][^"']*result__snippet[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
        );


      if (
        !titleMatch ||
        !linkMatch
      ) {
        continue;
      }


      const title =
        cleanText(
          titleMatch[1]
        );


      const link =
        cleanUrl(
          linkMatch[1]
        );


      const snippet =
        snippetMatch
          ? cleanText(
              snippetMatch[1]
            )
          : "";


      if (
        !title ||
        !link
      ) {
        continue;
      }


      if (
        results.some(
          item =>
            item.link === link
        )
      ) {
        continue;
      }


      results.push({
        title,
        link,
        snippet
      });


      if (
        results.length >= 10
      ) {
        break;
      }

    }


    /*
     * Method 2:
     * More flexible fallback parser.
     *
     * This helps when DuckDuckGo changes
     * its HTML structure.
     */

    if (
      results.length === 0
    ) {

      const anchorRegex =
        /<a[^>]*class=["'][^"']*result__a[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;


      let fallbackMatch;


      while (
        (fallbackMatch =
          anchorRegex.exec(html)) !==
        null
      ) {

        const link =
          cleanUrl(
            fallbackMatch[1]
          );


        const title =
          cleanText(
            fallbackMatch[2]
          );


        if (
          !title ||
          !link
        ) {
          continue;
        }


        if (
          results.some(
            item =>
              item.link === link
          )
        ) {
          continue;
        }


        results.push({

          title,

          link,

          snippet:
            ""

        });


        if (
          results.length >= 10
        ) {
          break;
        }

      }

    }


    /*
     * Method 3:
     * If DuckDuckGo gives no standard
     * result blocks, look for result links.
     */

    if (
      results.length === 0
    ) {

      const linkRegex =
        /href=["'](https?:\/\/[^"']+)["']/gi;


      let linkMatch;


      while (
        (linkMatch =
          linkRegex.exec(html)) !==
        null
      ) {

        const link =
          cleanUrl(
            linkMatch[1]
          );


        if (
          !link ||
          link.includes(
            "duckduckgo.com"
          )
        ) {
          continue;
        }


        if (
          results.some(
            item =>
              item.link === link
          )
        ) {
          continue;
        }


        results.push({

          title:
            "Web result",

          link,

          snippet:
            ""

        });


        if (
          results.length >= 10
        ) {
          break;
        }

      }

    }


    console.log(
      "DuckDuckGo results found:",
      results.length
    );


    return {

      ok: true,

      query:
        cleanQuery,

      searchQuery,

      results

    };


  } catch (error) {

    console.error(
      "Web search error:",
      error
    );


    return {

      ok: false,

      query:
        cleanQuery,

      results: [],

      error:
        error.message ||
        "Web search failed."

    };

  }

}


/* =========================
   SHOULD ZED SEARCH?
========================= */

export function shouldSearchWeb(
  message
) {

  if (
    !message ||
    typeof message !== "string"
  ) {

    return false;

  }


  const text =
    message
      .toLowerCase()
      .trim();


  if (!text) {
    return false;
  }


  const searchWords = [

    /* Current information */

    "latest",
    "today",
    "tonight",
    "tomorrow",
    "yesterday",
    "current",
    "currently",
    "right now",
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
    "what's happening",
    "what is happening",

    /* Football */

    "football",
    "soccer",
    "score",
    "scores",
    "result",
    "results",
    "fixture",
    "fixtures",
    "match",
    "matches",
    "premier league",
    "champions league",
    "europa league",
    "conference league",
    "afcon",
    "world cup",
    "super league",
    "league table",
    "standings",
    "transfer",
    "transfers",
    "player",
    "players",
    "team",
    "teams",

    /* Weather */

    "weather",
    "temperature",
    "forecast",
    "rain",
    "raining",

    /* Money */

    "price",
    "prices",
    "cost",
    "costs",
    "exchange rate",
    "currency",
    "kwacha",
    "dollar",
    "euro",
    "pound",

    /* Internet */

    "youtube",
    "facebook",
    "tiktok",
    "instagram",
    "website",
    "web",
    "internet",
    "online",
    "search",
    "look up",
    "find online",

    /* Places / businesses */

    "restaurant",
    "hotel",
    "shop",
    "store",
    "business",
    "near me",
    "nearby",

    /* Current people / organizations */

    "president",
    "minister",
    "government",
    "company",
    "ceo",
    "elon musk",
    "donald trump"

  ];


  return searchWords.some(
    word =>
      text.includes(word)
  );

}
