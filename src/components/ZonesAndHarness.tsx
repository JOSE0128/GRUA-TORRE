import React, { useState } from 'react';
import {
  COMPONENT_DIMENSIONS_TABLE,
  CONTROL_BOX_FIT_ITEMS,
  HEAD_Z3_FIT_ITEMS,
  ZONES,
} from '../data/craneData';
import { HarnessConductor, UserEditableParams, ZoneId } from '../types/crane';
import { StatusChip } from './StatusChip';

interface ZonesAndHarnessProps {
  params: UserEditableParams;
  conductors: HarnessConductor[];
  onUpdateParams: (next: Partial<UserEditableParams>) => void;
  onUpdateConductorLength: (index: number, extraLengthCm: number) => void;
}

export const ZonesAndHarness: React.FC<ZonesAndHarnessProps> = ({
  params,
  conductors,
  onUpdateParams,
  onUpdateConductorLength,
}) => {
  const [selectedZone, setSelectedZone] = useState<ZoneId>('Z1');
  const [simAngleDeg, setSimAngleDeg] = useState<number>(0);
  const [simpleMode, setSimpleMode] = useState<boolean>(false);

  const activeZone = ZONES.find((z) => z.id === selectedZone) || ZONES[0];

  const tramoA = conductors.filter((c) => c.tramo === 'Tramo A (Caja -> Cabeza)');
  const tramoB = conductors.filter((c) => c.tramo === 'Tramo B (Cabeza -> Carro/Gancho)');

  const baseTramoACm =
    params.mastHeightCm !== null ? params.mastHeightCm + params.rizoReserveCm + 30 : null;

  // Rizo visual tightness factor from 0° to 360°
  const turnFactor = 1.5 + simAngleDeg / 360;

  return (
    <div className="space-y-8">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl bg-[#0F172A] border border-slate-800 p-5">
        <div>
          <h2 className="text-xl font-bold text-white">
            Plano de Zonas (Z1–Z8), Manguera del Mástil y Rizo de Giro
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Haz clic en cualquier zona del plano lateral para inspeccionar sus componentes y
            recorrido de cables. Toda la electrónica va en la caja Z1 separada, nunca en la contrapluma.
          </p>
        </div>
        <button
          onClick={() => setSimpleMode((v) => !v)}
          className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition whitespace-nowrap shrink-0 ${
            simpleMode
              ? 'bg-emerald-600 border-emerald-500 text-white'
              : 'bg-[#0B1120] border-slate-700 text-slate-200 hover:border-slate-500'
          }`}
        >
          {simpleMode ? 'Explicación sencilla: ACTIVADA' : 'Modo Explicación sencilla'}
        </button>
      </div>

      {simpleMode && (
        <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/40 p-4 text-sm text-emerald-100 leading-relaxed">
          <strong>Explicación sencilla:</strong> imagina la grúa como un edificio con 8 habitaciones
          numeradas de Z1 a Z8. Todos los cerebros y botones viven seguros en una caja aparte (Z1)
          sobre la tabla, y un tubo largo con 22 cables de colores sube por dentro de la torre (Z2)
          hasta arriba (Z3). Como la grúa no tiene un anillo mágico para dar vueltas infinitas, arriba
          dejamos una espiral de cable suelta (el <em>rizo</em>) para que pueda girar una vuelta
          completa (0° a 360°) sin arrancarse.
        </div>
      )}

      {/* Plano lateral SVG Z1–Z8 + Inspector de zona */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-200">
              Vista lateral esquemática (Z1–Z8, manguera interna y rizo)
            </span>
            <span>Clic en cada etiqueta Z1..Z8</span>
          </div>
          <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-2 overflow-x-auto">
            <svg viewBox="0 0 880 470" className="w-full min-w-[680px] h-auto select-none">
              <defs>
                <marker id="arrowBlue" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#38bdf8" />
                </marker>
                <marker id="arrowGreen" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#34d399" />
                </marker>
              </defs>

              {/* Tabla base */}
              <rect x="20" y="410" width="840" height="24" rx="4" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
              <text x="440" y="426" textAnchor="middle" fill="#94a3b8" fontSize="11">
                TABLA BASE DE LA MAQUETA
              </text>

              {/* Z1: Caja de control separada sobre la tabla base */}
              <g onClick={() => setSelectedZone('Z1')} className="cursor-pointer">
                <rect
                  x="35"
                  y="320"
                  width="175"
                  height="90"
                  rx="6"
                  fill={selectedZone === 'Z1' ? '#064e3b' : '#0f172a'}
                  stroke={selectedZone === 'Z1' ? '#34d399' : '#38bdf8'}
                  strokeWidth="2"
                />
                <text x="122" y="344" textAnchor="middle" fill="#f8fafc" fontSize="12" fontWeight="700">
                  Z1. CAJA DE CONTROL
                </text>
                <text x="122" y="361" textAnchor="middle" fill="#cbd5e1" fontSize="10">
                  ESP32 · UNO+Shield · L298N
                </text>
                <text x="122" y="376" textAnchor="middle" fill="#cbd5e1" fontSize="10">
                  P1/P2 · Divisores · Fuentes
                </text>
                <rect x="52" y="386" width="140" height="14" rx="2" fill="#1e293b" stroke="#64748b" />
                <text x="122" y="396" textAnchor="middle" fill="#93c5fd" fontSize="9">
                  Tapa: LCD + OLED A/B + Botones + Pots
                </text>
              </g>

              {/* Z2: Base fija y mástil hueco */}
              <g onClick={() => setSelectedZone('Z2')} className="cursor-pointer">
                <rect x="330" y="390" width="90" height="20" rx="2" fill="#334155" stroke="#64748b" />
                <rect
                  x="355"
                  y="140"
                  width="40"
                  height="250"
                  fill={selectedZone === 'Z2' ? '#1e3a5f' : '#1e293b'}
                  stroke={selectedZone === 'Z2' ? '#38bdf8' : '#64748b'}
                  strokeWidth="2"
                />
                {/* Manguera 22 hilos desde Z1 por base hacia interior del mástil */}
                <path
                  d="M210,365 L370,365 L370,130"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="4"
                  strokeDasharray="6 3"
                />
                <text x="285" y="357" textAnchor="middle" fill="#4ade80" fontSize="10" fontWeight="600">
                  Tramo A (22 hilos)
                </text>
                <text x="415" y="270" fill="#e2e8f0" fontSize="11" fontWeight="700">
                  Z2. Mástil hueco
                </text>
                <text x="415" y="285" fill="#94a3b8" fontSize="9.5">
                  Tope fijo θ = 0° (HOME)
                </text>
              </g>

              {/* Rizo en la unión Z2 -> Z3 */}
              <g onClick={() => setSelectedZone('Z2')} className="cursor-pointer">
                <ellipse cx="375" cy="128" rx="26" ry="11" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
                <ellipse cx="375" cy="120" rx="22" ry="9" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
                <text x="425" y="126" fill="#fbbf24" fontSize="10" fontWeight="700">
                  Rizo (≥ 1,5 vueltas, ≥ 40 cm)
                </text>
              </g>

              {/* Z3: Cabeza giratoria (0-360°) */}
              <g onClick={() => setSelectedZone('Z3')} className="cursor-pointer">
                <rect
                  x="332"
                  y="74"
                  width="86"
                  height="42"
                  rx="4"
                  fill={selectedZone === 'Z3' ? '#064e3b' : '#0f172a'}
                  stroke={selectedZone === 'Z3' ? '#34d399' : '#94a3b8'}
                  strokeWidth="2"
                />
                <text x="375" y="92" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700">
                  Z3. CABEZA
                </text>
                <text x="375" y="106" textAnchor="middle" fill="#cbd5e1" fontSize="9">
                  3 motores + 3 FC-33 + US-H + Bornera
                </text>
              </g>

              {/* Z8: Corona (punto más alto) */}
              <g onClick={() => setSelectedZone('Z8')} className="cursor-pointer">
                <polygon points="375,20 342,74 408,74" fill="none" stroke="#94a3b8" strokeWidth="2" />
                <circle
                  cx="375"
                  cy="16"
                  r="9"
                  fill={selectedZone === 'Z8' ? '#fde047' : '#facc15'}
                  stroke="#f97316"
                  strokeWidth="2"
                />
                <text x="415" y="25" fill="#fde047" fontSize="11" fontWeight="700">
                  Z8. Corona (Bombillo M3)
                </text>
              </g>

              {/* Z4: Pluma y Contrapluma */}
              <g onClick={() => setSelectedZone('Z4')} className="cursor-pointer">
                {/* Contrapluma izquierda */}
                <rect
                  x="195"
                  y="78"
                  width="137"
                  height="20"
                  fill={selectedZone === 'Z4' ? '#1e3a5f' : '#1e293b'}
                  stroke={selectedZone === 'Z4' ? '#38bdf8' : '#64748b'}
                  strokeWidth="1.5"
                />
                <rect x="210" y="98" width="44" height="24" rx="2" fill="#475569" stroke="#cbd5e1" />
                <text x="232" y="114" textAnchor="middle" fill="#f8fafc" fontSize="9" fontWeight="700">
                  Contrapeso
                </text>
                <text x="200" y="68" fill="#cbd5e1" fontSize="10" fontWeight="600">
                  Z4. Contrapluma (SIN electrónica)
                </text>

                {/* Pluma derecha */}
                <rect
                  x="418"
                  y="78"
                  width="380"
                  height="20"
                  fill={selectedZone === 'Z4' ? '#1e3a5f' : '#1e293b'}
                  stroke={selectedZone === 'Z4' ? '#38bdf8' : '#64748b'}
                  strokeWidth="1.5"
                />
                <text x="615" y="68" textAnchor="middle" fill="#e2e8f0" fontSize="11" fontWeight="700">
                  Z4. Pluma (Lazo de hilo del carro + Tramo B)
                </text>
                {/* Tirantes superiores */}
                <line x1="375" y1="20" x2="225" y2="78" stroke="#64748b" strokeWidth="1.5" />
                <line x1="375" y1="20" x2="730" y2="78" stroke="#64748b" strokeWidth="1.5" />
              </g>

              {/* US-H en raíz de pluma */}
              <rect x="424" y="98" width="22" height="14" fill="#38bdf8" rx="2" />
              <text x="435" y="123" textAnchor="middle" fill="#7dd3fc" fontSize="9">
                US-H
              </text>
              <line
                x1="448"
                y1="105"
                x2="585"
                y2="105"
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="4 3"
                markerEnd="url(#arrowBlue)"
              />

              {/* Z5: Carro */}
              <g onClick={() => setSelectedZone('Z5')} className="cursor-pointer">
                <rect
                  x="590"
                  y="92"
                  width="64"
                  height="26"
                  rx="4"
                  fill={selectedZone === 'Z5' ? '#064e3b' : '#0f172a'}
                  stroke={selectedZone === 'Z5' ? '#34d399' : '#38bdf8'}
                  strokeWidth="2"
                />
                {/* Placa reflectora plana */}
                <rect x="586" y="94" width="4" height="22" fill="#e2e8f0" />
                <text x="622" y="109" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="700">
                  Z5. Carro
                </text>
                <text x="622" y="132" textAnchor="middle" fill="#93c5fd" fontSize="9">
                  Reflector + Hall KY-003
                </text>
                {/* Tramo B hacia carro/gancho */}
                <path d="M418,100 Q505,118 590,104" fill="none" stroke="#a855f7" strokeWidth="2" />
                <text x="515" y="128" textAnchor="middle" fill="#c084fc" fontSize="9">
                  Tramo B (9 hilos)
                </text>
              </g>

              {/* Hilo del gancho + Z6 Bloque del gancho */}
              <line x1="622" y1="118" x2="622" y2="235" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 2" />
              <g onClick={() => setSelectedZone('Z6')} className="cursor-pointer">
                <rect
                  x="594"
                  y="235"
                  width="56"
                  height="42"
                  rx="4"
                  fill={selectedZone === 'Z6' ? '#064e3b' : '#0f172a'}
                  stroke={selectedZone === 'Z6' ? '#34d399' : '#f97316'}
                  strokeWidth="2"
                />
                {/* US-V a 3.5 cm sobre cara y 2.5 cm costado */}
                <rect x="652" y="236" width="16" height="12" rx="2" fill="#38bdf8" />
                <line x1="660" y1="248" x2="660" y2="338" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
                {/* Electroimán abajo */}
                <rect x="604" y="277" width="36" height="10" rx="2" fill="#f97316" />
                {/* Imán pequeño arriba */}
                <rect x="615" y="229" width="14" height="6" rx="1" fill="#f43f5e" />
                <text x="622" y="253" textAnchor="middle" fill="#f8fafc" fontSize="10" fontWeight="700">
                  Z6. Gancho
                </text>
                <text x="622" y="266" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">
                  Electroimán + Imán
                </text>
                <text x="676" y="246" fill="#7dd3fc" fontSize="9">
                  US-V (e=3,5 cm; 2,5 cm lat.)
                </text>
              </g>

              {/* Carga en el suelo con arandela */}
              <rect x="598" y="382" width="48" height="28" rx="2" fill="#334155" stroke="#94a3b8" />
              <rect x="604" y="378" width="36" height="4" fill="#e2e8f0" />
              <text x="622" y="399" textAnchor="middle" fill="#e2e8f0" fontSize="9">
                Carga (≥4 cm)
              </text>

              {/* Z7: Bodega autónoma */}
              <g onClick={() => setSelectedZone('Z7')} className="cursor-pointer">
                <rect
                  x="710"
                  y="374"
                  width="135"
                  height="36"
                  rx="4"
                  fill={selectedZone === 'Z7' ? '#064e3b' : '#0f172a'}
                  stroke={selectedZone === 'Z7' ? '#34d399' : '#eab308'}
                  strokeWidth="2"
                />
                <text x="777" y="390" textAnchor="middle" fill="#fde047" fontSize="11" fontWeight="700">
                  Z7. BODEGA
                </text>
                <text x="777" y="403" textAnchor="middle" fill="#cbd5e1" fontSize="9">
                  Tira LED PIR + Litio (sin cables)
                </text>
              </g>
            </svg>
          </div>
        </div>

        {/* Panel derecho: Detalle de zona + Vista en corte del mástil y rizo */}
        <div className="space-y-5">
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-emerald-400 font-semibold">{activeZone.id}</span>
              <StatusChip status="CONFIRMADO" />
            </div>
            <h3 className="text-base font-bold text-white">{activeZone.name}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{activeZone.description}</p>
            <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3 text-xs text-slate-300 leading-relaxed">
              <div className="font-semibold text-slate-200 mb-1">Qué va aquí:</div>
              {activeZone.componentsSummary}
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {ZONES.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZone(z.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition ${
                    selectedZone === z.id
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-[#0B1120] border border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {z.id}
                </button>
              ))}
            </div>
          </div>

          {/* Vista en corte del mástil y simulador de rizo */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">
              Vista en Corte del Mástil y Comportamiento del Rizo (0°–360°)
            </h3>
            <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-2">
              <svg viewBox="0 0 360 220" className="w-full h-auto">
                {/* Paredes del mástil hueco */}
                <rect x="135" y="75" width="12" height="130" fill="#334155" />
                <rect x="213" y="75" width="12" height="130" fill="#334155" />
                {/* Eje guía fijo ~15 mm */}
                <rect x="172" y="20" width="16" height="90" rx="3" fill="#64748b" />
                <text x="195" y="34" fill="#cbd5e1" fontSize="9">
                  Eje guía ~15 mm
                </text>
                {/* Topes mecánicos 0° y 360° */}
                <rect x="115" y="70" width="14" height="10" fill="#ef4444" />
                <text x="62" y="79" fill="#fca5a5" fontSize="9">
                  Tope 0° (HOME)
                </text>
                <rect x="231" y="70" width="14" height="10" fill="#ef4444" />
                <text x="249" y="79" fill="#fca5a5" fontSize="9">
                  Tope 360°
                </text>

                {/* Manguera subiendo por el interior */}
                <path d="M180,205 L180,105" stroke="#22c55e" strokeWidth="6" />
                {/* Espiral del rizo */}
                {Array.from({ length: Math.round(turnFactor * 2) }).map((_, idx) => {
                  const y = 95 - idx * 12;
                  const rx = 38 - simAngleDeg * 0.03;
                  return (
                    <ellipse
                      key={idx}
                      cx="180"
                      cy={y}
                      rx={rx}
                      ry="6"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3"
                    />
                  );
                })}
                <text x="15" y="195" fill="#94a3b8" fontSize="9.5">
                  R_curva ≥ 5 × Ø_manguera
                </text>
                <text x="15" y="210" fill="#fbbf24" fontSize="9.5">
                  Espiral Ø 6–8 cm · Reserva ≥ 40 cm
                </text>
              </svg>
            </div>
            <label className="block text-xs">
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Simular giro θ de la cabeza:</span>
                <span className="font-mono font-bold text-amber-300 tabular-nums">
                  {simAngleDeg}° ({turnFactor.toFixed(2)} vueltas en rizo)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={360}
                value={simAngleDeg}
                onChange={(e) => setSimAngleDeg(Number(e.target.value))}
                className="w-full accent-amber-400"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Cálculo de longitud de manguera + Corte transversal del mástil hueco (≤ 70 %) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <h3 className="text-base font-bold text-white">
              Cálculo de Longitud de Manguera (Tramo A) y Sección Libre del Mástil
            </h3>
            <StatusChip status={baseTramoACm ? 'CONFIRMADO' : 'POR CONFIRMAR'} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <label className="block">
              <span className="text-slate-300">Altura del mástil (cm)</span>
              <input
                type="number"
                min={1}
                placeholder="POR CONFIRMAR"
                value={params.mastHeightCm ?? ''}
                onChange={(e) =>
                  onUpdateParams({ mastHeightCm: e.target.value ? Number(e.target.value) : null })
                }
                className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-slate-300">Reserva del rizo (≥ 40 cm)</span>
              <input
                type="number"
                min={40}
                value={params.rizoReserveCm}
                onChange={(e) => onUpdateParams({ rizoReserveCm: Number(e.target.value) || 40 })}
                className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-slate-300">Lado interior mástil (≥ 20 mm)</span>
              <input
                type="number"
                min={10}
                value={params.mastInnerSideMm}
                onChange={(e) => onUpdateParams({ mastInnerSideMm: Number(e.target.value) || 28 })}
                className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white tabular-nums"
              />
            </label>
            <label className="block">
              <span className="text-slate-300">Ø haz de 22 hilos (mm)</span>
              <input
                type="number"
                min={6}
                step="0.5"
                value={params.harnessOuterDiameterMm}
                onChange={(e) =>
                  onUpdateParams({ harnessOuterDiameterMm: Number(e.target.value) || 13 })
                }
                className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white tabular-nums"
              />
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs tabular-nums">
            <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3">
              <div className="text-slate-400">Alivio en extremos (15 cm × 2)</div>
              <div className="font-mono font-bold text-slate-100 text-sm mt-0.5">30 cm</div>
            </div>
            <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3">
              <div className="text-slate-400">Longitud base Tramo A</div>
              <div
                className={`font-mono font-bold text-sm mt-0.5 ${
                  baseTramoACm ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {baseTramoACm
                  ? `${baseTramoACm} cm (${params.mastHeightCm} + ${params.rizoReserveCm} + 30)`
                  : 'POR CONFIRMAR'}
              </div>
            </div>
            <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3">
              <div className="text-slate-400">Ocupación estimada (haz ÷ interior)</div>
              {(() => {
                const fillPct =
                  params.mastInnerSideMm > 0
                    ? ((Math.PI * Math.pow(params.harnessOuterDiameterMm / 2, 2)) /
                        (params.mastInnerSideMm * params.mastInnerSideMm)) *
                      100
                    : 0;
                return (
                  <div className="font-mono font-bold text-sm mt-0.5 text-sky-300">
                    {fillPct.toFixed(1)} % (medida definida por ti)
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Corte transversal superior del mástil hueco */}
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">Corte Transversal del Mástil Hueco</h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              Medida del usuario
            </span>
          </div>
          <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-2">
            <svg viewBox="0 0 260 190" className="w-full h-auto">
              {/* Pared exterior del mástil */}
              <rect x="45" y="18" width="140" height="140" rx="6" fill="#334155" stroke="#64748b" strokeWidth="2" />
              {/* Hueco interior libre */}
              <rect x="65" y="38" width="100" height="100" rx="3" fill="#0B1120" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 3" />
              {/* Haz de 22 hilos (círculo verde) */}
              <circle cx="115" cy="88" r="24" fill="#065f46" stroke="#34d399" strokeWidth="2" />
              <circle cx="106" cy="82" r="4" fill="#ef4444" />
              <circle cx="118" cy="80" r="4" fill="#f97316" />
              <circle cx="124" cy="92" r="4" fill="#0f172a" stroke="#94a3b8" />
              <circle cx="110" cy="96" r="4" fill="#3b82f6" />
              <circle cx="122" cy="83" r="4" fill="#22c55e" />
              <text x="115" y="110" textAnchor="middle" fill="#a7f3d0" fontSize="8.5" fontWeight="700">
                Haz Ø {params.harnessOuterDiameterMm} mm
              </text>
              {/* Cota lado interior */}
              <line x1="65" y1="168" x2="165" y2="168" stroke="#38bdf8" strokeWidth="1.2" />
              <text x="115" y="181" textAnchor="middle" fill="#7dd3fc" fontSize="9.5" fontWeight="600">
                Interior libre: {params.mastInnerSideMm} × {params.mastInnerSideMm} mm
              </text>
            </svg>
          </div>
          <p className="text-[11px] text-slate-400">
            Ajusta libremente el ancho interior de tu mástil según los materiales de tu maqueta, procurando que los 22 hilos pasen sin roce contra aristas.
          </p>
        </div>
      </div>

      {/* Referencia física de cabida en Caja Z1 y Cabeza Z3 (según medidas del usuario) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">
                Referencia de Cabida — Caja de Control Z1 ({params.controlBoxLengthCm}×{params.controlBoxWidthCm}×{params.controlBoxHeightCm} cm)
              </h3>
              <p className="text-[11px] text-slate-400">
                Área interior base: {params.controlBoxLengthCm * params.controlBoxWidthCm * 100} mm² · Tapa superior separada para pantallas y botones.
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              Medida del usuario
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#0B1120] text-slate-400">
                <tr>
                  <th className="py-1.5 px-2.5">Ubicación</th>
                  <th className="py-1.5 px-2.5">Elemento</th>
                  <th className="py-1.5 px-2.5">Medida</th>
                  <th className="py-1.5 px-2.5 text-right">Área (mm²)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200 tabular-nums">
                {CONTROL_BOX_FIT_ITEMS.map((row, i) => (
                  <tr key={i}>
                    <td className="py-1.5 px-2.5 text-slate-400">{row.zone}</td>
                    <td className="py-1.5 px-2.5">{row.item}</td>
                    <td className="py-1.5 px-2.5 font-mono">{row.footprint}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono">{row.areaMm2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white">
                Referencia de Cabida — Cabeza Giratoria Z3 ({params.headWidthMm}×{params.headDepthMm} mm)
              </h3>
              <p className="text-[11px] text-slate-400">
                Área plataforma Z3: {params.headWidthMm * params.headDepthMm} mm² vs{' '}
                {HEAD_Z3_FIT_ITEMS.reduce((a, b) => a + b.areaMm2, 0)} mm² ocupados por motores, FC-33, US-H y bornera.
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
              Medida del usuario
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#0B1120] text-slate-400">
                <tr>
                  <th className="py-1.5 px-2.5">Subconjunto en Z3</th>
                  <th className="py-1.5 px-2.5">Huella</th>
                  <th className="py-1.5 px-2.5 text-right">Área (mm²)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200 tabular-nums">
                {HEAD_Z3_FIT_ITEMS.map((row, i) => (
                  <tr key={i}>
                    <td className="py-1.5 px-2.5">{row.item}</td>
                    <td className="py-1.5 px-2.5 font-mono">{row.footprint}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono">{row.areaMm2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-[11px] text-slate-400">
            Referencia de dimensiones reales verificadas: {COMPONENT_DIMENSIONS_TABLE.length} tipos de piezas medidas en catálogo.
          </div>
        </div>
      </div>

      {/* Tablas de conductores: Tramo A (22 hilos) y Tramo B (9 hilos) */}
      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white">
                Tramo A (Caja Z1 → Cabeza Z3 por el mástil): {tramoA.length} hilos
              </h3>
              <p className="text-xs text-slate-400">
                10 hilos de potencia (2 giro, 2 cabrestante, 2 carro, 2 electroimán, 2 bombillo) + 9
                de señal (3 FC-33, HOME, Hall S, TRIG/ECHO US-H, TRIG/ECHO US-V) + 3 comunes (GND,
                +3,3 V, +5 V).
              </p>
            </div>
            <StatusChip status="CONFIRMADO" />
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#0B1120] text-slate-400">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Etiqueta fija</th>
                  <th className="py-2 px-3">Grupo</th>
                  <th className="py-2 px-3">Color</th>
                  <th className="py-2 px-3">Origen</th>
                  <th className="py-2 px-3">Destino</th>
                  <th className="py-2 px-3">Voltaje</th>
                  <th className="py-2 px-3 text-right">Tramo extra en cabeza (cm)</th>
                  <th className="py-2 px-3 text-right">Total hilo (cm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 tabular-nums">
                {tramoA.map((c) => (
                  <tr key={c.index} className="hover:bg-slate-900/60 text-slate-200">
                    <td className="py-2 px-3 font-mono text-slate-400">{c.index}</td>
                    <td className="py-2 px-3 font-mono font-semibold text-sky-300">{c.shortLabel}</td>
                    <td className="py-2 px-3">{c.group}</td>
                    <td className="py-2 px-3">{c.color}</td>
                    <td className="py-2 px-3">{c.origin}</td>
                    <td className="py-2 px-3">{c.destination}</td>
                    <td className="py-2 px-3 font-mono">{c.voltage}</td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min={0}
                        value={c.extraLengthCm}
                        onChange={(e) =>
                          onUpdateConductorLength(c.index, Number(e.target.value) || 0)
                        }
                        className="w-20 rounded bg-[#0B1120] border border-slate-700 px-2 py-1 text-right text-white font-mono"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-300">
                      {baseTramoACm !== null ? `${baseTramoACm + c.extraLengthCm} cm` : 'POR CONFIRMAR'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white">
                Tramo B (Bornera en Cabeza Z3 → Carro Z5 y Gancho Z6): {tramoB.length} hilos
              </h3>
              <p className="text-xs text-slate-400">
                Hall (+5 V, GND, S) + Electroimán (2 hilos) + US-V (+5 V, GND, TRIG, ECHO). Unidos al
                Tramo A en la bornera de paso de Z3.
              </p>
            </div>
            <StatusChip status="CONFIRMADO" />
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#0B1120] text-slate-400">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Etiqueta fija</th>
                  <th className="py-2 px-3">Grupo</th>
                  <th className="py-2 px-3">Color</th>
                  <th className="py-2 px-3">Origen</th>
                  <th className="py-2 px-3">Destino</th>
                  <th className="py-2 px-3">Voltaje</th>
                  <th className="py-2 px-3 text-right">Longitud editable (cm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 tabular-nums">
                {tramoB.map((c) => (
                  <tr key={c.index} className="hover:bg-slate-900/60 text-slate-200">
                    <td className="py-2 px-3 font-mono text-slate-400">{c.index - 22}</td>
                    <td className="py-2 px-3 font-mono font-semibold text-violet-300">{c.shortLabel}</td>
                    <td className="py-2 px-3">{c.group}</td>
                    <td className="py-2 px-3">{c.color}</td>
                    <td className="py-2 px-3">{c.origin}</td>
                    <td className="py-2 px-3">{c.destination}</td>
                    <td className="py-2 px-3 font-mono">{c.voltage}</td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min={5}
                        value={c.extraLengthCm}
                        onChange={(e) =>
                          onUpdateConductorLength(c.index, Number(e.target.value) || 0)
                        }
                        className="w-24 rounded bg-[#0B1120] border border-slate-700 px-2 py-1 text-right text-white font-mono"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Diagrama de flujo de secuencia automática (Sección 9) */}
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
        <h3 className="text-base font-bold text-white">
          Diagrama de Flujo — Secuencia Automática Completa (Sección 9)
        </h3>
        <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-3 overflow-x-auto">
          <svg viewBox="0 0 920 260" className="w-full min-w-[760px] h-auto">
            <defs>
              <marker id="flowArrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="#94a3b8" />
              </marker>
            </defs>
            {/* Paso 1 */}
            <rect x="15" y="25" width="175" height="58" rx="6" fill="#0f172a" stroke="#f59e0b" strokeWidth="1.5" />
            <text x="102" y="45" textAnchor="middle" fill="#fde68a" fontSize="10" fontWeight="700">1. Verificar Contrapeso</text>
            <text x="102" y="60" textAnchor="middle" fill="#cbd5e1" fontSize="9">¿Ya está colocado m_cp?</text>
            <text x="102" y="72" textAnchor="middle" fill="#fca5a5" fontSize="8.5">Si NO → TRABAJAR bloqueado</text>

            <line x1="190" y1="54" x2="220" y2="54" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#flowArrow)" />

            {/* Paso 2 */}
            <rect x="224" y="25" width="160" height="58" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="304" y="45" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontWeight="700">2. Señalización</text>
            <text x="304" y="60" textAnchor="middle" fill="#cbd5e1" fontSize="9">Enciende bombillo (M3)</text>
            <text x="304" y="72" textAnchor="middle" fill="#cbd5e1" fontSize="9">+ suena Buzzer 1 (D10)</text>

            <line x1="384" y1="54" x2="414" y2="54" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#flowArrow)" />

            {/* Paso 3 */}
            <rect x="418" y="25" width="165" height="58" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="500" y="45" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontWeight="700">3. Posicionar (θᵢ, rᵢ)</text>
            <text x="500" y="60" textAnchor="middle" fill="#cbd5e1" fontSize="9">Gira a θᵢ (FC-33 + L298N)</text>
            <text x="500" y="72" textAnchor="middle" fill="#cbd5e1" fontSize="9">Carro a rᵢ (US-H + FC-33)</text>

            <line x1="583" y1="54" x2="613" y2="54" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#flowArrow)" />

            {/* Paso 4 */}
            <rect x="617" y="25" width="285" height="58" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="759" y="45" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontWeight="700">4. Descenso controlado y aproximación</text>
            <text x="759" y="60" textAnchor="middle" fill="#cbd5e1" fontSize="9">Baja gancho hasta Δh = d_V − 3,5 cm ≤ 1 cm</text>
            <text x="759" y="72" textAnchor="middle" fill="#cbd5e1" fontSize="9">Reduce velocidad (ajustable con Potenciómetro 2)</text>

            <line x1="759" y1="83" x2="759" y2="128" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#flowArrow)" />

            {/* Paso 5 */}
            <rect x="645" y="132" width="257" height="58" rx="6" fill="#0f172a" stroke="#f97316" strokeWidth="1.5" />
            <text x="773" y="152" textAnchor="middle" fill="#fdba74" fontSize="10" fontWeight="700">5. Activar Electroimán (M2)</text>
            <text x="773" y="167" textAnchor="middle" fill="#cbd5e1" fontSize="9">Enciende 12 V en M2 y espera 5 s</text>
            <text x="773" y="179" textAnchor="middle" fill="#cbd5e1" fontSize="9">para asegurar contacto con arandela ≥ 4 cm</text>

            <line x1="645" y1="161" x2="615" y2="161" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#flowArrow)" />

            {/* Paso 6 */}
            <rect x="405" y="132" width="206" height="58" rx="6" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
            <text x="508" y="150" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontWeight="700">6. Verificar agarre (sube 2 cm)</text>
            <text x="508" y="164" textAnchor="middle" fill="#cbd5e1" fontSize="9">¿d_V sigue ≈ e (3,5 cm)?</text>
            <text x="508" y="178" textAnchor="middle" fill="#fca5a5" fontSize="8.5">Si d_V crece → desenergiza y reintenta</text>

            <line x1="405" y1="161" x2="375" y2="161" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#flowArrow)" />

            {/* Paso 7 */}
            <rect x="200" y="132" width="171" height="58" rx="6" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
            <text x="285" y="150" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontWeight="700">7. Traslado a Bodega (Z7)</text>
            <text x="285" y="164" textAnchor="middle" fill="#cbd5e1" fontSize="9">Sube hasta tope Hall (D33)</text>
            <text x="285" y="178" textAnchor="middle" fill="#cbd5e1" fontSize="9">Gira y mueve carro a Z7</text>

            <line x1="200" y1="161" x2="170" y2="161" stroke="#94a3b8" strokeWidth="1.5" markerEnd="url(#flowArrow)" />

            {/* Paso 8 */}
            <rect x="15" y="122" width="151" height="80" rx="6" fill="#0f172a" stroke="#a855f7" strokeWidth="1.5" />
            <text x="90" y="140" textAnchor="middle" fill="#d8b4fe" fontSize="10" fontWeight="700">8. Descarga y Siguiente</text>
            <text x="90" y="154" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">Baja por encoder gancho</text>
            <text x="90" y="166" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">hasta &lt; 1 cm del piso;</text>
            <text x="90" y="178" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">espera 5 s; pulso inverso</text>
            <text x="90" y="190" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">≤ 80 ms y sube al siguiente</text>
          </svg>
        </div>
      </div>
    </div>
  );
};
