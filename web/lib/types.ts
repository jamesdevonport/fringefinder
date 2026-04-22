export type AgeBucket = "Family" | "Kids" | "Teen" | "16+" | "18+";
export type TimeOfDay = "Matinee" | "Evening" | "Late night";
export type PriceBucket = "Free" | "Under £10" | "£10–20" | "£20+";
export type DurationBucket = "≤45 min" | "45–75 min" | "75+ min";

export type Performance = {
  date_iso: string;
  time_text: string | null;
  venue_name: string | null;
  venue_slug: string | null;
  price_min: number | null;
  price_max: number | null;
  free: boolean;
  time_of_day: TimeOfDay | null;
};

export type Event = {
  slug: string;
  title: string;
  description: string;
  description_html: string;
  short_description: string;
  genre: string | null;
  company: string | null;
  website: string | null;
  duration_raw: string | null;
  duration_mins: number | null;
  duration_bucket: DurationBucket | null;
  min_age: number | null;
  age_bucket: AgeBucket;
  age_type: "Guideline" | "Restriction" | null;
  hero_image: string | null;
  gallery: string[];
  content_warnings: string[];
  accessibility: string[];
  socials: Record<string, string>;
  url: string | null;
  performances: Performance[];
  venue_list: string[];
  venue_slug_list: string[];
  date_list: string[];
  earliest_date: string | null;
  latest_date: string | null;
  price_min: number | null;
  price_max: number | null;
  has_free_performance: boolean;
  time_of_day_set: TimeOfDay[];
  weekend_dates: string[];
  similar: string[];
};

export type EventSearch = Pick<
  Event,
  | "slug"
  | "title"
  | "company"
  | "genre"
  | "short_description"
  | "hero_image"
  | "venue_list"
  | "venue_slug_list"
  | "date_list"
  | "earliest_date"
  | "price_min"
  | "price_max"
  | "has_free_performance"
  | "min_age"
  | "age_bucket"
  | "duration_mins"
  | "duration_bucket"
  | "content_warnings"
  | "accessibility"
  | "time_of_day_set"
  | "weekend_dates"
>;
