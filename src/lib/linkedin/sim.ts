import type { ClientProfile, LinkedInSim } from "../types";

/** Simulated LinkedIn enrichment — not scraped. Challenge requires simulation. */
const BY_SLUG: Record<string, LinkedInSim> = {
  "michael-carter": {
    simulated: true,
    headline: "Product Manager · Austin, TX",
    company: "Horizon Cloud Systems (simulated)",
    title: "Senior Product Manager",
    location: "Austin, Texas, United States",
    about:
      "Builds B2B SaaS for mid-market ops teams. Open about career growth; RSUs mentioned in plan sit with this employer.",
    recentActivity: [
      {
        date: "2026-10-12",
        text: "Shared a post on AI product roadmaps and Q4 planning.",
        signal: "Employer concentration — same company pays salary + RSUs",
      },
      {
        date: "2026-08-03",
        text: "Congratulated a teammate on a Series B — company still hiring.",
      },
    ],
    skills: ["Product strategy", "B2B SaaS", "Roadmapping"],
    connectionsNote: "Simulated public profile for demo. No real LinkedIn was scraped.",
  },
  "daniel-emily-johnson": {
    simulated: true,
    headline: "Dual-career household · Denver, CO",
    company: "FrontRange Health (Daniel) · Denver Public Schools adjacent nonprofit (Emily) — simulated",
    title: "Daniel: Engineering Manager · Emily: Program Director",
    location: "Denver, Colorado, United States",
    about:
      "Two incomes, two kids, mortgage-heavy plan. LinkedIn activity is light; life events show up more in advisor meetings than on social.",
    recentActivity: [
      {
        date: "2026-09-20",
        text: "Daniel listed as speaker at a local tech meetup on team leadership.",
      },
      {
        date: "2026-06-01",
        text: "Emily posted about summer enrichment programs (college path awareness).",
        signal: "College goals already in plan — 2033 / 2035",
      },
    ],
    skills: ["People management", "Nonprofit programs", "Parenting logistics"],
    connectionsNote: "Simulated dual-profile sketch for the household. Not scraped.",
  },
  "samantha-lewis": {
    simulated: true,
    headline: "Finance leader · Miami, FL",
    company: "Atlantic Retail Group (simulated)",
    title: "VP Finance",
    location: "Miami, Florida, United States",
    about:
      "High earner above the Social Security wage base. Teens at home; second-home goal in 2030. Professional network is dense in South Florida finance.",
    recentActivity: [
      {
        date: "2026-11-01",
        text: "Commented on a CFO roundtable about 2027 tax planning.",
        signal: "Rule changes (wage base / CTC) are personally relevant",
      },
      {
        date: "2026-07-15",
        text: "Reposted an article on private-school vs college funding trade-offs.",
      },
    ],
    skills: ["FP&A", "Treasury", "Tax-aware planning conversations"],
    connectionsNote: "Simulated executive profile for demo only.",
  },
  "timothy-melanie-weah": {
    simulated: true,
    headline: "Tech + design household · San Francisco Bay Area",
    company: "Bayscale Labs (Timothy) · Independent design (Melanie) — simulated",
    title: "Timothy: Staff Engineer · Melanie: Design consultant",
    location: "San Francisco, California, United States",
    about:
      "Young kids, high cost of living, cash + expensive card tension. Employer news in SF tech would hit this household hard.",
    recentActivity: [
      {
        date: "2026-10-28",
        text: "Timothy starred a thread about layoff waves in Bay Area startups.",
        signal: "Simulate employer watch — life + market nurture",
      },
      {
        date: "2026-05-10",
        text: "Melanie shared a school-district enrollment checklist for Liam.",
      },
    ],
    skills: ["Distributed systems", "Product design", "Early-childhood planning"],
    connectionsNote: "Simulated SF profiles. Challenge forbids scraping real people.",
  },
};

export function getLinkedInSim(slug: string, profile?: ClientProfile): LinkedInSim {
  const base = BY_SLUG[slug];
  if (base) return base;
  return {
    simulated: true,
    headline: profile ? `${profile.displayName} · ${profile.city}, ${profile.state}` : slug,
    company: "Simulated employer",
    title: "Professional",
    location: profile ? `${profile.city}, ${profile.state}` : "United States",
    about: "Placeholder simulated LinkedIn card.",
    recentActivity: [],
    skills: [],
    connectionsNote: "Simulated. Not scraped.",
  };
}
