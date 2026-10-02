// web-search.js

function cleanText(value = "") {

  return String(value)

    .replace(/<[^>]*>/g, "")

    .replace(/\s+/g, " ")

    .trim();

}

function formatDateForZambia() {

  return new Intl.DateTimeFormat("en-CA", {

    timeZone: "Africa/Lusaka",

    year: "numeric",

    month: "2-digit",

    day: "2-digit"

  }).format(new Date()).replace(/-/g, "");

}

function isFootballQuestion(query = "") {

  const text = query.toLowerCase();

  const footballWords = [

    "football",

    "soccer",

    "match",

    "matches",

    "fixture",

    "fixtures",

    "score",

    "scores",

    "result",

    "results",

    "premier league",

    "epl",

    "champions league",

    "europa league",

    "conference league",

    "la liga",

    "serie a",

    "bundesliga",

    "ligue 1",

    "mls",

    "world cup",

    "nations league",

    "zambian super league",

    "super league",

    "arsenal",

    "chelsea",

    "liverpool",

    "manchester united",

    "manchester city",

    "barcelona",

    "real madrid",

    "bayern",

    "juventus",

    "inter milan",

    "ac milan",

    "psg",

    "tottenham",

    "newcastle",

    "dortmund",

    "finland",

    "belarus",

    "zambia"

  ];

  return footballWords.some(word =>

    text.includes(word)

  );

}

function isFootballScoreRequest(query = "") {

  const text = query.toLowerCase();

  const scoreWords = [

    "live score",

    "live scores",

    "score",

    "scores",

    "result",

    "results",

    "fixture",

    "fixtures",

    "schedule",

    "today's matches",

    "todays matches",

    "today matches",

    "matches today",

    "games today",

    "playing today",

    "who is playing",

    "who are playing",

    "upcoming match",

    "upcoming matches",

    "next match",

    "next matches",

    "kick off",

    "kickoff",

    "kick-off"

  ];

  return scoreWords.some(word =>

    text.includes(word)

  );

}

function isRecentInformationRequest(query = "") {

  const text = query.toLowerCase();

  const recentWords = [

    "latest",

    "current",

    "recent",

    "today",

    "today's",

    "todays",

    "now",

    "news",

    "update",

    "updates",

    "what happened",

    "happening",

    "this week",

    "this month"

  ];

  return recentWords.some(word =>

    text.includes(word)

  );

}

function isInjuryQuery(query = "") {

  const text = query.toLowerCase();

  return [

    "injury",

    "injuries",

    "injured",

    "fitness",

    "fit",

    "knock",

    "hamstring",

    "muscle",

    "ankle",

    "hurt",

    "medical",

    "ruled out",

    "available"

  ].some(word =>

    text.includes(word)

  );

}

function isTransferQuery(query = "") {

  const text = query.toLowerCase();

  return [

    "transfer",

    "transfers",

    "transferred",

    "rumour",

    "rumours",

    "rumor",

    "rumors",

    "transfer news",

    "transfer rumours",

    "transfer rumors",

    "signing",

    "signings",

    "signed",

    "target",

    "targets",

    "linked",

    "interest"

  ].some(word =>

    text.includes(word)

  );

}

function extractImportantQueryWords(query = "") {

  const stopWords = new Set([

    "what",

    "whats",

    "what's",

    "is",

    "are",

    "the",

    "a",

    "an",

    "and",

    "or",

    "of",

    "for",

    "to",

    "from",

    "about",

    "with",

    "who",

    "how",

    "when",

    "where",

    "why",

    "latest",

    "current",

    "recent",

    "today",

    "todays",

    "today's",

    "now",

    "news",

    "update",

    "updates",

    "please",

    "tell",

    "me",

    "can",

    "you",

    "give",

    "show"

  ]);

  return query

    .toLowerCase()

    .replace(/[^\w\s'-]/g, " ")

    .split(/\s+/)

    .filter(word =>

      word.length >= 4 &&

      !stopWords.has(word)

    );

}

function findFootballEvents(value, found = []) {

  if (!value || typeof value !== "object") {

    return found;

  }

  if (Array.isArray(value)) {

    for (const item of value) {

      findFootballEvents(item, found);

    }

    return found;

  }

  if (

    value.id &&

    (

      Array.isArray(value.competitions) ||

      Array.isArray(value.competitors)

    )

  ) {

    found.push(value);

  }

  for (const key of Object.keys(value)) {

    findFootballEvents(value[key], found);

  }

  return found;

}

function extractFootballMatch(event) {

  try {

    const competition =

      Array.isArray(event.competitions)

        ? event.competitions[0]

        : event;

    if (!competition) {

      return null;

    }

    const competitors =

      competition.competitors ||

      event.competitors ||

      [];

    if (

      !Array.isArray(competitors) ||

      competitors.length < 2

    ) {

      return null;

    }

    const home =

      competitors.find(

        team => team.homeAway === "home"

      ) ||

      competitors[0];

    const away =

      competitors.find(

        team => team.homeAway === "away"

      ) ||

      competitors[1];

    if (!home || !away) {

      return null;

    }

    const homeName =

      home.team?.displayName ||

      home.team?.shortDisplayName ||

      home.name ||

      "Home";

    const awayName =

      away.team?.displayName ||

      away.team?.shortDisplayName ||

      away.name ||

      "Away";

    const homeScore =

      home.score !== undefined

        ? home.score

        : "0";

    const awayScore =

      away.score !== undefined

        ? away.score

        : "0";

    const status =

      competition.status ||

      event.status ||

      {};

    const statusType =

      status.type ||

      {};

    const detail =

      statusType.detail ||

      statusType.shortDetail ||

      statusType.description ||

      statusType.name ||

      "Scheduled";

    const state =

      statusType.state ||

      "";

    const completed =

      statusType.completed === true ||

      state === "post";

    const date =

      event.date ||

      competition.date ||

      competition.startDate ||

      "";

    const matchDate =

      date

        ? new Date(date)

        : null;

    const time =

      matchDate &&

      !Number.isNaN(matchDate.getTime())

        ? new Intl.DateTimeFormat("en-GB", {

            timeZone: "Africa/Lusaka",

            hour: "2-digit",

            minute: "2-digit",

            hour12: false

          }).format(matchDate)

        : "";

    const eventLink =

      Array.isArray(event.links)

        ? event.links.find(link =>

            Array.isArray(link.rel) &&

            link.rel.includes("event")

          )?.href

        : null;

    return {

      id: String(event.id),

      home: cleanText(homeName),

      away: cleanText(awayName),

      score: `${homeScore}-${awayScore}`,

      status: cleanText(detail),

      state,

      completed,

      time,

      date,

      link: eventLink || ""

    };

  } catch (error) {

    console.error(

      "Football event parsing error:",

      error.message

    );

    return null;

  }

}

async function searchESPNFootball() {

  console.log(

    "================================="

  );

  console.log(

    "Zed football search: using ESPN all/scoreboard"

  );

  const url =

    "https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard";

  try {

    const response = await fetch(url, {

      headers: {

        "User-Agent": "Zed/1.0"

      },

      signal: AbortSignal.timeout(15000)

    });

    console.log(

      `ESPN all soccer status: ${response.status}`

    );

    if (!response.ok) {

      const errorText =

        await response.text();

      console.log(

        "ESPN error:",

        cleanText(errorText).slice(0, 500)

      );

      return [];

    }

    const data =

      await response.json();

    const events =

      Array.isArray(data.events)

        ? data.events

        : findFootballEvents(data);

    console.log(

      `ESPN soccer events found: ${events.length}`

    );

    if (events.length === 0) {

      console.log(

        "ESPN returned no football events."

      );

      return [];

    }

    const matches =

      events

        .map(extractFootballMatch)

        .filter(Boolean);

    const uniqueMatches = [];

    const seen = new Set();

    for (const match of matches) {

      if (seen.has(match.id)) {

        continue;

      }

      seen.add(match.id);

      uniqueMatches.push(match);

    }

    console.log(

      `Football matches extracted: ${uniqueMatches.length}`

    );

    return uniqueMatches;

  } catch (error) {

    console.error(

      "ESPN football search error:",

      error.message

    );

    return [];

  }

}

async function searchDuckDuckGo(query) {

  try {

    const url =

      "https://html.duckduckgo.com/html/?q=" +

      encodeURIComponent(query);

    const response = await fetch(url, {

      headers: {

        "User-Agent":

          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"

      },

      signal: AbortSignal.timeout(10000)

    });

    if (!response.ok) {

      console.log(

        `DuckDuckGo status: ${response.status}`

      );

      return [];

    }

    const html =

      await response.text();

    const results = [];

    const resultPattern =

      /<div[^>]+class=["'][^"']*result[^"']*["'][^>]*>[\s\S]*?<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/div>/gi;

    let match;

    while (

      (match = resultPattern.exec(html)) !== null &&

      results.length < 10

    ) {

      let link = match[1];

      const title =

        cleanText(match[2]);

      if (!title || !link) {

        continue;

      }

      link = link.replace(

        /&amp;/g,

        "&"

      );

      results.push({

        title,

        url: link,

        snippet: "",

        publishedAt: null,

        source: "DuckDuckGo"

      });

    }

    if (results.length === 0) {

      const fallbackPattern =

        /<a[^>]+class=["'][^"']*result__a[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

      while (

        (match = fallbackPattern.exec(html)) !== null &&

        results.length < 10

      ) {

        let link = match[1];

        const title =

          cleanText(match[2]);

        if (!title || !link) {

          continue;

        }

        link = link.replace(

          /&amp;/g,

          "&"

        );

        results.push({

          title,

          url: link,

          snippet: "",

          publishedAt: null,

          source: "DuckDuckGo"

        });

      }

    }

    console.log(

      `DuckDuckGo results: ${results.length}`

    );

    return results;

  } catch (error) {

    console.log(

      "DuckDuckGo search error:",

      error.message

    );

    return [];

  }

}

async function searchGoogleNews(

  query,

  recentOnly = false

) {

  try {

    const newsQuery =

      recentOnly

        ? `${query} when:7d`

        : query;

    const url =

      "https://news.google.com/rss/search?q=" +

      encodeURIComponent(newsQuery) +

      "&hl=en-US&gl=US&ceid=US:en";

    console.log(

      `Google News query: ${newsQuery}`

    );

    const response = await fetch(url, {

      headers: {

        "User-Agent": "Zed/1.0"

      },

      signal: AbortSignal.timeout(10000)

    });

    if (!response.ok) {

      console.log(

        `Google News status: ${response.status}`

      );

      return [];

    }

    const xml =

      await response.text();

    const results = [];

    const itemPattern =

      /<item>([\s\S]*?)<\/item>/gi;

    let item;

    while (

      (item = itemPattern.exec(xml)) !== null &&

      results.length < 15

    ) {

      const block = item[1];

      const titleMatch =

        block.match(

          /<title>([\s\S]*?)<\/title>/i

        );

      const linkMatch =

        block.match(

          /<link>([\s\S]*?)<\/link>/i

        );

      const descriptionMatch =

        block.match(

          /<description>([\s\S]*?)<\/description>/i

        );

      const pubDateMatch =

        block.match(

          /<pubDate>([\s\S]*?)<\/pubDate>/i

        );

      const sourceMatch =

        block.match(

          /<source[^>]*>([\s\S]*?)<\/source>/i

        );

      const title =

        cleanText(

          titleMatch

            ? titleMatch[1]

            : ""

        );

      const link =

        cleanText(

          linkMatch

            ? linkMatch[1]

            : ""

        );

      const snippet =

        cleanText(

          descriptionMatch

            ? descriptionMatch[1]

            : ""

        );

      const source =

        cleanText(

          sourceMatch

            ? sourceMatch[1]

            : ""

        );

      const publishedAtRaw =

        pubDateMatch

          ? cleanText(pubDateMatch[1])

          : "";

      const publishedAt =

        publishedAtRaw

          ? new Date(publishedAtRaw)

          : null;

      if (title && link) {

        results.push({

          title,

          url: link,

          snippet,

          publishedAt:

            publishedAt &&

            !Number.isNaN(

              publishedAt.getTime()

            )

              ? publishedAt.toISOString()

              : null,

          source:

            source || "Google News"

        });

      }

    }

    console.log(

      `Google News results: ${results.length}`

    );

    return results;

  } catch (error) {

    console.log(

      "Google News search error:",

      error.message

    );

    return [];

  }

}

function formatPublishedDate(dateValue) {

  if (!dateValue) {

    return "";

  }

  const date =

    new Date(dateValue);

  if (

    Number.isNaN(

      date.getTime()

    )

  ) {

    return "";

  }

  return new Intl.DateTimeFormat(

    "en-GB",

    {

      timeZone: "Africa/Lusaka",

      year: "numeric",

      month: "short",

      day: "2-digit",

      hour: "2-digit",

      minute: "2-digit",

      hour12: false

    }

  ).format(date);

}

function formatFootballResults(matches) {

  if (

    !Array.isArray(matches) ||

    matches.length === 0

  ) {

    return "";

  }

  const today =

    formatDateForZambia();

  const lines = [

    "",

    "",

    "CURRENT FOOTBALL INFORMATION",

    `Date in Zambia: ${today}`,

    "Source: ESPN live soccer scoreboard",

    ""

  ];

  for (const match of matches) {

    let line =

      `${match.home} ${match.score} ${match.away}`;

    if (match.status) {

      line +=

        ` — ${match.status}`;

    }

    if (

      match.time &&

      !match.completed

    ) {

      line +=

        ` — Zambia time ${match.time}`;

    }

    lines.push(line);

    if (match.link) {

      lines.push(

        `Match information: ${match.link}`

      );

    }

  }

  lines.push(

    "",

    "IMPORTANT: Use the football information above to answer the user's question.",

    "If a match is scheduled, do not describe it as finished.",

    "If a match is marked FT or Full Time, it is completed.",

    "Do not claim that you have no internet access when current football information is provided above."

  );

  return "\n" + lines.join("\n");

}

function classifyResult(result) {

  const text =

    `${result.title || ""} ${result.snippet || ""}`.toLowerCase();

  const confirmedWords = [

    "official",

    "confirmed",

    "announced",

    "statement",

    "has signed",

    "signed for",

    "joins",

    "joined",

    "appointed",

    "sacked",

    "dismissed",

    "ruled out",

    "will miss",

    "returns",

    "returned",

    "withdrawn",

    "injured",

    "injury",

    "hamstring",

    "muscle injury",

    "ankle injury"

  ];

  const reportWords = [

    "reports",

    "reported",

    "according to",

    "understands",

    "sources say",

    "sources close",

    "set to",

    "expected to",

    "could",

    "may",

    "considering"

  ];

  const rumourWords = [

    "rumour",

    "rumor",

    "rumours",

    "rumors",

    "speculation",

    "chatter",

    "linked",

    "link",

    "target",

    "interest in",

    "could sign",

    "might sign"

  ];

  if (

    rumourWords.some(

      word => text.includes(word)

    )

  ) {

    return "RUMOUR/REPORTED";

  }

  if (

    confirmedWords.some(

      word => text.includes(word)

    )

  ) {

    return "CONFIRMED/REPORTED";

  }

  if (

    reportWords.some(

      word => text.includes(word)

    )

  ) {

    return "REPORTED";

  }

  return "INFORMATION";

}

function getTimestamp(value) {

  if (!value) {

    return 0;

  }

  const timestamp =

    new Date(value).getTime();

  return Number.isNaN(timestamp)

    ? 0

    : timestamp;

}

function isWithinDays(

  dateValue,

  days

) {

  const timestamp =

    getTimestamp(dateValue);

  if (!timestamp) {

    return false;

  }

  const now =

    Date.now();

  const age =

    now - timestamp;

  const maxAge =

    days *

    24 *

    60 *

    60 *

    1000;

  if (age < 0) {

    return true;

  }

  return age <= maxAge;

}

/*

 * Extract likely named entities from

 * the user's question.

 */

function getTopicTerms(query = "") {

  const words =

    extractImportantQueryWords(query);

  return words.filter(word =>

    ![

      "latest",

      "current",

      "recent",

      "today",

      "news",

      "update",

      "updates",

      "football",

      "soccer"

    ].includes(word)

  );

}

/*

 * Detect whether an article is mainly

 * about a different subject than the

 * user's request.

 */

function isLikelyIrrelevant(

  result,

  query

) {

  const title =

    (result.title || "").toLowerCase();

  const snippet =

    (result.snippet || "").toLowerCase();

  const text =

    `${title} ${snippet}`;

  const injuryQuery =

    isInjuryQuery(query);

  const transferQuery =

    isTransferQuery(query);

  const topicTerms =

    getTopicTerms(query);

  /*

   * For injury questions, an article

   * without any injury/fitness language

   * is usually not useful.

   */

  if (injuryQuery) {

    const injuryWords = [

      "injury",

      "injured",

      "fitness",

      "hamstring",

      "muscle",

      "ankle",

      "knock",

      "hurt",

      "ruled out",

      "withdraw",

      "withdrawn",

      "medical",

      "injury scare"

    ];

    const hasInjuryLanguage =

      injuryWords.some(word =>

        text.includes(word)

      );

    if (!hasInjuryLanguage) {

      return true;

    }

  }

  /*

   * For transfer questions, prefer articles

   * actually discussing transfers.

   */

  if (transferQuery) {

    const transferWords = [

      "transfer",

      "sign",

      "signing",

      "signed",

      "target",

      "linked",

      "interest",

      "deal",

      "contract",

      "move"

    ];

    const hasTransferLanguage =

      transferWords.some(word =>

        text.includes(word)

      );

    if (!hasTransferLanguage) {

      return true;

    }

  }

  /*

   * If the user mentioned a specific person,

   * club or competition, results that contain

   * none of those meaningful terms are weaker.

   *

   * We do not completely discard them because

   * broad questions such as "latest Arsenal

   * news" can have useful articles with the

   * name only in the body.

   */

  if (topicTerms.length > 0) {

    const hasTopic =

      topicTerms.some(term =>

        text.includes(term)

      );

    if (

      !hasTopic &&

      topicTerms.length <= 4

    ) {

      return true;

    }

  }

  return false;

}

/*

 * Score search results using:

 *

 * - exact topic relevance

 * - title relevance

 * - publication freshness

 * - useful detail

 * - source type

 * - query intent

 *

 * This is the main protection against

 * unrelated stories such as old transfer

 * rumours appearing in a current-news answer.

 */

function scoreResult(

  result,

  recentRequest,

  query

) {

  let score = 0;

  const title =

    (result.title || "").toLowerCase();

  const snippet =

    (result.snippet || "").toLowerCase();

  const text =

    `${title} ${snippet}`;

  const topicTerms =

    getTopicTerms(query);

  const injuryQuery =

    isInjuryQuery(query);

  const transferQuery =

    isTransferQuery(query);

  /*

   * Strong relevance for important query

   * terms.

   */

  for (const word of topicTerms) {

    if (title.includes(word)) {

      score += 12;

    } else if (snippet.includes(word)) {

      score += 5;

    }

  }

  /*

   * Strong boost when the article title

   * directly identifies the subject.

   */

  if (

    title.includes("arsenal") &&

    query.toLowerCase().includes("arsenal")

  ) {

    score += 12;

  }

  /*

   * Injury-specific relevance.

   */

  if (injuryQuery) {

    const injuryWords = [

      "injury",

      "injured",

      "fitness",

      "hamstring",

      "muscle",

      "ankle",

      "knock",

      "hurt",

      "ruled out",

      "withdrawn",

      "withdraw",

      "medical"

    ];

    for (const word of injuryWords) {

      if (title.includes(word)) {

        score += 10;

      } else if (snippet.includes(word)) {

        score += 4;

      }

    }

  }

  /*

   * Transfer-specific relevance.

   */

  if (transferQuery) {

    const transferWords = [

      "transfer",

      "signing",

      "signed",

      "target",

      "linked",

      "interest",

      "deal",

      "move"

    ];

    for (const word of transferWords) {

      if (title.includes(word)) {

        score += 10;

      } else if (snippet.includes(word)) {

        score += 4;

      }

    }

  }

  /*

   * Recent publication boost.

   */

  if (result.publishedAt) {

    score += recentRequest

      ? 12

      : 3;

    const timestamp =

      getTimestamp(

        result.publishedAt

      );

    if (timestamp) {

      const ageHours =

        Math.max(

          0,

          (Date.now() - timestamp) /

            (1000 * 60 * 60)

        );

      if (ageHours <= 12) {

        score += 12;

      } else if (ageHours <= 24) {

        score += 9;

      } else if (ageHours <= 72) {

        score += 6;

      } else if (ageHours <= 168) {

        score += 2;

      }

    }

  }

  /*

   * Detailed snippets are more useful

   * than empty search results.

   */

  if (snippet.length >= 80) {

    score += 4;

  }

  if (snippet.length >= 180) {

    score += 3;

  }

  /*

   * Google News sources generally contain

   * more useful publication metadata than

   * the DuckDuckGo fallback.

   */

  if (

    result.source &&

    result.source !== "DuckDuckGo"

  ) {

    score += 3;

  }

  /*

   * Reduce the priority of vague transfer

   * speculation for broad news questions.

   */

  if (

    !transferQuery &&

    (

      text.includes("rumour") ||

      text.includes("rumor") ||

      text.includes("speculation") ||

      text.includes("chatter") ||

      text.includes("linked")

    )

  ) {

    score -= 8;

  }

  /*

   * A result explicitly saying something is

   * only a rumour should never outrank a

   * directly reported factual development

   * merely because it is recent.

   */

  if (

    !transferQuery &&

    (

      text.includes("could sign") ||

      text.includes("might sign") ||

      text.includes("transfer rumour") ||

      text.includes("transfer rumor")

    )

  ) {

    score -= 6;

  }

  return score;

}

function formatWebResults(

  uniqueResults,

  recentRequest = false

) {

  if (

    !Array.isArray(uniqueResults) ||

    uniqueResults.length === 0

  ) {

    return "";

  }

  const lines = [

    "",

    "",

    "CURRENT WEB SEARCH RESULTS",

    `Search date in Zambia: ${formatDateForZambia()}`,

    "",

    recentRequest

      ? "CURRENT INFORMATION REQUEST: Use the newest relevant information first."

      : "Results are ordered by relevance and available publication date.",

    "",

    "RESULT INTERPRETATION:",

    "Each result includes its source and publication date when available.",

    "Use the title and summary to identify the specific person, event, injury, transfer, announcement or development.",

    "Use the most relevant results rather than combining every result into one broad summary.",

    "Do not replace a specific reported event with vague wording when the search result clearly identifies what happened.",

    "Do not treat a rumour, transfer link or speculation as a confirmed event.",

    ""

  ];

  for (const result of uniqueResults) {

    lines.push(

      `Title: ${result.title}`,

      `URL: ${result.url}`,

      `Source: ${result.source || "Unknown"}`,

      `Classification: ${classifyResult(result)}`

    );

    if (result.publishedAt) {

      const formattedDate =

        formatPublishedDate(

          result.publishedAt

        );

      if (formattedDate) {

        lines.push(

          `Published: ${formattedDate} Zambia time`

        );

      }

    } else {

      lines.push(

        "Published: Date not available"

      );

    }

    if (result.snippet) {

      lines.push(

        `Summary: ${result.snippet}`

      );

    }

    lines.push("");

  }

  lines.push(

    "IMPORTANT:",

    "Use the strongest relevant results first.",

    "For latest/current/recent/news questions, prioritize the newest relevant dated results.",

    "Name the specific person, club, event or development when the supplied result clearly identifies it.",

    "Include concrete details such as what happened, who was involved and when it happened when the source provides them.",

    "Do not hide a specific current development behind vague wording.",

    "Do not use an older article as proof of a current development when newer information is available.",

    "A publication date is the article publication date, not necessarily the date the event happened.",

    "Distinguish confirmed information from reports, rumours and speculation.",

    "Transfer links, interest, chatter and speculation must be described as reports or rumours, not completed transfers.",

    "An injury report should identify the player and reported injury/development when the source provides those details.",

    "Do not assume every player mentioned in an injury article is currently injured.",

    "Do not convert a precaution, rest decision or previous knock into a confirmed current injury.",

    "If sources conflict, explain the conflict and identify the relevant dates.",

    "If the available information does not establish something as confirmed, do not present it as confirmed.",

    "Do not claim that you cannot access current information when useful search results are provided."

  );

  return "\n" + lines.join("\n");

}

export async function webSearch(

  userQuery = ""

) {

  console.log(

    "================================="

  );

  console.log(

    "Zed web search:",

    userQuery

  );

  const football =

    isFootballQuestion(

      userQuery

    );

  const footballScoreRequest =

    football &&

    isFootballScoreRequest(

      userQuery

    );

  const recentRequest =

    isRecentInformationRequest(

      userQuery

    );

  /*

   * ESPN is used only for actual

   * football score / fixture / result

   * requests.

   */

  if (footballScoreRequest) {

    console.log(

      "Football score/fixture request detected."

    );

    const footballResults =

      await searchESPNFootball();

    if (

      footballResults.length > 0

    ) {

      console.log(

        `Football scoreboard successful: ${footballResults.length} matches`

      );

      return formatFootballResults(

        footballResults

      );

    }

    console.log(

      "ESPN returned no matches. Continuing with general web search."

    );

  }

  /*

   * Google News is the primary source

   * for current/news questions.

   */

  const newsResults =

    await searchGoogleNews(

      userQuery,

      recentRequest

    );

  const allResults = [];

  allResults.push(

    ...newsResults

  );

  /*

   * DuckDuckGo remains a fallback/general

   * web source.

   */

  const searchQueries =

    recentRequest

      ? [

          `${userQuery} latest`,

          `${userQuery} today`

        ]

      : [

          userQuery,

          `${userQuery} latest`,

          `${userQuery} today`

        ];

  for (const query of searchQueries) {

    const results =

      await searchDuckDuckGo(

        query

      );

    allResults.push(

      ...results

    );

  }

  /*

   * Remove duplicate URLs.

   */

  const uniqueResults = [];

  const seenUrls =

    new Set();

  for (const result of allResults) {

    if (!result?.url) {

      continue;

    }

    const normalizedUrl =

      result.url.trim();

    if (!normalizedUrl) {

      continue;

    }

    if (

      seenUrls.has(

        normalizedUrl

      )

    ) {

      continue;

    }

    seenUrls.add(

      normalizedUrl

    );

    uniqueResults.push({

      ...result,

      url: normalizedUrl

    });

  }

  /*

   * Remove results that are clearly

   * unrelated to the user's topic.

   */

  const relevantResults =

    uniqueResults.filter(

      result =>

        !isLikelyIrrelevant(

          result,

          userQuery

        )

    );

  console.log(

    `Relevant web results: ${relevantResults.length}`

  );

  /*

   * Use the filtered results when possible.

   * If filtering removed everything, fall back

   * to the original results rather than returning

   * nothing.

   */

  const candidateResults =

    relevantResults.length > 0

      ? relevantResults

      : uniqueResults;

  let finalResults;

  if (recentRequest) {

    const recentResults =

      candidateResults.filter(

        result =>

          result.publishedAt &&

          isWithinDays(

            result.publishedAt,

            7

          )

      );

    const undatedResults =

      candidateResults.filter(

        result =>

          !result.publishedAt

      );

    recentResults.sort(

      (a, b) =>

        scoreResult(

          b,

          true,

          userQuery

        ) -

        scoreResult(

          a,

          true,

          userQuery

        )

    );

    undatedResults.sort(

      (a, b) =>

        scoreResult(

          b,

          true,

          userQuery

        ) -

        scoreResult(

          a,

          true,

          userQuery

        )

    );

    /*

     * Only pass the strongest current

     * results to the AI.

     *

     * This is intentionally smaller than

     * the old 15-result list.

     */

    finalResults = [

      ...recentResults.slice(0, 7),

      ...undatedResults.slice(0, 2)

    ].slice(0, 8);

    /*

     * If there are no recent dated results,

     * use the strongest available results.

     */

    if (

      recentResults.length === 0

    ) {

      finalResults =

        [...candidateResults]

          .sort(

            (a, b) =>

              scoreResult(

                b,

                true,

                userQuery

              ) -

              scoreResult(

                a,

                true,

                userQuery

              )

          )

          .slice(0, 8);

    }

  } else {

    finalResults =

      [...candidateResults]

        .sort(

          (a, b) =>

            scoreResult(

              b,

              false,

              userQuery

            ) -

            scoreResult(

              a,

              false,

              userQuery

            )

        )

        .slice(0, 8);

  }

  console.log(

    `Final web results: ${finalResults.length}`

  );

  console.log(

    `Recent information request: ${recentRequest}`

  );

  if (

    finalResults.length === 0

  ) {

    return "";

  }

  return formatWebResults(

    finalResults,

    recentRequest

  );

}

export function shouldSearchWeb(

  userQuery = ""

) {

  const text =

    userQuery.toLowerCase();

  const webWords = [

    "today",

    "tonight",

    "now",

    "latest",

    "recent",

    "current",

    "news",

    "score",

    "scores",

    "result",

    "results",

    "football",

    "soccer",

    "match",

    "matches",

    "fixture",

    "fixtures",

    "weather",

    "price",

    "prices",

    "exchange rate",

    "youtube",

    "facebook",

    "tiktok",

    "instagram",

    "twitter",

    "x.com",

    "live",

    "who is",

    "what happened",

    "happening",

    "update",

    "updates"

  ];

  return webWords.some(

    word =>

      text.includes(word)

  );

}
