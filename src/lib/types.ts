export type MomentType = "market" | "rule" | "life" | "decision";

export type DraftStatus = "pending" | "approved" | "edited" | "dismissed";

export interface NewsSignal {
  id: string;
  date: string;
  moment: MomentType;
  headline: string;
  what_happened: string;
  source: "rss" | "replay" | "rule";
  entities: string[];
  sectors: string[];
  assetClasses: string[];
  severity: "low" | "medium" | "high";
  sources?: string[];
  /** For replay: original event title for drawdown lookup */
  eventTitle?: string;
}

export interface SectorWeight {
  sector: string;
  weight: number;
  severity: string;
  driver: string;
}

export interface Holding {
  ticker: string;
  name: string;
  type: string;
  category: string;
  value: number;
  account: string;
}

export interface GoalHook {
  name: string;
  goalType: string;
  date: string;
  monthsAway: number;
}

export interface EventDrawdown {
  eventTitle: string;
  eventDate: string;
  drawdownPct: number;
  recoveryDays?: number;
}

export interface PersonaHooks {
  decisionStyle: string;
  riskOrientation: string;
  concerns: string[];
  tensions: string[];
  motivationalAnchor: string;
}

export interface ClientProfile {
  slug: string;
  displayName: string;
  city: string;
  state: string;
  taxFilingStatus: string;
  score: number;
  members: { firstName: string; age: number; role: string; riskProfile: string }[];
  salaryTotal: number;
  childCount: number;
  investableApprox: number;
  holdings: Holding[];
  tickers: string[];
  bondExposure: boolean;
  equityValue: number;
  sectors: SectorWeight[];
  techWeight: number;
  goals: GoalHook[];
  drawdowns: EventDrawdown[];
  persona: PersonaHooks;
  aboveSsWageBase2027: boolean;
}

export interface FamilyImpact {
  slug: string;
  displayName: string;
  score: number;
  reasons: string[];
  touches_this_family: string[];
  where_in_the_data: string[];
}

export interface MessageDraft {
  id: string;
  signalId: string;
  slug: string;
  displayName: string;
  subject: string;
  body: string;
  status: DraftStatus;
  impactScore: number;
  touches: string[];
  reasons: string[];
}

export interface IngestResult {
  signals: NewsSignal[];
  matched: FamilyImpact[];
  drafts: MessageDraft[];
  meta: {
    mode: "replay" | "rss" | "both";
    signalCount: number;
    draftCount: number;
    generatedAt: string;
  };
}

export interface AdvisorStore {
  signals: NewsSignal[];
  drafts: MessageDraft[];
  impactsBySignal: Record<string, FamilyImpact[]>;
  meta: IngestResult["meta"] | null;
}

export type LifeEventType =
  | "child_born"
  | "job_change"
  | "promotion"
  | "layoff_risk"
  | "home_intent"
  | "marriage"
  | "divorce"
  | "inheritance"
  | "health"
  | "college_plan"
  | "other";

export interface LinkedInSim {
  simulated: true;
  headline: string;
  company: string;
  title: string;
  location: string;
  about: string;
  recentActivity: { date: string; text: string; signal?: string }[];
  skills: string[];
  connectionsNote: string;
}

export interface ProfileUpdate {
  id: string;
  slug: string;
  createdAt: string;
  source: "meeting" | "linkedin" | "manual";
  eventType: LifeEventType;
  summary: string;
  fieldsChanged: string[];
  meetingId?: string;
  approved: boolean;
}

export interface MeetingRecord {
  id: string;
  slug: string;
  createdAt: string;
  title: string;
  audioFileName?: string;
  transcript: string;
  transcriptSource: "upload_text" | "demo" | "whisper" | "llm";
  extractedEvents: Omit<ProfileUpdate, "id" | "slug" | "createdAt" | "approved" | "meetingId">[];
  appliedUpdateIds: string[];
}

export interface ClientCrmState {
  notes: string;
  personalFacts: string[];
  updates: ProfileUpdate[];
  meetings: MeetingRecord[];
  /** Overrides / additions from meetings */
  extraMembers: { firstName: string; age?: number; role: string; note: string }[];
  tags: string[];
}

export interface CrmStore {
  bySlug: Record<string, ClientCrmState>;
}
