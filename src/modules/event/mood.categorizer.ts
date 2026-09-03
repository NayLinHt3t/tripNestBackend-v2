export enum Mood {
  FESTIVE = "FESTIVE",
  CHILL = "CHILL",
  ENERGETIC = "ENERGETIC",
  ROMANTIC = "ROMANTIC",
  ADVENTUROUS = "ADVENTUROUS",
  CULTURAL = "CULTURAL",
  PARTY = "PARTY",
  RELAXED = "RELAXED",
  EDUCATIONAL = "EDUCATIONAL",
  SPIRITUAL = "SPIRITUAL",
}

export const MOOD_VALUES = Object.values(Mood);

const MOOD_KEYWORDS: Record<Mood, string[]> = {
  [Mood.FESTIVE]: [
    "festival", "celebration", "gala", "carnival", "ceremony", "parade",
    "holiday", "christmas", "halloween", "diwali", "eid", "new year",
    "lantern", "bonfire", "fiesta",
  ],
  [Mood.CHILL]: [
    "chill", "mellow", "laid back", "laid-back", "casual", "easygoing",
    "easy going", "slow", "quiet", "cozy", "intimate", "lounge", "acoustic",
  ],
  [Mood.ENERGETIC]: [
    "energetic", "high energy", "intense", "dynamic", "active", "fitness",
    "sport", "run", "marathon", "race", "athletic", "exercise", "crossfit",
    "bootcamp", "spinning",
  ],
  [Mood.ROMANTIC]: [
    "romantic", "romance", "love", "couple", "date night", "wedding",
    "anniversary", "valentine", "honeymoon", "candlelight", "serenade",
    "proposal", "bridal",
  ],
  [Mood.ADVENTUROUS]: [
    "adventure", "adventurous", "outdoor", "hiking", "camping", "extreme",
    "thrill", "wild", "explore", "expedition", "trek", "survival", "kayak",
    "zipline", "skydiving", "rock climbing",
  ],
  [Mood.CULTURAL]: [
    "cultural", "culture", "art", "museum", "heritage", "traditional", "folk",
    "exhibition", "gallery", "history", "theatre", "theater", "opera",
    "ballet", "orchestra", "symphony",
  ],
  [Mood.PARTY]: [
    "party", "nightclub", "club", "dj", "dance", "rave", "nightlife",
    "bar", "drinks", "cocktail", "disco", "bash", "mixer", "afterparty",
    "after party",
  ],
  [Mood.RELAXED]: [
    "relax", "relaxed", "spa", "yoga", "meditation", "wellness", "peaceful",
    "zen", "calm", "serene", "retreat", "mindful", "breathwork", "pilates",
    "sound bath",
  ],
  [Mood.EDUCATIONAL]: [
    "workshop", "seminar", "conference", "lecture", "class", "course",
    "training", "education", "summit", "hackathon", "talk", "webinar",
    "symposium", "bootcamp", "masterclass", "panel",
  ],
  [Mood.SPIRITUAL]: [
    "spiritual", "church", "temple", "prayer", "religious", "faith",
    "holy", "divine", "mindfulness", "devotion", "sacred", "pilgrimage",
    "revival", "gospel",
  ],
};

/**
 * Scans the event title and description for mood keywords and returns the
 * best-matching Mood value. Returns null when no keyword matches.
 */
export function categorizeMood(title: string, description: string): Mood | null {
  const text = `${title} ${description}`.toLowerCase();

  let best: Mood | null = null;
  let bestScore = 0;

  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    const score = keywords.filter((kw) => text.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      best = mood as Mood;
    }
  }

  return bestScore > 0 ? best : null;
}

export function isValidMood(value: string): value is Mood {
  return MOOD_VALUES.includes(value as Mood);
}
