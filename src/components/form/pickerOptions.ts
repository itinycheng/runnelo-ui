import type { Worker, Datasource, CatalogInfo, Resource } from "@/types/entities";

export interface NumOption {
  value: number;
  label: string;
}

export function workerOptions(workers: Worker[]): NumOption[] {
  return workers?.map((w) => ({ value: w.id!, label: `${w.name} (${w.ip}) · ${w.role}` }));
}
export function datasourceOptions(items: Datasource[]): NumOption[] {
  return items.map((d) => ({ value: d.id!, label: `${d.name} · ${d.type}` }));
}
export function catalogOptions(items: CatalogInfo[]): NumOption[] {
  return items.map((c) => ({ value: c.id!, label: `${c.name} · ${c.type}` }));
}
export function resourceOptions(items: Resource[]): NumOption[] {
  return items.map((r) => ({ value: r.id!, label: r.name }));
}
