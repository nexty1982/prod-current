/**
 * Contract for the OMStudio Component Maturity Roadmap.
 * OM is a read-only consumer. The shape mirrors what the OM proxy returns
 * (which in turn passes through OMStudio's response unchanged).
 */

export type RoadmapStatus =
  | 'green'
  | 'yellow'
  | 'red'
  | 'blocked'
  | 'done'
  | 'planning'
  | 'in_progress'
  | string;

export type RoadmapPriority = 'high' | 'medium' | 'low' | string;

export interface RoadmapEvidenceLink {
  label: string;
  url: string;
}

export interface RoadmapPhase {
  name: string;
  start_date: string; // ISO date or date-time
  end_date: string;
  status?: RoadmapStatus;
  progress_pct?: number;
}

export interface RoadmapComponent {
  id: string;
  name: string;
  category?: string;
  owner?: string;
  current_milestone?: string | null;
  next_milestone?: string | null;
  progress_pct?: number;
  status?: RoadmapStatus;
  priority?: RoadmapPriority;
  risks?: string[];
  blockers?: string[];
  evidence?: RoadmapEvidenceLink[];
  next_action?: string;
  phases?: RoadmapPhase[];
  updated_at?: string;
}

export interface RoadmapPayload {
  components: RoadmapComponent[];
  generated_at?: string;
  source_url?: string;
  notes?: string;
}

export type EcosystemRoadmapResponse =
  | {
      available: true;
      upstream: string;
      fetched_at: string;
      data: RoadmapPayload;
    }
  | {
      available: false;
      upstream: string;
      error: string;
      detail?: string;
    };
