import { useEffect, useState, useMemo } from "react";
import { io, Socket } from "socket.io-client";
import { Service, CalculatedBlock } from "../types";
import { recalculateSchedules } from "../lib/recalc";

let socket: Socket;

export function useService() {
  const [service, setService] = useState<Service | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Conectar al servidor local (el que levantamos con Express)
    socket = io();

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("service_update", (updatedService: Service) => {
      setService(updatedService);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const calculatedBlocks = useMemo(() => {
    if (!service) return [];
    return recalculateSchedules(service);
  }, [service]);

  const startService = () => socket.emit("start_service");
  
  const startBlock = (blockId: string) => {
    socket.emit("update_block", {
      id: blockId,
      status: "LIVE",
      actualStartTime: Date.now(),
    });
  };

  const completeBlock = (blockId: string, duration: number) => {
    socket.emit("update_block", {
      id: blockId,
      status: "DONE",
      actualDuration: duration,
    });
  };

  const updateBlock = (blockId: string, data: Partial<Service>) => {
    socket.emit("update_block", { id: blockId, ...data });
  };

  const updatePlannedStart = (time: number) => {
    socket.emit("update_planned_start", time);
  };

  const addBlock = () => socket.emit("add_block");
  const deleteBlock = (id: string) => socket.emit("delete_block", id);

  const advanceBlock = () => socket.emit("advance_block");
  const adjustBlockDuration = (seconds: number) => socket.emit("adjust_block_duration", seconds);

  const resetService = () => socket.emit("reset_service");

  return {
    service,
    calculatedBlocks,
    isConnected,
    startService,
    startBlock,
    completeBlock,
    updateBlock,
    updatePlannedStart,
    addBlock,
    deleteBlock,
    resetService,
    advanceBlock,
    adjustBlockDuration
  };
}
