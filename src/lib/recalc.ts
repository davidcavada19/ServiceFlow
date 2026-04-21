import { CalculatedBlock, Service } from "../types";

/**
 * La joya de la corona: la lógica de recalculo.
 * Toma el estado actual del servicio y calcula las horas proyectadas
 * basándose en los tiempos reales ya registrados.
 */
export function recalculateSchedules(service: Service): CalculatedBlock[] {
  const blocks = service.blocks.sort((a, b) => a.order - b.order);
  
  // Si el servicio no ha iniciado, proyectar desde plannedStartTime
  if (!service.actualStartTime) {
    let currentTime = service.plannedStartTime;
    return blocks.map((block) => {
      const startTime = currentTime;
      const endTime = startTime + block.plannedDuration * 1000;
      currentTime = endTime;
      return { ...block, expectedStartTime: startTime, expectedEndTime: endTime, delaySeconds: 0 };
    });
  }

  // Delay base = el servicio empezó tarde o temprano
  // positivo = tarde, negativo = temprano
  let cumulativeDelayMs = service.actualStartTime - service.plannedStartTime;
  let currentTime = service.actualStartTime;

  return blocks.map((block) => {
    const startTime = (block.status === "LIVE" || block.status === "DONE")
      ? (block.actualStartTime || currentTime)
      : currentTime;

    const durationToUse = (block.status === "DONE" && block.actualDuration)
      ? block.actualDuration
      : block.plannedDuration;

    const endTime = startTime + durationToUse * 1000;

    // Si un bloque DONE duró más de lo planeado, acumular el exceso
    if (block.status === "DONE" && block.actualDuration) {
      cumulativeDelayMs += (block.actualDuration - block.plannedDuration) * 1000;
    }

    const result = {
      ...block,
      expectedStartTime: startTime,
      expectedEndTime: endTime,
      delaySeconds: Math.floor(cumulativeDelayMs / 1000),
    };

    currentTime = endTime;
    return result;
  });
}
