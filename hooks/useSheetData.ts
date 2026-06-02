import { useEffect, useState, useCallback } from 'react';
import { SHEET_ID } from '../constants';

// ─── Types ───────────────────────────────────────────────────────
export interface Project {
  project_id: string;
  project_name: string;
  location: string;
  client: string;
  status: string;
  start_date: string;
  end_date: string;
  total_budget_usd: number;
  spent_to_date_usd: number;
  progress_pct: number;
  workers_count: number;
  equipment_count: number;
  cpi: number;
  spi: number;
  notes: string;
}

export interface Worker {
  worker_id: string;
  project_id: string;
  full_name: string;
  role: string;
  department: string;
  company: string;
  daily_rate_usd: number;
  start_date: string;
  status: string;
}

export interface Equipment {
  equipment_id: string;
  project_id: string;
  name: string;
  type: string;
  serial_id: string;
  owner: string;
  daily_cost_usd: number;
  assigned_date: string;
  status: string;
  last_service: string;
}

export interface BudgetRow {
  record_id: string;
  project_id: string;
  month: string;
  category: string;
  planned_usd: number;
  actual_usd: number;
  variance_usd: number;
}

export interface Milestone {
  milestone_id: string;
  project_id: string;
  phase: string;
  milestone_name: string;
  planned_start: string;
  planned_end: string;
  actual_end: string;
  progress_pct: number;
  status: string;
  responsible: string;
}

export interface EvmRow {
  record_id: string;
  project_id: string;
  month: string;
  bac_usd: number;
  pv_usd: number;
  ev_usd: number;
  ac_usd: number;
  cpi: number;
  spi: number;
  cv_usd: number;
  sv_usd: number;
  eac_usd: number;
}

export interface Issue {
  issue_id: string;
  project_id: string;
  date_raised: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string;
  due_date: string;
  resolved_date: string;
  notes: string;
}

export interface DailyReport {
  report_id: string;
  project_id: string;
  date: string;
  workers_present: number;
  equipment_active: number;
  work_summary: string;
  weather: string;
  incidents: number;
  submitted_by: string;
  notes: string;
}

export interface SheetData {
  projects: Project[];
  workers: Worker[];
  equipment: Equipment[];
  budget: BudgetRow[];
  schedule: Milestone[];
  evm: EvmRow[];
  issues: Issue[];
  dailyReports: DailyReport[];
}

// ─── Fetch helpers ───────────────────────────────────────────────
function sheetUrl(sheetName: string): string {
  const encoded = encodeURIComponent(sheetName);
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encoded}`;
}

async function fetchSheet<T>(sheetName: string): Promise<T[]> {
  const url = sheetUrl(sheetName);
  const res = await fetch(url);
  const text = await res.text();
  // Google wraps response in /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const json = JSON.parse(text.substring(47, text.length - 2));
  const cols: string[] = json.table.cols.map((c: any) => c.label as string);
  const rows: T[] = json.table.rows
    .filter((r: any) => r && r.c && r.c[0] && r.c[0].v)
    .map((row: any) => {
      const obj: Record<string, any> = {};
      cols.forEach((col, i) => {
        const cell = row.c[i];
        obj[col] = cell ? (cell.v ?? '') : '';
      });
      return obj as T;
    });
  return rows;
}

// ─── Main hook ───────────────────────────────────────────────────
export function useSheetData() {
  const [data, setData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [projects, workers, equipment, budget, schedule, evm, issues, dailyReports] =
        await Promise.all([
          fetchSheet<Project>('Projects'),
          fetchSheet<Worker>('Workers'),
          fetchSheet<Equipment>('Equipment'),
          fetchSheet<BudgetRow>('Budget'),
          fetchSheet<Milestone>('Schedule'),
          fetchSheet<EvmRow>('EVM'),
          fetchSheet<Issue>('Issues'),
          fetchSheet<DailyReport>('Daily Reports'),
        ]);
      setData({ projects, workers, equipment, budget, schedule, evm, issues, dailyReports });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, refresh: load };
}
