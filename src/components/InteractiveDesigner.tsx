import React, { useMemo, useState } from 'react';
import {
  AlertOctagon,
  Monitor,
  PowerOff,
  RotateCcw,
  Terminal,
} from 'lucide-react';
import {
  ESP32_AVAILABLE_PINS,
  SHIELD_RESERVED_UNO_PINS,
  UNO_AVAILABLE_PINS,
} from '../data/craneData';
import { PinAssignment, UserEditableParams } from '../types/crane';
import { runProjectValidation } from '../utils/validator';

interface InteractiveDesignerProps {
  pinAssignments: PinAssignment[];
  params: UserEditableParams;
  virtualEstop: boolean;
  onToggleVirtualEstop: () => void;
  onUpdatePinAssignment: (id: string, patch: Partial<PinAssignment>) => void;
  onResetPins: () => void;
  onExportConfig: (format: 'json' | 'table') => void;
}

export const InteractiveDesigner: React.FC<InteractiveDesignerProps> = ({
  pinAssignments,
  params,
  virtualEstop,
  onToggleVirtualEstop,
  onUpdatePinAssignment,
  onResetPins,
  onExportConfig,
}) => {
  const [selectedId, setSelectedId] = useState<string>(pinAssignments[0]?.id || 'PA01');
  const [commandInput, setCommandInput] = useState<string>('');
  const [commandOutput, setCommandOutput] = useState<string>(
    'Comandos disponibles: /renderizar_plano, /modificar_pin <ID> <PIN>, /auditoria_electrica, /exportar_config'
  );

  // Simulador de pantallas (LCD 1602, OLED A 3 pestañas, OLED B 2 pestañas)
  const [simMode, setSimMode] = useState<'MANUAL' | 'AUTOMÁTICO'>('AUTOMÁTICO');
  const [simState, setSimState] = useState<'REPOSO' | 'MOVIENDO' | 'CARGADA'>('MOVIENDO');
  const [oledATab, setOledATab] = useState<0 | 1 | 2>(0);
  const [oledBTab, setOledBTab] = useState<0 | 1>(0);
  const [simLoadIdx, setSimLoadIdx] = useState<number>(0);

  const selected = pinAssignments.find((p) => p.id === selectedId) || pinAssignments[0];

  // Detectar peligros por señal en tiempo real (duplicado, 5V sin divisor en ESP32, pin reservado shield, D12 con R externa)
  const hazardsById = useMemo(() => {
    const map: Record<string, string[]> = {};
    const counts: Record<string, string[]> = {};

    for (const pa of pinAssignments) {
      if (pa.controller !== 'ESP32' && pa.controller !== 'UNO') continue;
      for (const p of pa.pin.split('/').map((s) => s.trim())) {
        const key = `${pa.controller}:${p}`;
        if (!counts[key]) counts[key] = [];
        counts[key].push(pa.id);
      }
    }

    for (const pa of pinAssignments) {
      const issues: string[] = [];
      for (const p of pa.pin.split('/').map((s) => s.trim())) {
        const key = `${pa.controller}:${p}`;
        if ((counts[key]?.length || 0) > 1) {
          issues.push(`Pin duplicado (${pa.controller} ${p})`);
        }
        if (pa.controller === 'UNO' && SHIELD_RESERVED_UNO_PINS.includes(p)) {
          issues.push(`Pin reservado del Shield L293D (${p})`);
        }
      }
      if (pa.controller === 'ESP32' && pa.sourceVoltage === '5V' && !pa.usesDivider) {
        issues.push('5 V directos al ESP32 sin divisor de tensión');
      }
      if (pa.controller === 'ESP32' && pa.pin === 'D12' && pa.hasExternalResistor) {
        issues.push('Resistencia externa prohibida en pin de arranque D12');
      }
      if (issues.length > 0) map[pa.id] = issues;
    }
    return map;
  }, [pinAssignments]);

  const totalHazards = Object.keys(hazardsById).length;

  const handleRunCommand = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = commandInput.trim();
    if (!raw) return;

    if (raw === '/renderizar_plano') {
      setCommandOutput(
        `Plano renderizado con ${pinAssignments.length} conexiones asignadas (${totalHazards} alertas activas, Paro virtual: ${virtualEstop ? 'ACTIVO' : 'INACTIVO'}).`
      );
    } else if (raw.startsWith('/modificar_pin')) {
      const parts = raw.split(/\s+/);
      if (parts.length >= 3) {
        const targetId = parts[1].toUpperCase();
        const newPin = parts[2].toUpperCase();
        const found = pinAssignments.find((p) => p.id === targetId);
        if (found) {
          onUpdatePinAssignment(found.id, { pin: newPin });
          setSelectedId(found.id);
          setCommandOutput(`Pin actualizado: ${found.componentLabel} (${found.id}) ahora apunta a ${newPin}.`);
        } else {
          setCommandOutput(`No se encontró la asignación ${targetId}. Usa un ID como PA01..PA30.`);
        }
      } else {
        setCommandOutput('Uso: /modificar_pin <ID> <PIN> (ejemplo: /modificar_pin PA15 D23)');
      }
    } else if (raw === '/auditoria_electrica') {
      const res = runProjectValidation(pinAssignments, [], params);
      const fails = res.checks.filter((c) => !c.passed);
      setCommandOutput(
        fails.length === 0
          ? 'Auditoría eléctrica: 0 errores en pines, niveles de 3,3 V, pines reservados y presupuesto de corriente.'
          : `Auditoría detectó ${fails.length} fallo(s): ${fails.map((f) => f.title).join('; ')}`
      );
    } else if (raw === '/exportar_config') {
      onExportConfig('json');
      setCommandOutput('Configuración JSON generada y descargada.');
    } else {
      setCommandOutput(
        `Comando no reconocido: "${raw}". Comandos válidos: /renderizar_plano, /modificar_pin, /auditoria_electrica, /exportar_config`
      );
    }
    setCommandInput('');
  };

  const currentLoad =
    params.activeLoads[simLoadIdx % Math.max(1, params.activeLoads.length)] || {
      id: 'L1',
      name: 'Carga demo',
      massG: 120,
      rCm: 25,
      thetaDeg: 45,
      order: 1,
    };

  const maxMoment =
    params.activeLoads.length > 0
      ? Math.max(...params.activeLoads.map((l) => l.massG * l.rCm))
      : 0;
  const minCp =
    params.counterweightDistDcpCm && maxMoment > 0
      ? `${((1.1 * maxMoment) / params.counterweightDistDcpCm).toFixed(0)}g`
      : 'POR CONF.';

  return (
    <div className="space-y-6">
      {/* Cabecera + Paro Virtual */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl bg-[#0F172A] border border-slate-800 p-5">
        <div>
          <h2 className="text-xl font-bold text-white">
            Diseñador Interactivo de Pines, Paro Virtual y Simulador de Pantallas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Haz clic en cualquier cable o señal para reasignar pines. Si ocurre un conflicto (pin
            duplicado, 5 V sin divisor al ESP32, pin reservado del shield o R externa en D12), el
            cable parpadea en rojo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={onToggleVirtualEstop}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition whitespace-nowrap ${
              virtualEstop
                ? 'bg-rose-600 border-rose-500 text-white'
                : 'bg-[#0B1120] border-rose-500/50 text-rose-300 hover:bg-rose-950/40'
            }`}
          >
            <PowerOff className="w-4 h-4" />
            {virtualEstop ? 'Paro virtual ACTIVADO (12 V en gris)' : 'Paro virtual'}
          </button>
          <button
            onClick={onResetPins}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Restaurar pines
          </button>
        </div>
      </div>

      {/* Alerta en tiempo real si hay errores */}
      {totalHazards > 0 && (
        <div className="rounded-xl bg-rose-950/40 border border-rose-500 p-4 flex items-start gap-3 text-xs text-rose-100">
          <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm text-rose-300">
              Alerta eléctrica activa ({totalHazards} cable(s) parpadeando en rojo)
            </div>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {Object.entries(hazardsById).map(([id, errs]) => {
                const item = pinAssignments.find((p) => p.id === id);
                return (
                  <li key={id}>
                    <strong>{item?.componentLabel}</strong> ({item?.controller} {item?.pin}):{' '}
                    {errs.join(' · ')}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Barra de comandos */}
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-2">
        <form onSubmit={handleRunCommand} className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Terminal className="w-4 h-4 text-emerald-400 absolute left-3 top-2.5" aria-hidden="true" />
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Escribe comando: /renderizar_plano, /modificar_pin PA15 D23, /auditoria_electrica, /exportar_config"
              className="w-full rounded-lg bg-[#0B1120] border border-slate-700 pl-9 pr-3 py-2 text-xs font-mono text-white focus:border-emerald-400 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap"
          >
            Ejecutar comando
          </button>
        </form>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-mono text-slate-300">{commandOutput}</span>
          <div className="flex gap-2">
            {(['/renderizar_plano', '/auditoria_electrica', '/exportar_config'] as const).map((cmd) => (
              <button
                key={cmd}
                type="button"
                onClick={() => {
                  setCommandInput(cmd);
                }}
                className="px-2 py-1 rounded bg-[#0B1120] border border-slate-800 text-slate-400 hover:text-white font-mono text-[11px]"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lienzo interactivo + Inspector lateral de pin */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">
              Mapa interactivo de conexiones (clic en cualquier línea o nodo para editar pin)
            </span>
            {virtualEstop && (
              <span className="text-rose-400 font-bold font-mono">
                PARO VIRTUAL: POTENCIA 12 V EN GRIS
              </span>
            )}
          </div>

          <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-2 overflow-x-auto">
            <svg viewBox="0 0 820 560" className="w-full min-w-[660px] h-auto select-none">
              {/* Barra de potencia 12 V (se pinta en gris en Paro Virtual) */}
              <rect
                x="20"
                y="16"
                width="780"
                height="30"
                rx="4"
                fill={virtualEstop ? '#1e293b' : '#431407'}
                stroke={virtualEstop ? '#64748b' : '#f97316'}
                strokeWidth="1.5"
              />
              <text
                x="410"
                y="35"
                textAnchor="middle"
                fill={virtualEstop ? '#94a3b8' : '#fdba74'}
                fontSize="11"
                fontWeight="700"
              >
                {virtualEstop
                  ? 'LÍNEA 12 V CORTADA (PARO VIRTUAL ACTIVO — MOTORES Y ELECTROIMÁN SIN ENERGÍA)'
                  : 'LÍNEA DE POTENCIA +12 V 2 A (ACTIVA → L298N + SHIELD +M + MOTORES)'}
              </text>

              {/* Bloque ESP32 centro-izquierda */}
              <rect x="30" y="68" width="160" height="310" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" />
              <text x="110" y="90" textAnchor="middle" fill="#f8fafc" fontSize="11.5" fontWeight="700">
                ESP32 (3,3 V)
              </text>

              {/* Bloque UNO abajo izquierda */}
              <rect x="30" y="395" width="160" height="145" rx="6" fill="#0f172a" stroke="#ef4444" strokeWidth="2" />
              <text x="110" y="418" textAnchor="middle" fill="#f8fafc" fontSize="11.5" fontWeight="700">
                UNO + Shield (5 V)
              </text>

              {/* Filas clicables para las señales principales */}
              {pinAssignments.slice(0, 21).map((pa, idx) => {
                const y = 104 + idx * 12.8;
                const hasErr = Boolean(hazardsById[pa.id]);
                const isSel = pa.id === selectedId;
                const strokeColor = hasErr
                  ? '#ef4444'
                  : pa.wireColor === 'green'
                    ? virtualEstop
                      ? '#64748b'
                      : '#22c55e'
                    : pa.wireColor === 'yellow'
                      ? '#eab308'
                      : '#3b82f6';
                return (
                  <g
                    key={pa.id}
                    onClick={() => setSelectedId(pa.id)}
                    className="cursor-pointer"
                  >
                    <line
                      x1="190"
                      y1={y}
                      x2="455"
                      y2={y}
                      stroke={strokeColor}
                      strokeWidth={isSel ? 3 : 1.8}
                      className={hasErr ? 'wire-blink-alert' : ''}
                    />
                    <rect
                      x="455"
                      y={y - 5.5}
                      width="335"
                      height="11.5"
                      rx="2"
                      fill={isSel ? '#064e3b' : hasErr ? '#450a0a' : '#0f172a'}
                      stroke={isSel ? '#34d399' : hasErr ? '#ef4444' : '#1e293b'}
                    />
                    <text x="195" y={y + 3} fill="#cbd5e1" fontSize="8.5" fontFamily="monospace">
                      {pa.pin}
                    </text>
                    <text x="462" y={y + 3} fill="#f8fafc" fontSize="8.5">
                      {pa.id} · {pa.componentLabel} {pa.usesDivider ? '[Div 1kΩ]' : ''} {hasErr ? '⚠' : ''}
                    </text>
                  </g>
                );
              })}

              {pinAssignments.slice(21).map((pa, idx) => {
                const y = 432 + idx * 12;
                const hasErr = Boolean(hazardsById[pa.id]);
                const isSel = pa.id === selectedId;
                const strokeColor = hasErr
                  ? '#ef4444'
                  : pa.wireColor === 'yellow'
                    ? '#eab308'
                    : '#3b82f6';
                return (
                  <g
                    key={pa.id}
                    onClick={() => setSelectedId(pa.id)}
                    className="cursor-pointer"
                  >
                    <line
                      x1="190"
                      y1={y}
                      x2="455"
                      y2={y}
                      stroke={strokeColor}
                      strokeWidth={isSel ? 3 : 1.8}
                      className={hasErr ? 'wire-blink-alert' : ''}
                    />
                    <rect
                      x="455"
                      y={y - 5.5}
                      width="335"
                      height="11.5"
                      rx="2"
                      fill={isSel ? '#064e3b' : hasErr ? '#450a0a' : '#0f172a'}
                      stroke={isSel ? '#34d399' : hasErr ? '#ef4444' : '#1e293b'}
                    />
                    <text x="195" y={y + 3} fill="#cbd5e1" fontSize="8.5" fontFamily="monospace">
                      {pa.pin}
                    </text>
                    <text x="462" y={y + 3} fill="#f8fafc" fontSize="8.5">
                      {pa.id} · {pa.componentLabel} {hasErr ? '⚠' : ''}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Panel de edición del pin seleccionado */}
        <div className="space-y-5">
          {selected && (
            <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
              <div>
                <div className="text-xs font-mono text-sky-300">
                  {selected.id} · Controlador {selected.controller}
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">{selected.componentLabel}</h3>
                <p className="text-xs text-slate-400">{selected.signalName}</p>
              </div>

              {hazardsById[selected.id] && (
                <div className="rounded-lg bg-rose-950/50 border border-rose-500 p-3 text-xs text-rose-200">
                  <strong>Conflicto detectado:</strong> {hazardsById[selected.id].join(' · ')}
                </div>
              )}

              <div className="space-y-3 text-xs">
                <label className="block">
                  <span className="text-slate-300">Pin asignado ({selected.controller})</span>
                  <select
                    value={selected.pin}
                    onChange={(e) => onUpdatePinAssignment(selected.id, { pin: e.target.value })}
                    className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white font-mono"
                  >
                    {(selected.controller === 'ESP32'
                      ? ESP32_AVAILABLE_PINS
                      : UNO_AVAILABLE_PINS
                    ).map((p) => (
                      <option key={p} value={p}>
                        {p} {p === selected.defaultPin ? '(por defecto)' : ''}
                        {selected.controller === 'UNO' && SHIELD_RESERVED_UNO_PINS.includes(p)
                          ? ' [RESERVADO SHIELD]'
                          : ''}
                      </option>
                    ))}
                  </select>
                </label>

                {selected.controller === 'ESP32' && selected.sourceVoltage === '5V' && (
                  <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.usesDivider}
                      onChange={(e) =>
                        onUpdatePinAssignment(selected.id, { usesDivider: e.target.checked })
                      }
                      className="rounded border-slate-600 bg-slate-900"
                    />
                    <span>Usa divisor de tensión 1 kΩ (5 V → 3,33 V)</span>
                  </label>
                )}

                {selected.controller === 'ESP32' && selected.pin === 'D12' && (
                  <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.hasExternalResistor}
                      onChange={(e) =>
                        onUpdatePinAssignment(selected.id, {
                          hasExternalResistor: e.target.checked,
                        })
                      }
                      className="rounded border-slate-600 bg-slate-900"
                    />
                    <span>Resistencia pull-up externa (probar alerta D12)</span>
                  </label>
                )}

                <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3 text-slate-300">
                  <div>
                    <strong>Voltaje de origen:</strong> {selected.sourceVoltage}
                  </div>
                  <div className="mt-1">
                    <strong>Notas:</strong> {selected.notes}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Simulador de pantallas: LCD 1602, OLED A y OLED B */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                <span>Simulador de Pantallas (Z1)</span>
              </h3>
              <select
                value={simState}
                onChange={(e) => setSimState(e.target.value as typeof simState)}
                className="rounded bg-[#0B1120] border border-slate-700 px-2 py-1 text-[11px] text-slate-200"
              >
                <option value="REPOSO">REPOSO</option>
                <option value="MOVIENDO">MOVIENDO</option>
                <option value="CARGADA">CARGADA</option>
              </select>
            </div>

            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setSimMode((m) => (m === 'AUTOMÁTICO' ? 'MANUAL' : 'AUTOMÁTICO'))}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Modo: {simMode}
              </button>
              <button
                onClick={() => setSimLoadIdx((i) => i + 1)}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Siguiente carga
              </button>
            </div>

            {/* LCD 1602 */}
            <div className="rounded-lg bg-[#14532d] border-4 border-slate-700 p-3 font-mono text-xs text-[#dcfce7] tracking-wider shadow-inner">
              <div className="text-[10px] text-emerald-300/80 mb-1">LCD 1602 (UNO A4/A5)</div>
              <div>{`${simMode.slice(0, 4)} ${simState}`.padEnd(16, ' ')}</div>
              <div>
                {virtualEstop
                  ? 'ALERTA: PARO 12V'
                  : `CARGA ${(simLoadIdx % Math.max(1, params.activeLoads.length)) + 1}/${Math.max(1, params.activeLoads.length)} OK`}
              </div>
            </div>

            {/* OLED A (3 pestañas) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">OLED A (D21/D22)</span>
                <button
                  onClick={() => setOledATab((t) => ((t + 1) % 3) as 0 | 1 | 2)}
                  className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-medium"
                >
                  Botón Pestaña A ({oledATab + 1}/3)
                </button>
              </div>
              <div className="rounded-lg bg-black border-2 border-slate-700 p-3 font-mono text-[11px] text-sky-300 space-y-1">
                {oledATab === 0 && (
                  <>
                    <div className="text-amber-300">[1/3] CARGA ACTUAL</div>
                    <div>ID: {currentLoad.id} · {currentLoad.name.slice(0, 14)}</div>
                    <div>Masa: {currentLoad.massG} g · CP: {minCp}</div>
                    <div>Est: ~18 s · Estado: {simState}</div>
                  </>
                )}
                {oledATab === 1 && (
                  <>
                    <div className="text-amber-300">[2/3] COLA PENDIENTE</div>
                    {params.activeLoads.slice(0, 3).map((l) => (
                      <div key={l.id}>
                        #{l.order} {l.name.slice(0, 10)} ({l.massG}g, {l.rCm}cm)
                      </div>
                    ))}
                  </>
                )}
                {oledATab === 2 && (
                  <>
                    <div className="text-amber-300">[3/3] TOTALES DEL CICLO</div>
                    <div>Cargas totales: {params.activeLoads.length}</div>
                    <div>
                      Masa total: {params.activeLoads.reduce((a, b) => a + b.massG, 0)} g
                    </div>
                    <div>Contrapeso: {params.counterweightPlaced ? 'COLOCADO' : 'FALTA'}</div>
                  </>
                )}
              </div>
            </div>

            {/* OLED B (2 pestañas) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-semibold">OLED B (D16/D17)</span>
                <button
                  onClick={() => setOledBTab((t) => ((t + 1) % 2) as 0 | 1)}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium"
                >
                  Botón Pestaña B ({oledBTab + 1}/2)
                </button>
              </div>
              <div className="rounded-lg bg-black border-2 border-slate-700 p-3 font-mono text-[11px] text-emerald-300 space-y-1">
                {oledBTab === 0 && (
                  <>
                    <div className="text-amber-300">[1/2] ERRORES EN VIVO</div>
                    <div>Δθ = +0.4°</div>
                    <div>Δr = -0.2 cm</div>
                    <div>Δh = +0.8 cm (US-V − 3,5 cm)</div>
                  </>
                )}
                {oledBTab === 1 && (
                  <>
                    <div className="text-amber-300">[2/2] POSICIÓN GANCHO</div>
                    <div>r = {currentLoad.rCm.toFixed(1)} cm</div>
                    <div>θ = {currentLoad.thetaDeg.toFixed(1)} °</div>
                    <div>z = 12.4 cm (Hall: LIBRE)</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
