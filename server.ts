import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // --- Estado de la Aplicación (In-Memory para MVP) ---
  let serviceState = {
    id: "1",
    name: "Servicio General",
    status: "scheduled", 
    plannedStartTime: (() => {
      const d = new Date();
      d.setHours(10, 0, 0, 0);
      return d.getTime();
    })(),
    actualStartTime: null as number | null,
    blocks: [
      { id: "b1", title: "Bienvenida", responsible: "Pastor", plannedDuration: 300, order: 0, status: "WAITING", actualStartTime: null, actualDuration: null },
      { id: "b2", title: "Cantos", responsible: "Worship", plannedDuration: 420, order: 1, status: "WAITING", actualStartTime: null, actualDuration: null },
      { id: "b3", title: "Sermón", responsible: "Invitado", plannedDuration: 1800, order: 2, status: "WAITING", actualStartTime: null, actualDuration: null },
    ],
  };

  // --- Lógica de Sockets ---
  io.on("connection", (socket) => {
    console.log("Cliente conectado:", socket.id);
    
    socket.emit("service_update", serviceState);

    // Modo Edición: Actualizar inicio planeado
    socket.on("update_planned_start", (time: number) => {
      serviceState.plannedStartTime = time;
      io.emit("service_update", serviceState);
    });

    // Modo Edición: Añadir Bloque
    socket.on("add_block", () => {
      const newBlock = {
        id: Math.random().toString(36).substr(2, 9),
        title: "Nuevo Bloque",
        responsible: "Equipo",
        plannedDuration: 300,
        order: serviceState.blocks.length,
        status: "WAITING",
        actualStartTime: null,
        actualDuration: null
      };
      serviceState.blocks.push(newBlock);
      io.emit("service_update", serviceState);
    });

    // Modo Edición: Eliminar Bloque
    socket.on("delete_block", (id: string) => {
      serviceState.blocks = serviceState.blocks.filter(b => b.id !== id);
      io.emit("service_update", serviceState);
    });

    // Acción: Iniciar Servicio
    socket.on("start_service", () => {
      const now = Date.now();
      serviceState.status = "live";
      serviceState.actualStartTime = now;
      
      // Auto-iniciar el primer bloque para sincronización perfecta
      const firstBlock = serviceState.blocks.find(b => b.order === 0);
      if (firstBlock) {
        firstBlock.status = "LIVE";
        firstBlock.actualStartTime = now;
      }
      
      io.emit("service_update", serviceState);
    });

    // Acción: Actualizar Bloque (General)
    socket.on("update_block", (blockData) => {
      const index = serviceState.blocks.findIndex(b => b.id === blockData.id);
      if (index !== -1) {
        serviceState.blocks[index] = { ...serviceState.blocks[index], ...blockData };
        io.emit("service_update", serviceState);
      }
    });

    socket.on("advance_block", () => {
      const now = Date.now();
      const sortedBlocks = [...serviceState.blocks].sort((a, b) => a.order - b.order);
      const liveIndex = sortedBlocks.findIndex(b => b.status === "LIVE");

      if (liveIndex !== -1) {
        const liveBlock = sortedBlocks[liveIndex];
        const elapsed = liveBlock.actualStartTime
          ? Math.floor((now - liveBlock.actualStartTime) / 1000)
          : liveBlock.plannedDuration;
        const blockIdx = serviceState.blocks.findIndex(b => b.id === liveBlock.id);
        serviceState.blocks[blockIdx] = { ...serviceState.blocks[blockIdx], status: "DONE", actualDuration: elapsed };

        const nextBlock = sortedBlocks[liveIndex + 1];
        if (nextBlock) {
          const nextIdx = serviceState.blocks.findIndex(b => b.id === nextBlock.id);
          serviceState.blocks[nextIdx] = { ...serviceState.blocks[nextIdx], status: "LIVE", actualStartTime: now };
        }
      } else {
        const firstWaiting = sortedBlocks.find(b => b.status === "WAITING");
        if (firstWaiting) {
          const idx = serviceState.blocks.findIndex(b => b.id === firstWaiting.id);
          serviceState.blocks[idx] = { ...serviceState.blocks[idx], status: "LIVE", actualStartTime: now };
        }
      }
      io.emit("service_update", serviceState);
    });

    socket.on("adjust_block_duration", (seconds: number) => {
      const liveBlock = serviceState.blocks.find(b => b.status === "LIVE");
      if (liveBlock) {
        const idx = serviceState.blocks.findIndex(b => b.id === liveBlock.id);
        serviceState.blocks[idx] = { ...serviceState.blocks[idx], plannedDuration: Math.max(60, liveBlock.plannedDuration + seconds) };
        io.emit("service_update", serviceState);
      }
    });

    // Reset para pruebas
    socket.on("reset_service", () => {
      serviceState.status = "scheduled";
      serviceState.actualStartTime = null;
      serviceState.blocks = serviceState.blocks.map(b => ({ ...b, status: "WAITING", actualStartTime: null, actualDuration: null }));
      io.emit("service_update", serviceState);
    });
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor de ServiceFlow corriendo en http://localhost:${PORT}`);
  });
}

startServer();
