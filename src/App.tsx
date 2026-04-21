import { useState, useEffect } from 'react';
import { useService } from './hooks/useService';
import { useClock } from './hooks/useClock';
import { formatTime, formatDuration, cn, formatDelay } from './lib/utils';
import { 
  Play, CheckCircle, RotateCcw, Clock, AlertTriangle, 
  Settings2, Zap, Plus, Trash2, User, ChevronRight, FastForward 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { 
    service, calculatedBlocks, 
    startService, advanceBlock,
    updateBlock, updatePlannedStart, addBlock, deleteBlock, resetService,
    adjustBlockDuration
  } = useService();
  
  const now = useClock();
  const [viewMode, setViewMode] = useState<'edit' | 'live'>('edit');

  // Sync viewMode with live status on initial load/mount
  useEffect(() => {
    if (service?.status === 'live') {
      setViewMode('live');
    }
  }, [service?.status]);

  if (!service) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg text-white p-4">
        <div className="text-center space-y-4">
          <Clock className="w-12 h-12 mx-auto animate-pulse text-accent" />
          <p className="text-xs font-mono uppercase tracking-[0.2em] opacity-40">Synchronizing with ServiceFlow Mission Control...</p>
        </div>
      </div>
    );
  }

  const currentBlock = calculatedBlocks.find(b => b.status === "LIVE");
  // ALL TIMING DERIVES FROM 'now'
  const elapsedInBlock = currentBlock?.actualStartTime ? Math.floor((now - currentBlock.actualStartTime) / 1000) : 0;
  const isOvertime = currentBlock && elapsedInBlock > currentBlock.plannedDuration;
  const totalDelaySeconds = calculatedBlocks.length > 0 ? calculatedBlocks[calculatedBlocks.length - 1].delaySeconds : 0;
  const lastBlock = calculatedBlocks[calculatedBlocks.length - 1];

  return (
    <div className="min-h-screen bg-bg text-[#f8fafc] font-sans flex flex-col overflow-hidden">
      {/* Sleek Header */}
      <header className="h-[64px] border-b border-surface-light bg-surface flex items-center justify-between px-6 shrink-0 shadow-lg">
        <div className="flex items-center gap-6">
          <div className="font-extrabold text-xl tracking-tighter text-accent">SERVICEFLOW</div>
          
          <div className="flex bg-bg/50 p-1 rounded-lg border border-surface-light gap-1">
            <button 
              onClick={() => setViewMode('edit')}
              className={cn(
                "px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                viewMode === 'edit' ? "bg-surface text-white shadow-sm" : "text-text-muted hover:text-white"
              )}
            >
              <Settings2 className="w-3 h-3" /> Edit Mode
            </button>
            <button 
              onClick={() => setViewMode('live')}
              className={cn(
                "px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-2",
                viewMode === 'live' ? "bg-accent text-white shadow-sm" : "text-text-muted hover:text-white"
              )}
            >
              <Zap className="w-3 h-3" /> Live Mode
            </button>
          </div>
        </div>

        <div className="flex items-center gap-8">
           <div className="flex flex-col items-center">
             <div className="text-[10px] text-text-muted font-bold tracking-[0.2em] uppercase leading-none mb-1">Hora Local</div>
             <div className="font-mono text-xl font-bold text-white tracking-widest">{formatTime(now)}</div>
           </div>
           
           <div className="h-10 w-[1px] bg-surface-light" />

           <div className={cn(
             "h-[32px] border text-[12px] font-black px-4 rounded-lg flex items-center gap-2 uppercase tracking-tight transition-colors shadow-2xl",
             totalDelaySeconds > 0 ? "bg-danger text-white border-danger shadow-danger/20" : 
             totalDelaySeconds < 0 ? "bg-success text-white border-success shadow-success/20" :
             "bg-surface-light text-text-muted border-surface-light"
           )}>
             {service.status === 'live' ? `RETRASO: ${formatDelay(totalDelaySeconds)}` : "STANDBY"}
           </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-grow overflow-hidden p-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        
        {/* Working Area */}
        <div className="flex flex-col gap-6 overflow-hidden">
          
          {viewMode === 'edit' ? (
            /* --- EDIT MODE VIEW --- */
            <section className="flex flex-col flex-grow overflow-hidden gap-6">
              <div className="flex justify-between items-end shrink-0">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Planificación del Servicio</h2>
                  <p className="text-xs text-text-muted mt-1 uppercase tracking-widest font-mono">Diseña el flujo antes de salir al aire</p>
                </div>
                <div className="sleek-card py-2 px-4 flex items-center gap-4">
                  <div className="stat-label mb-0">Inicio Planeado:</div>
                  <input 
                    type="time" 
                    className="bg-transparent border-none font-mono font-bold text-accent focus:ring-0"
                    defaultValue={(() => {
                      const d = new Date(service.plannedStartTime);
                      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                    })()}
                    onChange={(e) => {
                      const [h, m] = e.target.value.split(':').map(Number);
                      const now = new Date();
                      now.setHours(h, m, 0, 0);
                      updatePlannedStart(now.getTime());
                    }}
                  />
                </div>
              </div>

              <div className="bg-surface border border-surface-light rounded-xl flex flex-col flex-grow overflow-hidden">
                <div className="grid grid-cols-[60px_1fr_150px_120px_50px] gap-4 px-6 py-3 border-b border-surface-light bg-black/10 text-[10px] font-bold text-text-muted uppercase tracking-widest shrink-0">
                  <div>Orden</div>
                  <div>Título del Bloque</div>
                  <div>Responsable</div>
                  <div className="text-center">Duración (min)</div>
                  <div className="text-right">Acción</div>
                </div>

                <div className="flex-grow overflow-y-auto px-2">
                  <div className="py-2 space-y-1">
                    {service.blocks.map((block, idx) => (
                      <div key={block.id} className="grid grid-cols-[60px_1fr_150px_120px_50px] gap-4 px-4 py-2 hover:bg-white/[0.02] rounded-lg items-center group transition-all">
                        <div className="text-xs font-mono text-text-muted">#{idx + 1}</div>
                        <input 
                          className="bg-transparent border-none text-[15px] font-bold focus:ring-1 focus:ring-accent rounded px-2"
                          value={block.title}
                          onChange={(e) => updateBlock(block.id, { title: e.target.value } as any)}
                        />
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-text-muted" />
                          <input 
                            className="bg-transparent border-none text-[13px] text-text-muted focus:ring-1 focus:ring-accent rounded px-2 w-full"
                            value={block.responsible}
                            onChange={(e) => updateBlock(block.id, { responsible: e.target.value } as any)}
                          />
                        </div>
                        <div className="flex justify-center items-center gap-2">
                          <input 
                            type="number"
                            className="bg-transparent border-none text-center font-mono font-bold text-accent w-16 focus:ring-1 focus:ring-accent rounded"
                            value={Math.floor(block.plannedDuration / 60)}
                            onChange={(e) => updateBlock(block.id, { plannedDuration: parseInt(e.target.value) * 60 } as any)}
                          />
                          <span className="text-[10px] text-text-muted uppercase">Min</span>
                        </div>
                        <button 
                          onClick={() => deleteBlock(block.id)}
                          className="p-2 opacity-0 group-hover:opacity-100 text-danger hover:bg-danger/10 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button 
                    onClick={addBlock}
                    className="w-full py-4 mt-2 border border-dashed border-surface-light rounded-xl text-text-muted hover:text-white hover:border-accent hover:bg-accent/5 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest"
                  >
                    <Plus className="w-4 h-4" /> Añadir Nuevo Bloque
                  </button>
                </div>
              </div>
            </section>
          ) : (
            /* --- LIVE MODE VIEW --- */
            <section className="flex flex-col flex-grow overflow-hidden gap-6">
               <div className="grid grid-cols-4 gap-4 shrink-0">
                  <div className="sleek-card flex items-center justify-between">
                    <div>
                      <div className="stat-label">Hora Programada</div>
                      <div className="stat-value text-text-muted">{formatTime(service.plannedStartTime)}</div>
                    </div>
                    <Clock className="w-8 h-8 text-text-muted/20" />
                  </div>

                  <div className="sleek-card flex items-center justify-between">
                    <div>
                      <div className="stat-label">Inicio Real</div>
                      <div className="stat-value text-accent">{service.actualStartTime ? formatTime(service.actualStartTime) : "--:--:--"}</div>
                    </div>
                    <Clock className="w-8 h-8 text-accent/20" />
                  </div>

                  <div className={cn("sleek-card flex items-center justify-between transition-colors", isOvertime ? "bg-danger/10 border-danger/30" : "")}>
                    <div>
                      <div className={cn("stat-label", isOvertime ? "text-danger" : "")}>Tiempo en Bloque</div>
                      <div className={cn("stat-value", isOvertime ? "text-danger" : "text-white")}>
                        {formatDuration(elapsedInBlock)}
                      </div>
                    </div>
                    {isOvertime ? <AlertTriangle className="w-8 h-8 text-danger animate-pulse" /> : <Clock className="w-8 h-8 text-white/10" />}
                  </div>

                  <div className="sleek-card flex items-center justify-between">
                    <div>
                      <div className="stat-label text-warning">Fin Estimado</div>
                      <div className="stat-value text-warning">{lastBlock ? formatTime(lastBlock.expectedEndTime) : "--:--:--"}</div>
                    </div>
                    <ChevronRight className="w-8 h-8 text-warning/20" />
                  </div>
               </div>

               <div className="bg-surface border border-surface-light rounded-xl flex flex-col flex-grow overflow-hidden shadow-2xl">
                 <div className="grid grid-cols-[80px_1fr_100px_100px_100px] gap-4 px-6 py-3 border-b border-surface-light bg-black/10 text-[10px] font-bold text-text-muted uppercase tracking-widest shrink-0">
                    <div>Hora</div>
                    <div>Bloque / Responsable</div>
                    <div className="text-center">Planeado</div>
                    <div className="text-center">Restante</div>
                    <div className="text-right">Estado</div>
                 </div>

                 <div className="flex-grow overflow-y-auto">
                    <AnimatePresence initial={false}>
                      {calculatedBlocks.map((block) => (
                        <motion.div
                          layout
                          key={block.id}
                          className={cn(
                            "grid grid-cols-[80px_1fr_100px_100px_100px] gap-4 px-6 py-4 border-b border-surface-light/30 items-center relative transition-all",
                            block.status === "LIVE" ? "bg-accent/5 border-l-4 border-l-accent" : "",
                            block.status === "DONE" || block.status === "SKIPPED" ? "opacity-30" : ""
                          )}
                        >
                          <div className="font-mono text-sm">
                            <span className="text-[10px] block opacity-50 font-normal leading-none mb-1">
                              {block.status === "DONE" ? "REAL" : "PROY"}
                            </span>
                            <span className={cn(block.delaySeconds !== 0 && block.status !== "DONE" ? (block.delaySeconds > 0 ? "text-danger" : "text-success") : "")}>
                               {formatTime(block.expectedStartTime)}
                            </span>
                          </div>

                          <div>
                            <div className="text-[15px] font-bold">{block.title}</div>
                            <div className="text-[11px] text-text-muted uppercase tracking-wide">{block.responsible}</div>
                          </div>

                          <div className="text-center font-mono text-sm opacity-60">
                            {formatDuration(block.plannedDuration)}
                          </div>

                          <div className={cn(
                             "text-center font-mono font-bold text-sm",
                             block.status === "LIVE" && elapsedInBlock > block.plannedDuration ? "text-danger" : "text-white/80"
                          )}>
                             {block.status === "LIVE" ? (
                               elapsedInBlock > block.plannedDuration 
                                ? `+${formatDuration(elapsedInBlock - block.plannedDuration)}` 
                                : `-${formatDuration(block.plannedDuration - elapsedInBlock)}`
                             ) : "--:--"}
                          </div>

                          <div className="text-right">
                             <span className={cn(
                               "text-[10px] font-bold px-2 py-0.5 rounded-full",
                               block.status === "LIVE" ? "bg-accent text-white animate-pulse" :
                               block.status === "DONE" ? "bg-success/20 text-success border border-success/30" :
                               block.status === "SKIPPED" ? "bg-slate-700 text-slate-400" :
                               "bg-slate-800 text-slate-500"
                             )}>
                               {block.status}
                             </span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                 </div>
               </div>
            </section>
          )}

        </div>

        {/* Controls Panel (Always Sidebar) */}
        <aside className="flex flex-col gap-6">
          <div className="sleek-card border-accent/20 bg-accent/[0.03]">
             <div className="stat-label text-accent mb-4">Controles Maestros</div>
             
             <div className="space-y-3">
               {service.status === 'scheduled' ? (
                 <button 
                  onClick={() => {
                    startService();
                    setViewMode('live');
                  }}
                  className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-accent/20 transition-all active:scale-95"
                 >
                   <Play className="fill-current w-4 h-4" /> INICIAR SERVICIO
                 </button>
               ) : (
                 <div className="space-y-2">
                    <button 
                      onClick={advanceBlock}
                      className="w-full bg-accent text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-accent/20 transition-all hover:bg-accent/90 active:scale-95"
                    >
                      <ChevronRight className="w-5 h-5" /> SIGUIENTE BLOQUE
                    </button>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button 
                        onClick={() => adjustBlockDuration(60)}
                        className="py-2.5 bg-bg/50 border border-surface-light/50 rounded-lg text-[10px] font-bold uppercase text-text-muted hover:text-white"
                      >
                        +1m Adjust
                      </button>
                      <button 
                        onClick={() => adjustBlockDuration(-60)}
                        className="py-2.5 bg-bg/50 border border-surface-light/50 rounded-lg text-[10px] font-bold uppercase text-text-muted hover:text-white"
                      >
                        -1m Adjust
                      </button>
                    </div>
                  </div>
               )}
             </div>
          </div>

          <div className="sleek-card flex-grow flex flex-col">
             <div className="stat-label mb-4">Métricas del Plan</div>
             <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                   <span className="text-text-muted">Total Bloques:</span>
                   <span className="font-mono font-bold">{calculatedBlocks.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                   <span className="text-text-muted">Duración Estimada:</span>
                   <span className="font-mono font-bold">
                     {Math.floor(calculatedBlocks.reduce((acc, b) => acc + b.plannedDuration, 0) / 60)} min
                   </span>
                </div>
                <div className="h-[1px] bg-surface-light w-full" />
                <div className="text-center py-4">
                   <div className="stat-label">Retraso General</div>
                   <div className={cn(
                     "text-6xl font-extrabold tracking-tighter font-mono",
                     totalDelaySeconds > 0 ? "text-danger" : totalDelaySeconds < 0 ? "text-success" : "text-white/20"
                   )}>
                     {formatDelay(totalDelaySeconds)}
                   </div>
                   <div className="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-1 italic">Retraso Acumulado</div>
                </div>
             </div>
             
             <button 
              onClick={resetService}
              className="mt-auto pt-6 flex items-center justify-center gap-2 text-[10px] font-bold text-text-muted hover:text-danger transition-colors uppercase tracking-widest"
             >
                <RotateCcw className="w-3 h-3" /> Factory Reset
             </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

