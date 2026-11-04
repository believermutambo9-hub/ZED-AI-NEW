const CURRENT_INFORMATION_TERMS = [
  "today", "tonight", "tomorrow", "yesterday", "latest", "current",
  "currently", "now", "recent", "recently", "news", "update", "updates",
  "breaking", "injury", "injuries", "injured", "fitness", "fit", "knock",
  "transfer", "transfers", "transferred", "rumour", "rumours", "rumor",
  "rumors", "contract", "contracts", "announcement", "announcements",
  "international break", "international duty", "price", "prices", "weather",
  "score", "scores", "fixture", "fixtures", "result", "results", "standings",
  "table", "schedule", "opening hours", "available", "availability",
  "this week", "this month", "2026"
];

function normalizeIntentText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isCurrentInformationQuestion(message = "") {
  const normalized = ` ${normalizeIntentText(message)} `;
  return CURRENT_INFORMATION_TERMS.some(term =>
    normalized.includes(` ${term} `)
  );
}

export function isPersonalKnowledgeQuestion(message = "") {
  const normalized = normalizeIntentText(message);
  const patterns = [
    /\bdo you know me\b/,
    /\bdo you know anything about me\b/,
    /\bdo you remember me\b/,
    /\bwhat do you know about me\b/,
    /\bwhat do you remember about me\b/,
    /\bwho am i\b/,
    /\bwhat is my name\b/,
    /\bwhat s my name\b/,
    /\btell me about myself\b/,
    /\bwhat have i told you about me\b/
  ];
  return patterns.some(pattern => pattern.test(normalized));
}
