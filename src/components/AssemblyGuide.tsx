import React, { useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Cable,
  CheckCircle2,
  Cpu,
  Grid,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { ASSEMBLY_STAGES } from '../data/assemblyGuideData';
import {
  BREADBOARD_LAYOUT,
  COMMON_ERRORS,
  GLOSSARY_ITEMS,
  HARNESS_CONDUCTORS,
  VOLTAGE_DIVIDERS,
} from '../data/craneData';
import {
  AssemblyStep,
  HarnessConductor,
  PinAssignment,
  UserEditableParams,
  VoltageDividerSpec,
} from '../types/crane';

interface AssemblyGuideProps {
  completedStepIds: string[];
  onToggleStepCompleted: (stepId: string) => void;
  conductors?: HarnessConductor[];
  params?: UserEditableParams;
  pinAssignments?: PinAssignment[];
  onOpenWorkshopMode?: () => void;
}

const StepContextDiagram: React.FC<{ step: AssemblyStep; stageCode: string }> = ({
  step,
  stageCode,
}) => {
  const isProtoActive = Boolean(step.breadboardCoord);
  const zoneMap: Record<string, string> = {
    Z1: 'Caja Z1 (Fuentes · P1/P2 · ESP32 · UNO · L298N)',
    Z2: 'Mástil hueco Z2 (Tramo A + Rizo)',
    Z3: 'Cabeza Z3 (3 Motores · 3 FC-33 · US-H · Bornera)',
    Z4: 'Pluma y Contrapluma Z4 (Contrapeso)',
    Z5: 'Carro Z5 (Placa US-H + Hall KY-003)',
    Z6: 'Gancho Z6 (Electroimán + US-V)',
    Z7: 'Bodega Z7 (Tira LED PIR autónoma)',
    Z8: 'Corona Z8 (Bombillo M3)',
  };

  const wireStroke =
    step.wireColor.toLowerCase().includes('rojo')
      ? '#ef4444'
      : step.wireColor.toLowerCase().includes('naranja')
        ? '#f97316'
        : step.wireColor.toLowerCase().includes('negro')
          ? '#94a3b8'
          : step.wireColor.toLowerCase().includes('verde')
            ? '#22c55e'
            : step.wireColor.toLowerCase().includes('amarillo')
              ? '#facc15'
              : '#38bdf8';

  const benchNodes = [
    { id: 'PSU', label: 'Fuentes 5V / 12V', x: 8, y: 8, w: 72, h: 20 },
    { id: 'P1', label: 'P1 (R1 GND / R2 +5V)', x: 86, y: 8, w: 86, h: 20 },
    { id: 'P2', label: 'P2 (R1 / R3 +3,3V / Div)', x: 178, y: 8, w: 94, h: 20 },
    { id: 'ESP32', label: 'ESP32 (3,3 V)', x: 8, y: 112, w: 66, h: 20 },
    { id: 'UNO', label: 'UNO + Shield', x: 80, y: 112, w: 66, h: 20 },
    { id: 'DRIVERS', label: 'L298N / Cabeza Z3', x: 152, y: 112, w: 120, h: 20 },
  ];

  const activeText = `${step.origin} ${step.destination} ${step.title}`.toLowerCase();
  const isNodeActive = (id: string) => {
    if (id === 'PSU' && (activeText.includes('fuente') || activeText.includes('12 v') || activeText.includes('interruptor'))) return true;
    if (id === 'P1' && (activeText.includes('p1') || activeText.includes('r2'))) return true;
    if (id === 'P2' && (activeText.includes('p2') || activeText.includes('divisor') || activeText.includes('r3') || activeText.includes('pull-up'))) return true;
    if (id === 'ESP32' && activeText.includes('esp32')) return true;
    if (id === 'UNO' && (activeText.includes('uno') || activeText.includes('shield') || activeText.includes('lcd') || activeText.includes('buzzer'))) return true;
    if (id === 'DRIVERS' && (activeText.includes('l298n') || activeText.includes('motor') || activeText.includes('fc-33') || activeText.includes('z3') || activeText.includes('z5') || activeText.includes('z6') || activeText.includes('z8'))) return true;
    return false;
  };

  return (
    <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-3 flex flex-col justify-between">
      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5 gap-2">
        <span className="truncate">
          Contexto en gris · <strong className="text-emerald-400">Solo nuevo ({stageCode}·P{step.stepNumber})</strong>
        </span>
        <span className="font-mono text-sky-300 shrink-0">{step.highlightZone}</span>
      </div>

      <svg viewBox="0 0 280 140" className="w-full h-auto select-none">
        {/* Contexto completo atenuado en gris */}
        <rect x="4" y="4" width="272" height="132" rx="6" fill="#0B1120" stroke="#1E293B" />
        <line x1="44" y1="28" x2="44" y2="112" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="129" y1="28" x2="113" y2="112" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />
        <line x1="225" y1="28" x2="212" y2="112" stroke="#1E293B" strokeWidth="1" strokeDasharray="3 3" />

        {benchNodes.map((n) => {
          const active = isNodeActive(n.id);
          return (
            <g key={n.id} opacity={active ? 1 : 0.32}>
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx="3"
                fill={active ? '#0f2942' : '#0f172a'}
                stroke={active ? '#38bdf8' : '#334155'}
                strokeWidth={active ? '1.3' : '1'}
              />
              <text
                x={n.x + n.w / 2}
                y={n.y + 13}
                textAnchor="middle"
                fill={active ? '#e0f2fe' : '#64748b'}
                fontSize="6.7"
                fontWeight={active ? '700' : '500'}
              >
                {n.label}
              </text>
            </g>
          );
        })}

        {/* Conexión nueva resaltada en el centro */}
        <rect
          x="10"
          y="40"
          width="94"
          height="54"
          rx="5"
          fill="#0f172a"
          stroke="#38bdf8"
          strokeWidth="1.6"
        />
        <text x="57" y="57" textAnchor="middle" fill="#94a3b8" fontSize="6.5" fontWeight="700">
          ORIGEN
        </text>
        <text x="57" y="72" textAnchor="middle" fill="#f8fafc" fontSize="7.6" fontWeight="700">
          {step.highlightNodes[0].slice(0, 20)}
        </text>
        <text x="57" y="85" textAnchor="middle" fill="#7dd3fc" fontSize="6.5">
          {step.jumperType}
        </text>

        {/* Cable nuevo destacado */}
        <path
          d="M104,67 L176,67"
          stroke={wireStroke}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M104,67 L176,67"
          stroke="#ffffff"
          strokeOpacity="0.45"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
        <polygon points="170,62 178,67 170,72" fill={wireStroke} />
        <rect x="116" y="45" width="48" height="14" rx="3" fill="#064e3b" stroke="#10b981" />
        <text x="140" y="54.5" textAnchor="middle" fill="#a7f3d0" fontSize="6.8" fontWeight="700">
          CONEXIÓN NUEVA
        </text>

        <rect
          x="176"
          y="40"
          width="94"
          height="54"
          rx="5"
          fill="#064e3b"
          stroke="#10b981"
          strokeWidth="1.8"
        />
        <text x="223" y="57" textAnchor="middle" fill="#a7f3d0" fontSize="6.5" fontWeight="700">
          DESTINO
        </text>
        <text x="223" y="72" textAnchor="middle" fill="#ffffff" fontSize="7.6" fontWeight="700">
          {step.highlightNodes[1].slice(0, 20)}
        </text>
        <text x="223" y="85" textAnchor="middle" fill="#6ee7b7" fontSize="6.3">
          {isProtoActive ? 'Protoboard exacto' : step.highlightZone}
        </text>
      </svg>

      <div className="mt-1.5 text-[10px] text-slate-400 truncate" title={zoneMap[step.highlightZone]}>
        Zona: <span className="text-slate-200">{zoneMap[step.highlightZone] || step.highlightZone}</span>
      </div>
    </div>
  );
};

const DividerSchematicSvg: React.FC<{ spec: VoltageDividerSpec }> = ({ spec }) => {
  const c = spec.startColumn;
  return (
    <svg viewBox="0 0 360 155" className="w-full h-auto bg-[#070B14] rounded-lg border border-slate-800">
      {/* Encabezado */}
      <text x="14" y="18" fill="#38bdf8" fontSize="9.5" fontWeight="700">
        {spec.name} (P2 cols {c}–{c + 9})
      </text>
      <text x="346" y="18" textAnchor="end" fill="#34d399" fontSize="8.5" fontFamily="monospace">
        5V → 3,33V
      </text>

      {/* Entrada 5 V */}
      <rect x="12" y="38" width="76" height="28" rx="4" fill="#1e293b" stroke="#f59e0b" />
      <text x="50" y="50" textAnchor="middle" fill="#fde68a" fontSize="8" fontWeight="700">
        {spec.sourcePin}
      </text>
      <text x="50" y="61" textAnchor="middle" fill="#cbd5e1" fontSize="7.5" fontFamily="monospace">
        ({c}, a) · 5 V
      </text>

      <line x1="88" y1="52" x2="112" y2="52" stroke="#facc15" strokeWidth="2.2" />

      {/* Res A */}
      <rect x="112" y="43" width="52" height="18" rx="3" fill="#78350f" stroke="#f59e0b" />
      <text x="138" y="55" textAnchor="middle" fill="#fef3c7" fontSize="8" fontWeight="700">
        R1: 1 kΩ
      </text>
      <text x="138" y="38" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">
        ({c},b)→({c + 3},b)
      </text>

      <line x1="164" y1="52" x2="195" y2="52" stroke="#38bdf8" strokeWidth="2.5" />

      {/* NODO */}
      <circle cx="195" cy="52" r="5.5" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
      <text x="195" y="34" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontWeight="700">
        NODO ({c + 3}, c) = 3,33 V
      </text>

      {/* Salida a ESP32 */}
      <line x1="200" y1="52" x2="255" y2="52" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray={spec.hasDetachableJumper ? '4 2' : undefined} />
      <rect x="255" y="36" width="94" height="32" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
      <text x="302" y="50" textAnchor="middle" fill="#ffffff" fontSize="8.5" fontWeight="700">
        {spec.esp32Pin}
      </text>
      <text x="302" y="61" textAnchor="middle" fill="#a7f3d0" fontSize="7">
        {spec.hasDetachableJumper ? 'Jumper desmontable' : 'Entrada segura 3,3 V'}
      </text>

      {/* Rama vertical hacia GND: Res B + Res C */}
      <line x1="195" y1="57" x2="195" y2="82" stroke="#38bdf8" strokeWidth="2" />
      <rect x="130" y="82" width="60" height="18" rx="3" fill="#78350f" stroke="#f59e0b" />
      <text x="160" y="94" textAnchor="middle" fill="#fef3c7" fontSize="7.8" fontWeight="700">
        R2a: 1 kΩ
      </text>
      <text x="160" y="109" textAnchor="middle" fill="#94a3b8" fontSize="6.8" fontFamily="monospace">
        ({c + 3},d)→({c + 6},d)
      </text>

      <line x1="190" y1="91" x2="206" y2="91" stroke="#cbd5e1" strokeWidth="2" />

      <rect x="206" y="82" width="60" height="18" rx="3" fill="#78350f" stroke="#f59e0b" />
      <text x="236" y="94" textAnchor="middle" fill="#fef3c7" fontSize="7.8" fontWeight="700">
        R2b: 1 kΩ
      </text>
      <text x="236" y="109" textAnchor="middle" fill="#94a3b8" fontSize="6.8" fontFamily="monospace">
        ({c + 6},b)→({c + 9},b)
      </text>

      <line x1="266" y1="91" x2="294" y2="91" stroke="#94a3b8" strokeWidth="2" />
      <line x1="294" y1="91" x2="294" y2="122" stroke="#94a3b8" strokeWidth="2" />
      <rect x="242" y="122" width="106" height="22" rx="4" fill="#0f172a" stroke="#64748b" />
      <text x="295" y="136" textAnchor="middle" fill="#cbd5e1" fontSize="8" fontWeight="700">
        ({c + 9}, a) → P2 R1 (GND)
      </text>

      <text x="14" y="136" fill="#94a3b8" fontSize="7.5">
        R_abajo total = 1 kΩ + 1 kΩ = 2 kΩ
      </text>
    </svg>
  );
};

export const AssemblyGuide: React.FC<AssemblyGuideProps> = ({
  completedStepIds,
  onToggleStepCompleted,
  conductors = HARNESS_CONDUCTORS,
  params,
  pinAssignments = [],
  onOpenWorkshopMode,
}) => {
  const modifiedPins = pinAssignments.filter((p) => p.pin !== p.defaultPin);
  const [selectedStageId, setSelectedStageId] = useState<string>('E0');
  const [simpleMode, setSimpleMode] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<
    'stages' | 'protoboards' | 'dividers' | 'harness' | 'glossary' | 'errors'
  >('stages');
  const [selectedRegion, setSelectedRegion] = useState<
    'ALL' | 'GND_BRIDGE' | 'DIV1' | 'DIV2' | 'DIV3' | 'DIV4' | 'HOME'
  >('ALL');

  const stage =
    ASSEMBLY_STAGES.find((s) => s.id === selectedStageId) || ASSEMBLY_STAGES[0];

  const totalSteps = ASSEMBLY_STAGES.reduce((acc, s) => acc + s.steps.length, 0);

  const tramoA = conductors.filter((c) => c.tramo === 'Tramo A (Caja -> Cabeza)');
  const tramoB = conductors.filter((c) => c.tramo === 'Tramo B (Cabeza -> Carro/Gancho)');
  const baseTramoACm =
    params && params.mastHeightCm !== null
      ? params.mastHeightCm + params.rizoReserveCm + 30
      : null;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl bg-[#0F172A] border border-slate-800 p-5">
        <div>
          <h2 className="text-xl font-bold text-white">
            Guía de Montaje Sin Ambigüedades (E0–E12 · Protoboards · Divisores · Trenzado)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Avance total: <strong className="text-emerald-300 font-mono">{completedStepIds.length}/{totalSteps}</strong> pasos completados (1 paso = 1 conexión exacta). Cada paso incluye mesa, estado de energía, coordenadas 1–63 / a–j, resalte visual y prueba con multímetro.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onOpenWorkshopMode && (
            <button
              onClick={onOpenWorkshopMode}
              className="px-3.5 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition whitespace-nowrap shadow"
            >
              Abrir Modo Taller (1 paso / Pre-Energizar)
            </button>
          )}
          <button
            onClick={() => setSimpleMode((v) => !v)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition whitespace-nowrap ${
              simpleMode
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-[#0B1120] border-slate-700 text-slate-200 hover:border-slate-500'
            }`}
          >
            {simpleMode ? 'Explicación sencilla: ACTIVADA' : 'Modo Explicación sencilla'}
          </button>
        </div>
      </div>

      {modifiedPins.length > 0 && (
        <div className="rounded-xl bg-amber-950/40 border border-amber-500/40 p-3.5 text-xs text-amber-100">
          <strong>Pines personalizados activos desde project.json:</strong>{' '}
          {modifiedPins.map((p) => `${p.componentLabel}: ${p.controller} ${p.pin} (antes ${p.defaultPin})`).join(' · ')}
        </div>
      )}

      {/* Sub-pestañas de la guía sin ambigüedades */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-[#0F172A] border border-slate-800">
        {[
          { id: 'stages', label: `Etapas E0–E12 (${totalSteps} pasos)`, icon: <Zap className="w-3.5 h-3.5" /> },
          { id: 'protoboards', label: 'Protoboards P1 y P2 (1–63 / a–j)', icon: <Grid className="w-3.5 h-3.5" /> },
          { id: 'dividers', label: 'Divisores y Pull-up (13×1 kΩ)', icon: <Cpu className="w-3.5 h-3.5" /> },
          { id: 'harness', label: 'Cables y Trenzado', icon: <Cable className="w-3.5 h-3.5" /> },
          { id: 'glossary', label: 'Glosario sencillo', icon: <BookOpen className="w-3.5 h-3.5" /> },
          { id: 'errors', label: 'Errores comunes', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewMode(tab.id as typeof viewMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
              viewMode === tab.id
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* VISTA 1: ETAPAS E0-E12 */}
      {viewMode === 'stages' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          {/* Selector vertical de etapas E0..E12 */}
          <aside className="rounded-xl bg-[#0F172A] border border-slate-800 p-3 space-y-1.5">
            <div className="text-xs font-semibold text-slate-400 px-2 py-1">
              Etapas de montaje (en orden)
            </div>
            {ASSEMBLY_STAGES.map((s) => {
              const doneInStage = s.steps.filter((st) =>
                completedStepIds.includes(st.id)
              ).length;
              const isAllDone = doneInStage === s.steps.length;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedStageId(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition flex items-center justify-between gap-2 ${
                    selectedStageId === s.id
                      ? 'bg-emerald-600/20 border-emerald-500 text-white font-semibold'
                      : 'bg-[#0B1120] border-slate-800/80 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <span className="truncate">{s.title}</span>
                  <span
                    className={`font-mono text-[10px] shrink-0 ${
                      isAllDone ? 'text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {doneInStage}/{s.steps.length}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* Contenido de la etapa activa */}
          <div className="xl:col-span-3 space-y-5">
            {/* Regla de oro repetida en cada etapa */}
            <div className="rounded-xl bg-rose-950/30 border border-rose-500/40 p-4 flex items-start gap-3 text-xs text-rose-100">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong className="text-rose-300">REGLA DE ORO (obligatoria en {stage.code}):</strong>{' '}
                nunca se cablea con energía. Orden de encendido: primero <strong>5 V</strong> y el{' '}
                <strong>12 V</strong> al final. Orden de apagado: al revés (primero apagar 12 V con
                el interruptor general y luego 5 V). Nunca conectes el USB y el riel de 5 V a la vez.
              </div>
            </div>

            {/* Ficha resumen de la etapa */}
            <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-4">
              <div>
                <div className="text-xs font-mono text-emerald-400 font-semibold">
                  ETAPA {stage.code} ({stage.steps.length} paso(s) individual(es))
                </div>
                <h3 className="text-xl font-bold text-white mt-0.5">{stage.title}</h3>
                <p className="text-sm text-slate-300 mt-1">{stage.objective}</p>
              </div>

              {simpleMode && (
                <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/40 p-3.5 text-xs text-emerald-100">
                  <strong>Explicación sencilla:</strong> {stage.simpleSummary}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-4 space-y-1.5">
                  <div className="font-semibold text-emerald-300">Conecta en esta etapa:</div>
                  <ul className="list-disc list-inside text-slate-200 space-y-1">
                    {stage.connectList.map((c, idx) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg bg-[#0B1120] border border-rose-500/30 p-4 space-y-1.5">
                  <div className="font-semibold text-rose-300">NO conectes todavía:</div>
                  <ul className="list-disc list-inside text-slate-200 space-y-1">
                    {stage.doNotConnectYet.map((d, idx) => (
                      <li key={idx}>{d}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-4 space-y-1">
                  <div className="font-semibold text-sky-300">Prueba de etapa:</div>
                  <p className="text-slate-200">{stage.stageTest}</p>
                </div>

                <div className="rounded-lg bg-[#0B1120] border border-amber-500/30 p-4 space-y-1">
                  <div className="font-semibold text-amber-300">Si falla:</div>
                  <p className="text-slate-200">{stage.ifFails}</p>
                </div>
              </div>
            </div>

            {/* Pasos detallados 1..n */}
            <div className="space-y-5">
              {stage.steps.map((step) => {
                const isDone = completedStepIds.includes(step.id);
                return (
                  <article
                    key={step.id}
                    className={`rounded-xl border p-6 space-y-4 transition ${
                      isDone
                        ? 'bg-emerald-950/15 border-emerald-500/45'
                        : 'bg-[#0F172A] border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-sky-300">
                            {stage.code} · Paso {step.stepNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-semibold ${
                              step.powerState === 'TODO DESCONECTADO'
                                ? 'text-emerald-300'
                                : step.powerState === 'SOLO 5 V ENCENDIDO'
                                  ? 'text-amber-300'
                                  : 'text-rose-300'
                            }`}
                          >
                            Energía: {step.powerState}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white mt-1">{step.title}</h4>
                      </div>

                      <button
                        onClick={() => onToggleStepCompleted(step.id)}
                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition whitespace-nowrap shrink-0 ${
                          isDone
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-[#0B1120] border-slate-700 text-slate-200 hover:border-emerald-500'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {isDone ? 'Paso completado' : 'Marcar como hecho'}
                      </button>
                    </div>

                    {simpleMode && (
                      <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/40 p-3 text-xs text-emerald-100">
                        <strong>Como para un niño:</strong> {step.simpleExplanation}
                      </div>
                    )}

                    {/* 1) Qué necesitas en la mesa */}
                    <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3.5 text-xs">
                      <div className="font-semibold text-slate-300 mb-1.5">
                        1. Qué necesitas en la mesa (piezas y herramientas exactas):
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {step.tableItems.map((ti, idx) => (
                          <span key={idx} className="text-slate-200">
                            <strong className="font-mono text-emerald-300">{ti.qty}×</strong> {ti.item}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 2-5) Acción, origen/destino, jumper, color, coordenada + diagrama con resalte */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                      <div className="lg:col-span-2 rounded-lg bg-[#0B1120] border border-slate-800 p-4 space-y-2.5 text-xs">
                        <div>
                          <span className="font-semibold text-sky-300">2. Acción exacta: </span>
                          <span className="text-white leading-relaxed">{step.actionSentence}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <div>
                            <span className="text-slate-400">Origen: </span>
                            <span className="font-mono text-slate-200">{step.origin}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Destino: </span>
                            <span className="font-mono text-slate-200">{step.destination}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Tipo de jumper/cable: </span>
                            <span className="font-mono text-amber-300">{step.jumperType}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Color: </span>
                            <span className="text-slate-200">{step.wireColor}</span>
                          </div>
                          {step.breadboardCoord && (
                            <div className="sm:col-span-2">
                              <span className="text-slate-400">Dónde exactamente en protoboard: </span>
                              <span className="font-mono font-bold text-emerald-300">
                                {step.breadboardCoord}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <StepContextDiagram step={step} stageCode={stage.code} />
                    </div>

                    {/* 6) Prueba al terminar */}
                    <div className="rounded-lg bg-[#0B1120] border border-sky-500/30 p-4 text-xs space-y-1.5">
                      <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>3. Prueba al terminar (multímetro):</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <span className="text-slate-400">Dónde poner puntas: </span>
                          <span className="text-slate-200">{step.multimeterTest.probes}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Escala del multímetro: </span>
                          <span className="font-mono text-amber-300">{step.multimeterTest.scale}</span>
                        </div>
                        <div className="md:col-span-2">
                          <span className="text-slate-400">Valor esperado (± tolerancia): </span>
                          <span className="font-mono font-semibold text-emerald-300">
                            {step.multimeterTest.expected}
                          </span>
                        </div>
                        <div className="md:col-span-2 text-amber-200">
                          <strong>Si no da, haz esto: </strong>
                          {step.multimeterTest.ifFails}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: PROTOBOARDS P1 Y P2 (1-63, a-e / f-j) */}
      {viewMode === 'protoboards' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Mapa Exacto de Ambas Protoboards (P1 y P2 · 830 Puntos · Columnas 1–63, Filas a–e y f–j)
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  En cada columna (1–63), los 5 huequitos <strong>a–e</strong> están unidos por debajo entre sí, y los 5 huequitos <strong>f–j</strong> están unidos aparte (el canal central los separa).{' '}
                  <strong>P1:</strong> Riel R1 = GND común (−), Riel R2 = +5 V.{' '}
                  <strong>P2:</strong> Riel R1 = GND común (−), Riel R3 = +3,3 V.{' '}
                  <strong>R2 y R3 nunca se tocan.</strong>
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {[
                  { id: 'ALL', label: 'Ver todo' },
                  { id: 'GND_BRIDGE', label: 'Puente P1(R1)↔P2(R1)' },
                  { id: 'DIV1', label: 'Div #1 (5–14)' },
                  { id: 'DIV2', label: 'Div #2 (17–26)' },
                  { id: 'DIV3', label: 'Div #3 (29–38)' },
                  { id: 'DIV4', label: 'Div #4 (41–50)' },
                  { id: 'HOME', label: 'HOME (53–55)' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedRegion(f.id as typeof selectedRegion)}
                    className={`px-2.5 py-1 rounded-md border font-mono transition ${
                      selectedRegion === f.id
                        ? 'bg-emerald-600 border-emerald-500 text-white font-semibold'
                        : 'bg-[#0B1120] border-slate-700 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {simpleMode && (
              <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/40 p-3 text-xs text-emerald-100">
                <strong>Explicación sencilla:</strong> piensa en cada columna como un edificio de 5 pisos (letras a, b, c, d, e) con ascensor interno: todo lo que conectes en la misma columna y del mismo lado del canal se toca por dentro sin necesidad de soldar.
              </div>
            )}

            {/* SVG interactivo de Protoboard P1 + Puente negro + Protoboard P2 */}
            <div className="rounded-xl bg-[#070B14] border border-slate-800 p-3 overflow-x-auto">
              <svg viewBox="0 0 980 430" className="w-full min-w-[780px] h-auto select-none">
                {/* PROTOBOARD P1 */}
                <g>
                  <rect x="20" y="18" width="940" height="165" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="1.8" />
                  <text x="32" y="34" fill="#f8fafc" fontSize="11" fontWeight="700">
                    PROTOBOARD P1 (830 pts) — Riel R1 = GND común (−) · Riel R2 = +5 V
                  </text>

                  {/* Riel superior R1 GND */}
                  <rect
                    x="35"
                    y="42"
                    width="910"
                    height="20"
                    rx="3"
                    fill="#0b1120"
                    stroke={selectedRegion === 'GND_BRIDGE' || selectedRegion === 'ALL' ? '#38bdf8' : '#334155'}
                    strokeWidth={selectedRegion === 'GND_BRIDGE' ? '2.4' : '1.4'}
                  />
                  <line x1="45" y1="52" x2="935" y2="52" stroke="#3b82f6" strokeWidth="2" />
                  <text x="45" y="49" fill="#93c5fd" fontSize="8.5" fontWeight="700">
                    P1 R1 (−) GND COMÚN: Fuente 5V(−), Fuente 12V(−), L298N GND, Shield GND, UNO GND, LCD/Pot2/Buzzers/US-H/V/Hall GND
                  </text>

                  {/* Regla interna columnas 1..63 */}
                  <rect x="35" y="68" width="910" height="32" rx="3" fill="#1e293b" stroke="#334155" />
                  <text x="490" y="87" textAnchor="middle" fill="#cbd5e1" fontSize="9.5">
                    Filas a–e (Cols 1–63): Empalmes libres de distribución 5 V y GND · Canal central aislante (separa a–e de f–j)
                  </text>
                  <rect x="35" y="106" width="910" height="32" rx="3" fill="#1e293b" stroke="#334155" />
                  <text x="490" y="125" textAnchor="middle" fill="#94a3b8" fontSize="9.5">
                    Filas f–j (Cols 1–63): Reserva para puentes ordenados de P1 (cada columna 1..63 une f-g-h-i-j verticalmente)
                  </text>

                  {/* Riel inferior R2 +5V */}
                  <rect x="35" y="145" width="910" height="24" rx="3" fill="#2b0d12" stroke="#ef4444" strokeWidth="1.6" />
                  <line x1="45" y1="157" x2="935" y2="157" stroke="#ef4444" strokeWidth="2.2" />
                  <text x="45" y="154" fill="#fca5a5" fontSize="8.5" fontWeight="700">
                    P1 R2 (+) +5 V DC: Fuente 5V(+), UNO 5V, L298N +5V, ESP32 VIN, LCD VCC, Pot2, Buzzers +, US-H/V VCC, Hall +
                  </text>
                </g>

                {/* JUMPER NEGRO OBLIGATORIO P1(R1) <-> P2(R1) */}
                <g opacity={selectedRegion === 'ALL' || selectedRegion === 'GND_BRIDGE' ? 1 : 0.35}>
                  <path
                    d="M 920 52 C 970 52, 970 237, 920 237"
                    fill="none"
                    stroke="#020617"
                    strokeWidth="7"
                  />
                  <path
                    d="M 920 52 C 970 52, 970 237, 920 237"
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="2.5"
                    strokeDasharray="6 3"
                  />
                  <circle cx="920" cy="52" r="4.5" fill="#38bdf8" />
                  <circle cx="920" cy="237" r="4.5" fill="#38bdf8" />
                  <rect x="705" y="191" width="236" height="20" rx="4" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                  <text x="823" y="204" textAnchor="middle" fill="#7dd3fc" fontSize="8.8" fontWeight="700">
                    1 JUMPER NEGRO: P1(R1 −) ↔ P2(R1 −) (Masa única)
                  </text>
                </g>

                {/* Aviso R2 y R3 nunca se tocan */}
                <rect x="35" y="191" width="350" height="20" rx="4" fill="#3b0712" stroke="#f43f5e" />
                <text x="210" y="204" textAnchor="middle" fill="#fecdd3" fontSize="8.5" fontWeight="700">
                  PROHIBIDO UNIR R2 (+5 V de P1) CON R3 (+3,3 V de P2) — NUNCA SE TOCAN
                </text>

                {/* PROTOBOARD P2 */}
                <g>
                  <rect x="20" y="218" width="940" height="200" rx="8" fill="#0f172a" stroke="#475569" strokeWidth="1.8" />
                  <text x="32" y="234" fill="#f8fafc" fontSize="11" fontWeight="700">
                    PROTOBOARD P2 (830 pts) — Riel R1 = GND (−) · Riel R3 = +3,3 V · 4 Divisores (12×1 kΩ) + Pull-up HOME (1×1 kΩ)
                  </text>

                  {/* P2 Riel R1 GND */}
                  <rect
                    x="35"
                    y="241"
                    width="910"
                    height="20"
                    rx="3"
                    fill="#0b1120"
                    stroke={selectedRegion === 'GND_BRIDGE' || selectedRegion === 'ALL' ? '#38bdf8' : '#334155'}
                    strokeWidth={selectedRegion === 'GND_BRIDGE' ? '2.4' : '1.4'}
                  />
                  <line x1="45" y1="251" x2="935" y2="251" stroke="#3b82f6" strokeWidth="2" />
                  <text x="45" y="248" fill="#93c5fd" fontSize="8.5" fontWeight="700">
                    P2 R1 (−) GND: ESP32 GND · Divisores #1–#4 GND (cols 14, 26, 38, 50) · OLED A/B · Pot1 · 3×FC-33 · HOME · PARO
                  </text>

                  {/* Regla numérica columnas 1..63 */}
                  {[1, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35, 38, 41, 44, 47, 50, 53, 55, 63].map((col) => {
                    const cx = 42 + ((col - 1) / 62) * 890;
                    return (
                      <g key={col}>
                        <line x1={cx} y1="266" x2={cx} y2="380" stroke="#1e293b" strokeWidth="1" />
                        <text x={cx} y="274" textAnchor="middle" fill="#64748b" fontSize="7.5" fontFamily="monospace">
                          {col}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bloques de Divisores y Pull-up en Filas a-e */}
                  {[
                    { key: 'DIV1', cStart: 5, cEnd: 14, title: 'DIV #1 (c=5)', sub: 'ECHO-H→D23', colNode: 8 },
                    { key: 'DIV2', cStart: 17, cEnd: 26, title: 'DIV #2 (c=17)', sub: 'ECHO-V→D18', colNode: 20 },
                    { key: 'DIV3', cStart: 29, cEnd: 38, title: 'DIV #3 (c=29)', sub: 'UNO A1→D2*', colNode: 32 },
                    { key: 'DIV4', cStart: 41, cEnd: 50, title: 'DIV #4 (c=41)', sub: 'Hall S→D33', colNode: 44 },
                    { key: 'HOME', cStart: 53, cEnd: 56, title: 'HOME (53–55)', sub: '1kΩ→D39', colNode: 55 },
                  ].map((b) => {
                    const x1 = 42 + ((b.cStart - 1) / 62) * 890 - 8;
                    const x2 = 42 + ((b.cEnd - 1) / 62) * 890 + 8;
                    const xNode = 42 + ((b.colNode - 1) / 62) * 890;
                    const active = selectedRegion === 'ALL' || selectedRegion === b.key;
                    return (
                      <g key={b.key} opacity={active ? 1 : 0.25}>
                        <rect
                          x={x1}
                          y="280"
                          width={x2 - x1}
                          height="50"
                          rx="4"
                          fill={b.key === 'HOME' ? '#1e1b4b' : '#064e3b'}
                          stroke={b.key === 'HOME' ? '#a855f7' : '#10b981'}
                          strokeWidth="1.6"
                        />
                        <text x={(x1 + x2) / 2} y="297" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="700">
                          {b.title}
                        </text>
                        <text x={(x1 + x2) / 2} y="310" textAnchor="middle" fill="#a7f3d0" fontSize="7.3">
                          {b.sub}
                        </text>
                        <circle cx={xNode} cy="322" r="3" fill="#fde047" />
                        <text x={xNode} y="340" textAnchor="middle" fill="#fde047" fontSize="6.8" fontFamily="monospace">
                          nodo {b.colNode}
                        </text>
                      </g>
                    );
                  })}

                  {/* Canal central + Filas f-j */}
                  <line x1="35" y1="346" x2="945" y2="346" stroke="#334155" strokeWidth="3" />
                  <text x="38" y="343" fill="#64748b" fontSize="7">
                    Filas a–e arriba
                  </text>
                  <text x="38" y="357" fill="#64748b" fontSize="7">
                    Filas f–j abajo
                  </text>
                  <rect x="650" y="352" width="285" height="28" rx="4" fill="#1e293b" stroke="#38bdf8" />
                  <text x="792" y="369" textAnchor="middle" fill="#bae6fd" fontSize="8.5" fontWeight="600">
                    Cols 48–62 (f–j) y área libre para montaje ESP32 DevKit 30 pines
                  </text>

                  {/* P2 Riel R3 +3.3V */}
                  <rect x="35" y="386" width="910" height="24" rx="3" fill="#2d1706" stroke="#f97316" strokeWidth="1.6" />
                  <line x1="45" y1="398" x2="935" y2="398" stroke="#f97316" strokeWidth="2.2" />
                  <text x="45" y="395" fill="#fed7aa" fontSize="8.5" fontWeight="700">
                    P2 R3 (+) +3,3 V DC: ESP32 3V3 · 3 × FC-33 VCC · OLED A y OLED B VCC · Pot 1 extremo · Pull-up HOME col 53
                  </text>
                </g>
              </svg>
            </div>
          </div>

          {/* Tabla obligatoria: Qué hay en cada columna */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-3">
            <h3 className="text-base font-bold text-white">
              Tabla de Protoboards: «Qué hay en cada columna» (P1 y P2)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-800">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#0B1120] text-slate-400">
                  <tr>
                    <th className="py-2 px-3">Placa</th>
                    <th className="py-2 px-3">Columnas / Riel</th>
                    <th className="py-2 px-3">Sección</th>
                    <th className="py-2 px-3">Red eléctrica</th>
                    <th className="py-2 px-3">Qué hay conectado exactamente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 tabular-nums">
                  {BREADBOARD_LAYOUT.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/60 text-slate-200">
                      <td className="py-2 px-3 font-mono font-bold text-sky-300">{row.board}</td>
                      <td className="py-2 px-3 font-mono text-emerald-300 whitespace-nowrap">{row.columnRange}</td>
                      <td className="py-2 px-3 text-slate-400">{row.section}</td>
                      <td className="py-2 px-3 font-mono text-amber-300">{row.netName}</td>
                      <td className="py-2 px-3">{row.occupiedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 3: DIVISORES DE TENSIÓN Y PULL-UP HOME (13 x 1 kΩ) */}
      {viewMode === 'dividers' && (
        <div className="space-y-6">
          {/* Explicación en 3 líneas + fórmula + explicación de nodo + código de colores 1 kΩ */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-center">
              <div className="lg:col-span-2 space-y-2.5 text-xs text-slate-200 leading-relaxed">
                <h3 className="text-lg font-bold text-white">
                  Divisores de Tensión y Pull-up HOME (Total: 13 resistencias de 1 kΩ)
                </h3>
                <p>
                  <strong>1. Qué hace:</strong> baja una señal de <strong>5 V</strong> a{' '}
                  <strong>3,33 V</strong> para proteger los pines del ESP32 (que solo aguantan 3,3 V).
                </p>
                <p>
                  <strong>2. Fórmula exacta:</strong>{' '}
                  <code className="font-mono text-emerald-300 bg-[#0B1120] px-2 py-0.5 rounded">
                    Vout = Vin × R2 ÷ (R1 + R2) = 5 × 2 ÷ (1 + 2) = 3,33 V
                  </code>{' '}
                  (usando 3 resistencias iguales de 1 kΩ: 1 arriba = R1, y 2 en serie abajo = R2 = 2 kΩ).
                </p>
                <p>
                  <strong>3. Qué es un «nodo»:</strong> es la columna exacta donde se tocan las dos
                  resistencias y el cable hacia el pin del ESP32; en nuestra plantilla siempre es la
                  columna <strong className="font-mono text-amber-300">(c + 3)</strong>.
                </p>
              </div>

              {/* Dibujo del código de colores 1 kΩ */}
              <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-4 text-xs space-y-2">
                <div className="font-semibold text-amber-300">
                  Cómo reconocer las 13 resistencias de 1 kΩ
                </div>
                <svg viewBox="0 0 240 60" className="w-full h-auto">
                  <line x1="15" y1="30" x2="60" y2="30" stroke="#94a3b8" strokeWidth="3" />
                  <line x1="180" y1="30" x2="225" y2="30" stroke="#94a3b8" strokeWidth="3" />
                  <rect x="60" y="16" width="120" height="28" rx="8" fill="#d6b384" stroke="#92400e" strokeWidth="1.5" />
                  <rect x="78" y="16" width="10" height="28" fill="#78350f" />
                  <rect x="100" y="16" width="10" height="28" fill="#020617" />
                  <rect x="122" y="16" width="10" height="28" fill="#dc2626" />
                  <rect x="155" y="16" width="10" height="28" fill="#eab308" />
                </svg>
                <div className="text-[11px] text-slate-300 font-mono text-center">
                  marrón · negro · rojo · dorado (≈ 0,95–1,05 kΩ)
                </div>
                <div className="text-[11px] text-slate-400 text-center">
                  12 en 4 divisores (3 c/u) + 1 en pull-up HOME = <strong>13 unidades</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Los 4 divisores con dibujo SVG exacto + pasos 1..6 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {VOLTAGE_DIVIDERS.map((div) => (
              <div
                key={div.id}
                className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white">{div.name}</h4>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/40">
                    c = {div.startColumn}
                  </span>
                </div>

                <DividerSchematicSvg spec={div} />

                <ol className="space-y-1.5 text-xs">
                  {div.steps.map((st) => (
                    <li
                      key={st.stepNumber}
                      className="rounded bg-[#0B1120] border border-slate-800/80 px-3 py-1.5 flex flex-wrap justify-between gap-2"
                    >
                      <span>
                        <strong className="text-sky-300 font-mono">{st.stepNumber}.</strong>{' '}
                        <strong className="text-white">{st.part}:</strong>{' '}
                        <span className="font-mono text-emerald-300">
                          {st.fromCoord} → {st.toCoord}
                        </span>
                      </span>
                      <span className="text-slate-400 text-[11px]">{st.note}</span>
                    </li>
                  ))}
                </ol>

                <div className="rounded-lg bg-sky-950/30 border border-sky-500/30 p-2.5 text-xs text-sky-200">
                  <strong>Prueba obligatoria antes de conectar {div.esp32Pin}:</strong> medir{' '}
                  <span className="font-mono font-bold">{div.expectedTestVoltage}</span> en P2 (
                  {div.startColumn + 3}, c).
                </div>
              </div>
            ))}
          </div>

          {/* Bloque dedicado Pull-up HOME (cols 53-55) */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-3">
            <h4 className="text-base font-bold text-white">
              Resistencia #13: Pull-up Externo del Pulsador HOME (P2 columnas 53–55 → ESP32 D39)
            </h4>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center text-xs">
              <svg viewBox="0 0 360 115" className="w-full h-auto bg-[#070B14] rounded-lg border border-slate-800">
                <rect x="12" y="20" width="90" height="24" rx="4" fill="#2d1706" stroke="#f97316" />
                <text x="57" y="35" textAnchor="middle" fill="#fed7aa" fontSize="8" fontWeight="700">
                  P2 R3 (+3,3 V)
                </text>
                <line x1="102" y1="32" x2="128" y2="32" stroke="#f97316" strokeWidth="2" />
                <text x="128" y="18" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">
                  (53, a)
                </text>
                <rect x="128" y="23" width="68" height="18" rx="3" fill="#78350f" stroke="#f59e0b" />
                <text x="162" y="35" textAnchor="middle" fill="#fef3c7" fontSize="8" fontWeight="700">
                  R #13: 1 kΩ
                </text>
                <text x="162" y="51" textAnchor="middle" fill="#94a3b8" fontSize="7" fontFamily="monospace">
                  (53,b) → (55,b)
                </text>
                <line x1="196" y1="32" x2="225" y2="32" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="225" cy="32" r="5" fill="#a855f7" stroke="#fff" />
                <line x1="230" y1="32" x2="262" y2="32" stroke="#38bdf8" strokeWidth="2" />
                <rect x="262" y="18" width="86" height="26" rx="4" fill="#064e3b" stroke="#10b981" />
                <text x="305" y="30" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="700">
                  ESP32 D39 (VN)
                </text>
                <text x="305" y="40" textAnchor="middle" fill="#a7f3d0" fontSize="6.8" fontFamily="monospace">
                  desde (55, a)
                </text>
                <line x1="225" y1="37" x2="225" y2="70" stroke="#38bdf8" strokeWidth="2" />
                <rect x="170" y="70" width="110" height="24" rx="4" fill="#0f172a" stroke="#a855f7" />
                <text x="225" y="85" textAnchor="middle" fill="#e9d5ff" fontSize="8" fontWeight="700">
                  (55, c) → HOME → P2 R1 (GND)
                </text>
              </svg>

              <div className="space-y-2 text-slate-200 leading-relaxed">
                <p>
                  El pin <strong className="font-mono text-sky-300">D39 (VN)</strong> es solo entrada
                  y no tiene resistencia pull-up interna en el chip ESP32. Por eso conectamos la
                  resistencia #13 entre <span className="font-mono text-emerald-300">(53,b)</span> y{' '}
                  <span className="font-mono text-emerald-300">(55,b)</span>.
                </p>
                <p>
                  Cuando el tope mecánico de la grúa NO está en 0°, D39 lee{' '}
                  <strong className="text-emerald-300">3,3 V (HIGH)</strong>; al tocar 0° y oprimir
                  HOME, D39 pasa limpio a <strong className="text-amber-300">0 V (LOW)</strong>.
                </p>
                <p className="text-rose-300">
                  <strong>Recordatorio clave:</strong> en cambio, el botón <strong>PARO (D12)</strong>{' '}
                  NO lleva ninguna resistencia externa (solo pull-up interna por software).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 4: CABLES, ETIQUETAS Y TRENZADO POR TRAMO */}
      {viewMode === 'harness' && (
        <div className="space-y-6">
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-3">
            <h3 className="text-lg font-bold text-white">
              Etiquetas Fijas, Código de Colores y Qué Cables se Trenzan Juntos
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Para no confundir los 22 cables del Tramo A (mástil) ni los 9 del Tramo B (pluma/gancho),
              pega una etiqueta corta en ambos extremos de cada hilo y agrúpalos por tramo separando
              potencia de señales siempre que sea posible.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="rounded-lg bg-[#0B1120] border border-emerald-500/30 p-4 space-y-1">
                <div className="font-bold text-emerald-300">Trenza 1 — Potencia (10 hilos)</div>
                <p className="text-slate-300">
                  Cables verdes AWG 20-22: 5 pares para Cabrestante, Giro, Carro, Electroimán y
                  Bombillo. Se trenzan cada par entre sí (ida y retorno) para reducir ruido electromagnético.
                </p>
              </div>
              <div className="rounded-lg bg-[#0B1120] border border-sky-500/30 p-4 space-y-1">
                <div className="font-bold text-sky-300">Trenza 2 — Señales (9 hilos Tramo A)</div>
                <p className="text-slate-300">
                  Cables azules: 3×FC-33, HOME, Hall S, TRIG/ECHO US-H y TRIG/ECHO US-V. Agrupados en
                  un haz paralelo separado de los pares de motores dentro del mástil.
                </p>
              </div>
              <div className="rounded-lg bg-[#0B1120] border border-amber-500/30 p-4 space-y-1">
                <div className="font-bold text-amber-300">Trenza 3 — Comunes + Tramo B (9 hilos)</div>
                <p className="text-slate-300">
                  3 comunes de Tramo A (GND negro, +3,3 V naranja, +5 V rojo) hasta bornera Z3; desde
                  Z3 salen 9 hilos flexibles de Tramo B (3 Hall Z5 + 2 imán Z6 + 4 US-V Z6).
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
              <h4 className="text-sm font-bold text-white">
                Tramo A (Caja Z1 → Bornera Cabeza Z3): {tramoA.length} hilos
              </h4>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#0B1120] text-slate-400">
                    <tr>
                      <th className="py-1.5 px-2">Etiqueta</th>
                      <th className="py-1.5 px-2">Grupo</th>
                      <th className="py-1.5 px-2">Color</th>
                      <th className="py-1.5 px-2">Origen → Destino</th>
                      <th className="py-1.5 px-2 text-right">Largo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 tabular-nums text-slate-200">
                    {tramoA.map((c) => (
                      <tr key={c.index}>
                        <td className="py-1.5 px-2 font-mono font-bold text-sky-300">{c.shortLabel}</td>
                        <td className="py-1.5 px-2">{c.group}</td>
                        <td className="py-1.5 px-2">{c.color}</td>
                        <td className="py-1.5 px-2 text-[11px]">
                          {c.origin} → {c.destination}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-300">
                          {baseTramoACm !== null ? `${baseTramoACm + c.extraLengthCm} cm` : 'POR CONFIRMAR'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
              <h4 className="text-sm font-bold text-white">
                Tramo B (Bornera Z3 → Carro Z5 y Gancho Z6): {tramoB.length} hilos
              </h4>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#0B1120] text-slate-400">
                    <tr>
                      <th className="py-1.5 px-2">Etiqueta</th>
                      <th className="py-1.5 px-2">Grupo</th>
                      <th className="py-1.5 px-2">Color</th>
                      <th className="py-1.5 px-2">Origen → Destino</th>
                      <th className="py-1.5 px-2 text-right">Largo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 tabular-nums text-slate-200">
                    {tramoB.map((c) => (
                      <tr key={c.index}>
                        <td className="py-1.5 px-2 font-mono font-bold text-violet-300">{c.shortLabel}</td>
                        <td className="py-1.5 px-2">{c.group}</td>
                        <td className="py-1.5 px-2">{c.color}</td>
                        <td className="py-1.5 px-2 text-[11px]">
                          {c.origin} → {c.destination}
                        </td>
                        <td className="py-1.5 px-2 text-right font-mono text-emerald-300">
                          {c.extraLengthCm} cm
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 5: GLOSARIO SENCILLO */}
      {viewMode === 'glossary' && (
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <span>Glosario Sencillo de Electrónica (para principiantes)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {GLOSSARY_ITEMS.map((g) => (
              <div key={g.term} className="rounded-lg bg-[#0B1120] border border-slate-800 p-4 space-y-1.5">
                <div className="text-sm font-bold text-sky-300">{g.term}</div>
                <p className="text-slate-200 leading-relaxed">{g.simpleExplanation}</p>
                <p className="text-emerald-300">
                  <strong>En tu grúa:</strong> {g.exampleInCrane}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA 6: ERRORES COMUNES */}
      {viewMode === 'errors' && (
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-4">
          <h3 className="text-lg font-bold text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            <span>Lista de Errores Comunes y Cómo Evitarlos</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {COMMON_ERRORS.map((err) => (
              <div key={err.id} className="rounded-lg bg-[#0B1120] border border-slate-800 p-4 space-y-1.5">
                <div className="text-sm font-bold text-white">{err.title}</div>
                <p className="text-rose-300">
                  <strong>Qué pasa si ocurre:</strong> {err.consequence}
                </p>
                <p className="text-emerald-300">
                  <strong>Cómo prevenirlo:</strong> {err.prevention}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
