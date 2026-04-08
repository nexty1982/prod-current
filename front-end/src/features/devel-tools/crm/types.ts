/**
 * CRM shared types, constants, and utility functions.
 * Extracted from CRMPage.tsx
 */

import React from 'react';
import {
  Call as CallIcon,
  Email as EmailIcon,
  Event as EventIcon,
  MeetingRoom as MeetingIcon,
  Note as NoteIcon,
  Rocket as ProvisionIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';

// ─── Types ──────────────────────────────────────────────────────────

export interface PipelineStage {
  id: number;
  stage_key: string;
  label: string;
  color: string;
  sort_order: number;
  is_terminal: number;
}

export interface CRMChurch {
  id: number;
  ext_id: string;
  name: string;
  street: string | null;
  city: string | null;
  state_code: string;
  zip: string | null;
  phone: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  jurisdiction: string;
  pipeline_stage: string;
  stage_label: string;
  stage_color: string;
  assigned_to: number | null;
  is_client: number;
  provisioned_church_id: number | null;
  last_contacted_at: string | null;
  next_follow_up: string | null;
  priority: string;
  tags: any;
  crm_notes: string | null;
  contact_count: number;
  activity_count: number;
  pending_followups: number;
  created_at: string;
}

export interface CRMContact {
  id: number;
  church_id: number;
  first_name: string;
  last_name: string | null;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: number;
  notes: string | null;
}

export interface CRMActivity {
  id: number;
  church_id: number;
  contact_id: number | null;
  activity_type: string;
  subject: string;
  body: string | null;
  metadata: any;
  created_by: number | null;
  created_at: string;
  church_name?: string;
  state_code?: string;
}

export interface CRMFollowUp {
  id: number;
  church_id: number;
  assigned_to: number | null;
  due_date: string;
  subject: string;
  description: string | null;
  status: string;
  completed_at: string | null;
  church_name?: string;
  state_code?: string;
  city?: string;
  pipeline_stage?: string;
  is_overdue?: boolean;
}

export interface DashboardData {
  pipeline: { pipeline_stage: string; label: string; color: string; sort_order: number; count: number }[];
  overdue: number;
  todayFollowups: number;
  upcomingFollowups: CRMFollowUp[];
  recentActivity: CRMActivity[];
  totalChurches: number;
  totalClients: number;
  activeStates: { state_code: string; count: number }[];
}

// ─── Constants ──────────────────────────────────────────────────────

export const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  note: React.createElement(NoteIcon, { fontSize: 'small' }),
  call: React.createElement(CallIcon, { fontSize: 'small' }),
  email: React.createElement(EmailIcon, { fontSize: 'small' }),
  meeting: React.createElement(MeetingIcon, { fontSize: 'small' }),
  task: React.createElement(EventIcon, { fontSize: 'small' }),
  stage_change: React.createElement(TimelineIcon, { fontSize: 'small' }),
  provision: React.createElement(ProvisionIcon, { fontSize: 'small' }),
};

export const ACTIVITY_COLORS: Record<string, string> = {
  note: '#9e9e9e',
  call: '#4caf50',
  email: '#2196f3',
  meeting: '#ff9800',
  task: '#9c27b0',
  stage_change: '#e91e63',
  provision: '#00bcd4',
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: '#9e9e9e',
  medium: '#2196f3',
  high: '#ff9800',
  urgent: '#f44336',
};

// ─── Utility Functions ──────────────────────────────────────────────

export function formatDate(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(d: string | null) {
  if (!d) return '—';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function relativeTime(d: string) {
  const now = Date.now();
  const then = new Date(d).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}
