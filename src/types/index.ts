export type ServiceStatus = "scheduled" | "live" | "completed";
export type BlockStatus = "WAITING" | "LIVE" | "DONE" | "SKIPPED" | "OVERTIME";

export interface ServiceBlock {
  id: string;
  title: string;
  responsible: string;
  plannedDuration: number; // segundos
  order: number;
  status: BlockStatus;
  actualStartTime?: number | null; // timestamp ms
  actualDuration?: number | null; // segundos
}

export interface Service {
  id: string;
  name: string;
  status: ServiceStatus;
  plannedStartTime: number; // timestamp ms
  actualStartTime?: number | null; // timestamp ms
  blocks: ServiceBlock[];
}

export interface CalculatedBlock extends ServiceBlock {
  expectedStartTime: number; // timestamp calculado
  expectedEndTime: number; // timestamp calculado
  delaySeconds: number; // segundos de retraso acumulado hasta este bloque
}
