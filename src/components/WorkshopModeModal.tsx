import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  Wrench,
  X,
} from 'lucide-react';
import { ASSEMBLY_STAGES } from '../data/assemblyGuideData';
import { PreEnergizeChecklistState } from '../types/crane';

interface WorkshopModeModalProps {
  completedStepIds: string[];
  onToggleStepCompleted: (stepId: string) => void;
  onClose: () => void;
}

export const WorkshopModeModal: React.FC<WorkshopModeModalProps> = ({
  completedStepIds,
  onToggleStepCompleted,
  onClose,
}) => {
  const flatSteps = useMemo(() => {
    const arr: {
      stageCode: string;
      stageTitle: string;
      requires12VGate: boolean;
      step: (typeof ASSEMBLY_STAGES)[number]['steps'][number];
    }[] = [];
    for (const st of ASSEMBLY_STAGES) {
      const stageNum = Number(st.code.replace(/\D/g, '')) || 0;
      for (const step of st.steps) {
        arr.push({
          stageCode: st.code,
          stageTitle: st.title,
          requires12VGate: stageNum >= 7,
          step,
        });
      }
    }
    return arr;
  }, []);

  const firstPendingIdx = flatSteps.findIndex((x) => !completedStepIds.includes(x.step.id));
  const [idx, setIdx] = useState(firstPendingIdx >= 0 ? firstPendingIdx : 0);
  const [simpleMode, setSimpleMode] = useState(true);
  const [preGate, setPreGate] = useState<PreEnergizeChecklistState>({
    commonGroundVerified: false,
    railsR2R3Isolated: false,
    dividersMeasured33V: false,
    shieldPwrJumperRemoved: false,
    l298n5vJumperRemoved: false,
    usbDisconnectedForExternal5V: false,
    counterweightConfirmed: false,
  });

  const current = flatSteps[idx];
  const isDone = completedStepIds.includes(current.step.id);
  const preGatePassed = Object.values(preGate).every(Boolean);
  const blockedBy12VGate = current.requires12VGate && !preGatePassed;

  return (
    <div className="no-print fixed inset-0 z-50 bg-[#050912] text-slate-100 flex flex-col overflow-y-auto">
      {/* Barra superior grande de alto contraste */}
      <div className="px-5 py-4 border-b border-slate-800 bg-[#0B1120] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-emerald-400" />
          <div>
            <div className="text-base font-extrabold text-white">
              MODO TALLER — Paso {idx + 1} de {flatSteps.length} ({current.stageCode})
            </div>
            <div className="text-xs text-slate-400">{current.stageTitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSimpleMode((v) => !v)}
            className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-emerald-300"
          >
            {simpleMode ? 'Explicación sencilla: SÍ' : 'Modo técnico'}
          </button>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white"
          >
            <X className="w-4 h-4" /> Salir de Modo Taller
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-4xl w-full mx-auto p-5 sm:p-8 flex flex-col justify-between gap-6">
        {/* Gate obligatorio antes de 12 V (E7–E12) */}
        {blockedBy12VGate ? (
          <div className="rounded-2xl bg-rose-950/40 border-2 border-rose-500 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-200">
              <ShieldAlert className="w-8 h-8 text-rose-400 shrink-0" />
              <div>
                <h3 className="text-lg font-extrabold">
                  Lista Pre-Energizar obligatoria antes de usar 12 V (Etapa {current.stageCode})
                </h3>
                <p className="text-xs text-rose-200/80">
                  Marca cada verificación con multímetro antes de avanzar a etapas de motores y potencia.
                </p>
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              {[
                ['commonGroundVerified', '1. Continuidad verificada entre P1 R1 y P2 R1 (0 Ω masa común).'],
                ['railsR2R3Isolated', '2. Riel R2 (+5 V) y Riel R3 (+3,3 V) completamente aislados (sin cruce).'],
                ['dividersMeasured33V', '3. Los 4 divisores de tensión miden ≤ 3,35 V (nunca 5 V directo al ESP32).'],
                ['shieldPwrJumperRemoved', '4. Jumper PWR del Shield L293D RETIRADO.'],
                ['l298n5vJumperRemoved', '5. Jumper 5V-EN del puente H L298N RETIRADO.'],
                ['usbDisconnectedForExternal5V', '6. Cables USB desconectados si estás alimentando por R2 (+5 V).'],
                ['counterweightConfirmed', '7. Zona mecánica despejada y contrapeso listo en contrapluma Z4.'],
              ].map(([key, text]) => (
                <label key={key} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preGate[key as keyof PreEnergizeChecklistState]}
                    onChange={(e) =>
                      setPreGate((p) => ({ ...p, [key]: e.target.checked }))
                    }
                    className="w-5 h-5"
                  />
                  <span>{text}</span>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Estado de energía */}
            <div
              className={`rounded-xl px-4 py-3 border text-sm font-extrabold flex items-center gap-2 ${
                current.step.powerState === 'TODO DESCONECTADO'
                  ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200'
                  : 'bg-amber-950/60 border-amber-500 text-amber-200'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0" />
              ESTADO DE ENERGÍA: {current.step.powerState}
            </div>

            <div className="rounded-2xl bg-[#0F172A] border border-slate-700 p-6 space-y-4">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                {current.step.title}
              </h2>
              <p className="text-base sm:text-lg text-emerald-200 font-semibold leading-relaxed">
                {current.step.actionSentence}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                  <div className="text-xs text-slate-400">ORIGEN → DESTINO</div>
                  <div className="font-bold text-white mt-1">
                    {current.step.origin} → {current.step.destination}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-950 border border-slate-800 p-3">
                  <div className="text-xs text-slate-400">CABLE Y PROTOBOARD</div>
                  <div className="font-bold text-sky-300 mt-1">
                    {current.step.wireColor} · {current.step.jumperType}
                    {current.step.breadboardCoord ? ` · ${current.step.breadboardCoord}` : ''}
                  </div>
                </div>
              </div>

              {simpleMode && (
                <div className="rounded-xl bg-sky-950/35 border border-sky-500/40 p-4 text-sm text-sky-100">
                  <strong>Explicación sencilla:</strong> {current.step.simpleExplanation}
                </div>
              )}

              <div className="rounded-xl bg-slate-950 border border-slate-700 p-4 text-sm space-y-1">
                <div className="font-bold text-amber-300">
                  Prueba al terminar ({current.step.multimeterTest.scale}):
                </div>
                <div className="text-slate-200">
                  <strong>Puntas:</strong> {current.step.multimeterTest.probes} ·{' '}
                  <strong>Esperado:</strong> {current.step.multimeterTest.expected}
                </div>
                <div className="text-rose-300 text-xs">
                  <strong>Si no da:</strong> {current.step.multimeterTest.ifFails}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navegación inferior con botón grande Hecho */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" /> Anterior
          </button>

          <button
            onClick={() => {
              onToggleStepCompleted(current.step.id);
              if (!isDone && idx < flatSteps.length - 1) setIdx(idx + 1);
            }}
            className={`inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-extrabold shadow-xl ${
              isDone
                ? 'bg-emerald-950 border-2 border-emerald-500 text-emerald-300'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            {isDone ? 'Paso Completado (toca para desmarcar)' : 'HECHO — Siguiente paso'}
          </button>

          <button
            onClick={() => setIdx((i) => Math.min(flatSteps.length - 1, i + 1))}
            disabled={idx === flatSteps.length - 1}
            className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-sm font-bold"
          >
            Siguiente <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
