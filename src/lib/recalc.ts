import { CalculatedBlock, Service } from "../types";

/**
 * La joya de la corona: la lógica de recalculo.
 * Toma el estado actual del servicio y calcula las horas proyectadas
 * basándose en los tiempos reales ya registrados.
 */
export function recalculateSchedules(service: Service): CalculatedBlock[] {
  const blocks = [ ...service.blocks ].sort((a, b) => a.order - b.order);

  if (!service.actualStartTime) {
    let t = service.plannedStartTime;
    return blocks.map((block) => {
      const start = t;
      const end = start + block.plannedDuration * 1000;
      t = end;
      return { ...block, expectedStartTime: start, expectedEndTime: end, delaySeconds: 0 };
    });
  }

  // Delay acumulado en segundos (positivo = tarde, negativo = adelantado)
  let delaySeconds = Math.round((service.actualStartTime - service.plannedStartTime) / 1000);
  
  // Tiempo proyectado del siguiente bloque segun el plan original
  let plannedCursor = service.plannedStartTime;
  let actualCursor = service.actualStartTime;

  return blocks.map((block) => {
    const startTime = (block.status === "LIVE" || block.status === "DONE")
      ? (block.actualStartTime ?? actualCursor)
      : actualCursor;

    const durationUsed = (block.status === "DONE" && block.actualDuration != null)
      ? block.actualDuration
      : block.plannedDuration;

    const endTime = startTime + durationUsed * 1000;

    // Si el bloque duró más o menos de lo planeado, ajustar delay
    if (block.status === "DONE" && block.actualDuration != null) {
      delaySeconds += block.actualDuration - block.plannedDuration;
    }

    plannedCursor += block.plannedDuration * 1000;
    actualCursor = endTime;

    return {
      ...block,
      expectedStartTime: startTime,
      expectedEndTime: endTime,
      delaySeconds,
    };
  });
}

