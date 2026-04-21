import { CalculatedBlock, Service } from "../types";

/**
 * La joya de la corona: la lógica de recalculo.
 * Toma el estado actual del servicio y calcula las horas proyectadas
 * basándose en los tiempos reales ya registrados.
 */
export function recalculateSchedules(service: Service): CalculatedBlock[] {
  if (!service.actualStartTime) {
    // Servicio no iniciado - solo proyectar desde plannedStartTime
    let currentTime = service.plannedStartTime;
    return service.blocks.sort((a, b) => a.order - b.order).map((block) => {
      const startTime = currentTime;
      const endTime = startTime + (block.plannedDuration * 1000);
      currentTime = endTime;
      return {
        ...block,
        expectedStartTime: startTime,
        expectedEndTime: endTime,
        delaySeconds: 0,
      };
    });
  }

  // Servicio iniciado - calcular delay real
  // Delay inicial = diferencia entre inicio real y planeado
  const initialDelayMs = service.actualStartTime - service.plannedStartTime;
  
  let cumulativeDelayMs = initialDelayMs;
  let currentTime = service.actualStartTime;

  return service.blocks.sort((a, b) => a.order - b.order).map((block) => {
    if (block.status === "SKIPPED") {
      return {
        ...block,
        expectedStartTime: currentTime,
        expectedEndTime: currentTime,
        delaySeconds: Math.floor(cumulativeDelayMs / 1000),
      };
    }

    // Para bloques LIVE o DONE usamos el tiempo real de inicio
    const startTime = (block.status === "LIVE" || block.status === "DONE")
      ? (block.actualStartTime || currentTime)
      : currentTime;

    // Si el bloque real empezó diferente al proyectado, acumular esa diferencia
    if ((block.status === "LIVE" || block.status === "DONE") && block.actualStartTime) {
      cumulativeDelayMs = block.actualStartTime - service.plannedStartTime;
      // Restar la duración acumulada de bloques anteriores planeados
      const previousPlannedMs = service.blocks
        .filter(b => b.order < block.order)
        .reduce((acc, b) => acc + b.plannedDuration * 1000, 0);
      cumulativeDelayMs -= previousPlannedMs;
    }

    const durationToUse = block.actualDuration || block.plannedDuration;
    const endTime = startTime + (durationToUse * 1000);

    // Si el bloque terminó más largo que lo planeado, añadir al delay
    if (block.status === "DONE" && block.actualDuration) {
      const overrun = (block.actualDuration - block.plannedDuration) * 1000;
      cumulativeDelayMs += overrun;
    }

    const calculatedBlock: CalculatedBlock = {
      ...block,
      expectedStartTime: startTime,
      expectedEndTime: endTime,
      delaySeconds: Math.floor(cumulativeDelayMs / 1000),
    };

    currentTime = endTime;
    return calculatedBlock;
  });
}
