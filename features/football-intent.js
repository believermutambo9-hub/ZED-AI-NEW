export function shouldUseFootballPrediction(message = "") {
  const text = String(message).toLowerCase().replace(/\s+/g, " ").trim();
  const hasMatchup = /\b(?:vs?\.?|versus|against)\b/i.test(text) ||
    /\bbetween\b.+\band\b/i.test(text);
  const asksForPrediction = /\b(?:predict|prediction|predictive|forecast|who will win|who wins|which team will win|which side will win|who is likely to win|likely winner|win probability|winning chance|match odds|correct score|score prediction)\b/i.test(text);
  return hasMatchup && asksForPrediction;
}
