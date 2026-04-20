import { CalculatedBlock, Service } from "../types";
import { addSeconds } from "date-fns";

/**
 * La joya de la corona: la lógica de recalculo.
 * Toma el estado actual del servicio y calcula las horas proyectadas
 * basándose en los tiempos reales ya registrados.
 */
export function recalculateSchedules(service: Service): CalculatedBlock[] {
  let currentTime = service.actualStartTime || service.plannedStartTime;
  // Calculamos el retraso inicial (positivo = tarde, negativo = temprano)
  let cumulativeDelayMs = service.actualStartTime ? service.actualStartTime - service.plannedStartTime : 0;

  return service.blocks.sort((a, b) => a.order - b.order).map((block) => {
    if (block.status === "SKIPPED") {
      return {
        ...block,
        expectedStartTime: currentTime,
        expectedEndTime: currentTime,
        delaySeconds: Math.floor(cumulativeDelayMs / 1000),
      };
    }

    // Si el bloque ya está LIVE o DONE, usamos su inicio real. Si no, usamos el currentTime proyectado.
    const startTime = (block.status === "LIVE" || block.status === "DONE") 
      ? (block.actualStartTime || currentTime) 
      : currentTime;
    
    // Si el bloque empezó en una hora distinta a la proyectada, el delay acumulado cambia
    if (block.actualStartTime && (block.status === "LIVE" || block.status === "DONE")) {
       // Solo ajustamos el delay acumulado si el servicio ya ha empezado oficialmente
       const drift = block.actualStartTime - currentTime;
       cumulativeDelayMs += drift;
    }

    const durationToUse = block.actualDuration || block.plannedDuration;
    
    // Si el bloque terminó y duró distinto a lo planeado, se suma al delay
    if (block.status === "DONE" && block.actualDuration) {
      const diff = (block.actualDuration - block.plannedDuration) * 1000;
      cumulativeDelayMs += diff;
    }

    const endTime = (block.status === "DONE") 
      ? (block.actualStartTime ? addSeconds(new Date(block.actualStartTime), durationToUse).getTime() : startTime + (durationToUse * 1000))
      : addSeconds(new Date(startTime), durationToUse).getTime();

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
