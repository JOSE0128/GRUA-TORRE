import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Layers,
  Plus,
  ShieldAlert,
  Trash2,
  Wrench,
  Zap,
} from 'lucide-react';
import {
  COMMON_ERRORS,
  computeJumperSummary,
  DEFINITIVE_CONNECTIONS,
  ZONES,
} from '../data/craneData';
import { CraneComponent, LoadItem, UserEditableParams } from '../types/crane';
import { StatusChip } from './StatusChip';

interface HomeDashboardProps {
  components: CraneComponent[];
  params: UserEditableParams;
  completedStepIds: string[];
  totalStepsCount: number;
  onUpdateParams: (next: Partial<UserEditableParams>) => void;
  onNavigateTab: (tab: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  components,
  params,
  completedStepIds,
  totalStepsCount,
  onUpdateParams,
  onNavigateTab,
}) => {
  const [newLoadName, setNewLoadName] = useState('');
  const [newLoadMass, setNewLoadMass] = useState('');
  const [newLoadR, setNewLoadR] = useState('');
  const [newLoadTheta, setNewLoadTheta] = useState('');

  const jumperSummary = computeJumperSummary(DEFINITIVE_CONNECTIONS);
  const pendingItems = components.filter(
    (c) => c.status === 'POR CONFIRMAR' || c.status === 'POR COMPRAR' || c.toConfirm.length > 0
  );
  const confirmedCount = components.filter((c) => c.status === 'CONFIRMADO').length;

  // Cálculos en vivo (Sección 5 y 8)
  const soundSpeed = 331.3 + 0.606 * params.ambientTempC;
  const effectiveRatioI =
    params.gearOptionGiro === 'A_PINON_CORONA' && params.pinionDiameterMm > 0
      ? params.crownDiameterMm / params.pinionDiameterMm
      : params.gearRatioGiroI;
  const resGiroDeg =
    params.slotsGiroN && effectiveRatioI
      ? 360 / (2 * params.slotsGiroN * effectiveRatioI)
      : null;
  const resGiroOptADeg =
    params.slotsGiroN && params.pinionDiameterMm > 0
      ? 360 / (2 * params.slotsGiroN * (params.crownDiameterMm / params.pinionDiameterMm))
      : null;
  const resGiroOptBDeg = params.slotsGiroN ? 360 / (2 * params.slotsGiroN * 10.8) : null;
  const resCarroMm =
    params.slotsCarroN && params.drumDiameterCarroCm
      ? (Math.PI * params.drumDiameterCarroCm * 10) / (2 * params.slotsCarroN)
      : null;
  const resGanchoMm =
    params.slotsGanchoN && params.drumDiameterGanchoCm
      ? (Math.PI * params.drumDiameterGanchoCm * 10) / (2 * params.slotsGanchoN)
      : null;
  const totalHarnessLengthCm =
    params.mastHeightCm !== null
      ? params.mastHeightCm + params.rizoReserveCm + 30
      : null;
  const usefulHookHeightCm =
    params.mastHeightCm !== null
      ? params.mastHeightCm - params.hookBlockHeightCm - params.hallMarginCm
      : null;
  const mastFillPct =
    params.mastInnerSideMm > 0
      ? ((Math.PI * Math.pow(params.harnessOuterDiameterMm / 2, 2)) /
          (params.mastInnerSideMm * params.mastInnerSideMm)) *
        100
      : 0;

  // Contrapeso mínimo: m_cp = 1,1 * máx(m_i * r_i) / d_cp
  const maxMomentGcm =
    params.activeLoads.length > 0
      ? Math.max(...params.activeLoads.map((l) => l.massG * l.rCm))
      : 0;
  const minCounterweightG =
    params.counterweightDistDcpCm && params.counterweightDistDcpCm > 0 && maxMomentGcm > 0
      ? (1.1 * maxMomentGcm) / params.counterweightDistDcpCm
      : null;

  const assemblyPct =
    totalStepsCount > 0 ? Math.round((completedStepIds.length / totalStepsCount) * 100) : 0;

  const handleAddLoad = (e: React.FormEvent) => {
    e.preventDefault();
    const massG = Number(newLoadMass);
    const rCm = Number(newLoadR);
    const thetaDeg = Number(newLoadTheta);
    if (!newLoadName.trim() || !massG || !rCm) return;
    const nextLoad: LoadItem = {
      id: `L-${Date.now()}`,
      name: newLoadName.trim(),
      massG,
      rCm,
      thetaDeg: Number.isFinite(thetaDeg) ? thetaDeg : 0,
      order: params.activeLoads.length + 1,
    };
    onUpdateParams({ activeLoads: [...params.activeLoads, nextLoad] });
    setNewLoadName('');
    setNewLoadMass('');
    setNewLoadR('');
    setNewLoadTheta('');
  };

  const handleRemoveLoad = (id: string) => {
    const remaining = params.activeLoads
      .filter((l) => l.id !== id)
      .map((l, idx) => ({ ...l, order: idx + 1 }));
    onUpdateParams({ activeLoads: remaining });
  };

  return (
    <div className="space-y-8">
      {/* Cabecera de resumen */}
      <section className="rounded-xl bg-[#0F172A] border border-slate-800 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <StatusChip status="CONFIRMADO" />
              <span>ESP32 (3,3 V) · Arduino UNO + Shield L293D (5 V) · Puente H L298N</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Resumen de Ingeniería — Grúa Torre Automatizada
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Sistema dual: modo <strong>Manual</strong> (mando Bluetooth al ESP32) y modo{' '}
              <strong>Automático</strong> (tablet por WiFi con registro de cargas en coordenadas
              cilíndricas <em>(r, θ, z)</em> —radio, ángulo y altura—, cálculo de contrapeso mínimo
              y traslado secuencial a bodega con electroimán de 12 V). Toda la electrónica vive en la
              caja de control Z1 separada, nunca en la contrapluma.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              onClick={() => onNavigateTab('library')}
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-sm font-medium transition whitespace-nowrap"
            >
              Ver Biblioteca ({components.length})
            </button>
            <button
              onClick={() => onNavigateTab('assembly')}
              className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition whitespace-nowrap"
            >
              Continuar Montaje ({assemblyPct} %)
            </button>
          </div>
        </div>

        {/* Métricas principales */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Cpu className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Componentes Confirmados</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1 tabular-nums">
              {confirmedCount} <span className="text-sm font-normal text-slate-400">/ {components.length}</span>
            </p>
          </div>
          <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <AlertTriangle className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span>Pendientes por Confirmar</span>
            </div>
            <p className="text-2xl font-bold text-amber-300 mt-1 tabular-nums">{pendingItems.length}</p>
          </div>
          <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Zap className="w-4 h-4 text-sky-400" aria-hidden="true" />
              <span>Cableado Calculado</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1 tabular-nums">
              {jumperSummary.totalDupontJumpers}{' '}
              <span className="text-xs font-normal text-slate-400">
                jumpers + {jumperSummary.totalScrewTerminalPairs} bornera
              </span>
            </p>
          </div>
          <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Wrench className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>Avance de Montaje</span>
            </div>
            <p className="text-2xl font-bold text-white mt-1 tabular-nums">
              {completedStepIds.length}{' '}
              <span className="text-sm font-normal text-slate-400">/ {totalStepsCount} pasos ({assemblyPct} %)</span>
            </p>
          </div>
        </div>
      </section>

      {/* Parámetros editables del usuario + Resoluciones en vivo */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-white">
              Dimensiones del Usuario, Calibración y Resoluciones
            </h3>
            <StatusChip
              status={
                params.slotsGiroN &&
                params.slotsCarroN &&
                params.slotsGanchoN &&
                params.drumDiameterCarroCm &&
                params.drumDiameterGanchoCm &&
                effectiveRatioI &&
                params.mastHeightCm !== null &&
                params.r0MinCm !== null &&
                params.counterweightDistDcpCm !== null
                  ? 'CONFIRMADO'
                  : 'POR CONFIRMAR'
              }
            />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Las medidas físicas de tu maqueta (caja, mástil, cabeza, pluma y bodega) las defines tú
            libremente sin restricciones. Solo completa los datos marcados{' '}
            <strong className="text-amber-300">POR CONFIRMAR</strong> cuando midas tus discos (N),
            tambores (D) y relación de giro (i) para calcular las resoluciones.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <label className="block">
              <span className="flex items-center justify-between gap-2 text-slate-300">
                <span>Ranuras disco Giro (N_giro)</span>
                {!params.slotsGiroN && <StatusChip status="POR CONFIRMAR" />}
              </span>
              <input
                type="number"
                min={1}
                placeholder="POR CONFIRMAR"
                value={params.slotsGiroN ?? ''}
                onChange={(e) =>
                  onUpdateParams({ slotsGiroN: e.target.value ? Number(e.target.value) : null })
                }
                className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white tabular-nums focus:border-amber-400 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="flex items-center justify-between gap-2 text-slate-300">
                <span>Relación de giro (i)</span>
                {!effectiveRatioI && <StatusChip status="POR CONFIRMAR" />}
              </span>
              <input
                type="number"
                step="0.01"
                min={0.1}
                placeholder="POR CONFIRMAR"
                value={
                  params.gearOptionGiro === 'A_PINON_CORONA' && params.pinionDiameterMm > 0
                    ? Number((params.crownDiameterMm / params.pinionDiameterMm).toFixed(2))
                    : (params.gearRatioGiroI ?? '')
                }
                disabled={params.gearOptionGiro === 'A_PINON_CORONA'}
                onChange={(e) =>
                  onUpdateParams({ gearRatioGiroI: e.target.value ? Number(e.target.value) : null })
                }
                className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white tabular-nums disabled:opacity-60 focus:border-amber-400 focus:outline-none"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-slate-300">Opción mecánica de giro (Opción A vs Opción B)</span>
              <select
                value={params.gearOptionGiro}
                onChange={(e) => {
                  const opt = e.target.value as UserEditableParams['gearOptionGiro'];
                  onUpdateParams({
                    gearOptionGiro: opt,
                    gearRatioGiroI:
                      opt === 'A_PINON_CORONA' && params.pinionDiameterMm > 0
                        ? Number((params.crownDiameterMm / params.pinionDiameterMm).toFixed(2))
                        : null,
                  });
                }}
                className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white focus:border-sky-400 focus:outline-none"
              >
                <option value="B_RUEDA_FRICCION">
                  Opción B (Sin engranajes): Rueda de fricción + seguidora con disco propio
                </option>
                <option value="A_PINON_CORONA">
                  Opción A: Piñón ({params.pinionDiameterMm} mm) + Corona ({params.crownDiameterMm} mm)
                </option>
              </select>
            </label>

            <label className="block">
              <span className="flex items-center justify-between gap-2 text-slate-300">
                <span>Ranuras Carro (N_carro) / Gancho (N_gancho)</span>
                {(!params.slotsCarroN || !params.slotsGanchoN) && (
                  <StatusChip status="POR CONFIRMAR" />
                )}
              </span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min={1}
                  placeholder="POR CONFIRMAR"
                  aria-label="Ranuras disco carro"
                  value={params.slotsCarroN ?? ''}
                  onChange={(e) =>
                    onUpdateParams({ slotsCarroN: e.target.value ? Number(e.target.value) : null })
                  }
                  className="w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-2 text-white tabular-nums"
                />
                <input
                  type="number"
                  min={1}
                  placeholder="POR CONFIRMAR"
                  aria-label="Ranuras disco gancho"
                  value={params.slotsGanchoN ?? ''}
                  onChange={(e) =>
                    onUpdateParams({ slotsGanchoN: e.target.value ? Number(e.target.value) : null })
                  }
                  className="w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-2 text-white tabular-nums"
                />
              </div>
            </label>

            <label className="block">
              <span className="flex items-center justify-between gap-2 text-slate-300">
                <span>Ø Tambores Carro / Gancho D (cm)</span>
                {(!params.drumDiameterCarroCm || !params.drumDiameterGanchoCm) && (
                  <StatusChip status="POR CONFIRMAR" />
                )}
              </span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  placeholder="POR CONFIRMAR"
                  aria-label="Diámetro tambor carro"
                  value={params.drumDiameterCarroCm ?? ''}
                  onChange={(e) =>
                    onUpdateParams({
                      drumDiameterCarroCm: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-2 text-white tabular-nums"
                />
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  placeholder="POR CONFIRMAR"
                  aria-label="Diámetro tambor gancho"
                  value={params.drumDiameterGanchoCm ?? ''}
                  onChange={(e) =>
                    onUpdateParams({
                      drumDiameterGanchoCm: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-2 text-white tabular-nums"
                />
              </div>
            </label>

            <label className="block">
              <span className="flex items-center justify-between gap-2 text-slate-300">
                <span>Altura mástil (cm) / Radio bodega Z7 (cm)</span>
                {params.mastHeightCm === null && <StatusChip status="POR CONFIRMAR" />}
              </span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="1"
                  min={1}
                  placeholder="POR CONFIRMAR"
                  aria-label="Altura del mástil"
                  value={params.mastHeightCm ?? ''}
                  onChange={(e) =>
                    onUpdateParams({ mastHeightCm: e.target.value ? Number(e.target.value) : null })
                  }
                  className="w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-2 text-white tabular-nums"
                />
                <input
                  type="number"
                  step="1"
                  min={1}
                  aria-label="Radio bodega Z7"
                  value={params.warehouseRadiusCm}
                  onChange={(e) =>
                    onUpdateParams({ warehouseRadiusCm: Number(e.target.value) || 0 })
                  }
                  className="w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-2 text-white tabular-nums"
                />
              </div>
            </label>

            <label className="block">
              <span className="flex items-center justify-between gap-2 text-slate-300">
                <span>Distancia contrapeso d_cp (cm) / Temp (°C)</span>
                {params.counterweightDistDcpCm === null && <StatusChip status="POR CONFIRMAR" />}
              </span>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.5"
                  min={1}
                  placeholder="POR CONFIRMAR"
                  aria-label="Distancia contrapeso d_cp"
                  value={params.counterweightDistDcpCm ?? ''}
                  onChange={(e) =>
                    onUpdateParams({
                      counterweightDistDcpCm: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-2 text-white tabular-nums"
                />
                <input
                  type="number"
                  step="1"
                  aria-label="Temperatura ambiente"
                  value={params.ambientTempC}
                  onChange={(e) => onUpdateParams({ ambientTempC: Number(e.target.value) || 25 })}
                  className="w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-2 text-white tabular-nums"
                />
              </div>
            </label>
          </div>

          {/* Fórmulas y resultados en vivo */}
          <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-4 space-y-2 text-xs">
            <div className="font-semibold text-slate-200 mb-1">
              Resultados en vivo (calculados desde tus medidas)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 tabular-nums">
              <div className="text-slate-300">
                v = 331,3 + 0,606·T ={' '}
                <strong className="text-emerald-300 font-mono">{soundSpeed.toFixed(1)} m/s</strong>
              </div>
              <div className="text-slate-300">
                Giro activa ={' '}
                <strong className={`font-mono ${resGiroDeg ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {resGiroDeg ? `${resGiroDeg.toFixed(2)} °/pulso` : 'POR CONFIRMAR'}
                </strong>
              </div>
              <div className="text-slate-300">
                Carro = π·D ÷ (2·N) ={' '}
                <strong className={`font-mono ${resCarroMm ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {resCarroMm ? `${resCarroMm.toFixed(2)} mm/pulso` : 'POR CONFIRMAR'}
                </strong>
              </div>
              <div className="text-slate-300">
                Gancho = π·D ÷ (2·N) ={' '}
                <strong className={`font-mono ${resGanchoMm ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {resGanchoMm ? `${resGanchoMm.toFixed(2)} mm/pulso` : 'POR CONFIRMAR'}
                </strong>
              </div>
              <div className="text-slate-300">
                Altura útil gancho ={' '}
                <strong
                  className={`font-mono ${usefulHookHeightCm !== null ? 'text-emerald-300' : 'text-amber-300'}`}
                >
                  {usefulHookHeightCm !== null
                    ? `${usefulHookHeightCm} cm (${params.mastHeightCm}−${params.hookBlockHeightCm}−${params.hallMarginCm})`
                    : 'POR CONFIRMAR'}
                </strong>
              </div>
              <div className="text-slate-300">
                Ocupación mástil ({params.mastInnerSideMm}×{params.mastInnerSideMm} mm) ={' '}
                <strong className="font-mono text-sky-300">{mastFillPct.toFixed(1)} %</strong>
              </div>
              <div className="sm:col-span-2 text-slate-300">
                Manguera Tramo A = mástil + {params.rizoReserveCm} cm rizo + 30 cm ={' '}
                <strong
                  className={`font-mono ${totalHarnessLengthCm ? 'text-emerald-300' : 'text-amber-300'}`}
                >
                  {totalHarnessLengthCm ? `${totalHarnessLengthCm} cm` : 'POR CONFIRMAR'}
                </strong>
              </div>
            </div>
            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              <strong>Comparativa de giro:</strong> Opción A ({params.pinionDiameterMm} mm /{' '}
              {params.crownDiameterMm} mm → i ={' '}
              {(params.crownDiameterMm / params.pinionDiameterMm).toFixed(1)}) da{' '}
              <strong>{resGiroOptADeg ? `${resGiroOptADeg.toFixed(2)}°/pulso` : 'POR CONFIRMAR'}</strong>.
              Opción B (según tu relación <em>i</em> medida) usa{' '}
              <strong>{resGiroDeg && params.gearOptionGiro === 'B_RUEDA_FRICCION' ? `${resGiroDeg.toFixed(2)}°/pulso` : 'POR CONFIRMAR (medir i)'}</strong>.
            </div>
          </div>
        </div>

        {/* Calculadora de contrapeso mínimo + Arquitectura POR DEFINIR */}
        <div className="space-y-6">
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-white">
                Cálculo de Contrapeso Mínimo (m_cp = 1,1 × máx(mᵢ·rᵢ) ÷ d_cp)
              </h3>
              <StatusChip status={minCounterweightG ? 'CONFIRMADO' : 'POR CONFIRMAR'} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 pr-2">Orden</th>
                    <th className="py-2 pr-2">Carga</th>
                    <th className="py-2 pr-2 text-right">Masa mᵢ (g)</th>
                    <th className="py-2 pr-2 text-right">Radio rᵢ (cm)</th>
                    <th className="py-2 pr-2 text-right">θᵢ (°)</th>
                    <th className="py-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 tabular-nums">
                  {params.activeLoads.map((l) => (
                    <tr key={l.id} className="text-slate-200">
                      <td className="py-2 pr-2 font-mono">{l.order}</td>
                      <td className="py-2 pr-2">{l.name}</td>
                      <td className="py-2 pr-2 text-right font-mono">{l.massG}</td>
                      <td className="py-2 pr-2 text-right font-mono">{l.rCm}</td>
                      <td className="py-2 pr-2 text-right font-mono">{l.thetaDeg}°</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => handleRemoveLoad(l.id)}
                          aria-label={`Eliminar ${l.name}`}
                          className="text-slate-400 hover:text-rose-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleAddLoad} className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <input
                type="text"
                placeholder="Nombre carga"
                value={newLoadName}
                onChange={(e) => setNewLoadName(e.target.value)}
                className="col-span-2 sm:col-span-1 rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
              />
              <input
                type="number"
                placeholder="Masa (g)"
                value={newLoadMass}
                onChange={(e) => setNewLoadMass(e.target.value)}
                className="rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white tabular-nums"
              />
              <input
                type="number"
                placeholder="Radio r (cm)"
                value={newLoadR}
                onChange={(e) => setNewLoadR(e.target.value)}
                className="rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white tabular-nums"
              />
              <input
                type="number"
                placeholder="θ (°)"
                value={newLoadTheta}
                onChange={(e) => setNewLoadTheta(e.target.value)}
                className="rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white tabular-nums"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-white font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar
              </button>
            </form>

            <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-400">Contrapeso mínimo requerido (para todas las cargas): </span>
                <strong className={`font-mono text-sm ${minCounterweightG ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {minCounterweightG ? `${minCounterweightG.toFixed(1)} g` : 'POR CONFIRMAR (falta d_cp)'}
                </strong>
              </div>
              <label className="inline-flex items-center gap-2 text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={params.counterweightPlaced}
                  onChange={(e) => onUpdateParams({ counterweightPlaced: e.target.checked })}
                  className="rounded border-slate-600 bg-slate-900 text-emerald-500"
                />
                <span>Contrapeso colocado en Z4</span>
              </label>
            </div>
          </div>

          {/* Sección explícita POR DEFINIR (firmware / UART / WebSocket) */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Protocolo ESP32↔UNO, WebSocket y Firmware
              </h3>
              <StatusChip status="POR DEFINIR" />
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              De acuerdo con las decisiones cerradas de arquitectura, el protocolo serial ESP32↔UNO,
              el formato de tramas WebSocket con la tablet y el código fuente (firmware) quedan
              vacíos bajo el rótulo <strong>POR DEFINIR</strong>, sin código inventado.
            </p>
            <div className="rounded-lg bg-[#0B1120] border border-dashed border-slate-700 p-4 text-center text-xs font-mono text-violet-300">
              [ SECCIÓN DE CÓDIGO / FIRMWARE / PROTOCOLO: POR DEFINIR ]
            </div>
          </div>
        </div>
      </section>

      {/* Pendientes por confirmar/comprar + Regla de oro y errores comunes */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-3">
          <h3 className="text-base font-semibold text-amber-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Pendientes por Fotografiar, Medir o Comprar ({pendingItems.length})</span>
          </h3>
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 text-xs">
            {pendingItems.map((item) => (
              <div
                key={item.id}
                className="rounded-lg bg-[#0B1120] border border-slate-800 p-3 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-100">{item.name}</span>
                  <StatusChip status={item.status} />
                </div>
                <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                  {item.toConfirm.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-3">
          <h3 className="text-base font-semibold text-rose-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Regla de Oro y Errores Comunes</span>
          </h3>
          <div className="rounded-lg bg-rose-950/30 border border-rose-500/40 p-3 text-xs text-rose-200 leading-relaxed">
            <strong>Regla de oro:</strong> nunca se cablea con energía. Encendido: primero{' '}
            <strong>5 V</strong>, el <strong>12 V</strong> al final. Apagado: al revés (primero
            apagar 12 V con el interruptor general, luego 5 V). Nunca conectar USB y el riel de 5 V a la vez.
          </div>
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 text-xs">
            {COMMON_ERRORS.map((err) => (
              <div key={err.id} className="rounded-lg bg-[#0B1120] border border-slate-800 p-3 space-y-1">
                <div className="font-semibold text-slate-100">{err.title}</div>
                <div className="text-slate-400">
                  <span className="text-rose-400 font-medium">Consecuencia:</span> {err.consequence}
                </div>
                <div className="text-emerald-300">
                  <span className="font-medium">Prevención:</span> {err.prevention}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resumen compacto de las 8 zonas */}
      <section className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-sky-400" aria-hidden="true" />
            <span>Nomenclatura Cerrada de Zonas Físicas (Z1–Z8)</span>
          </h3>
          <div className="flex items-center gap-4">
            <button
              onClick={() => onNavigateTab('physical')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              Abrir Grúa Física 3D y Dimensiones →
            </button>
            <button
              onClick={() => onNavigateTab('zones')}
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
            >
              Abrir Plano de Zonas →
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
          {ZONES.map((z) => (
            <div key={z.id} className="rounded-lg bg-[#0B1120] border border-slate-800 p-3 space-y-1">
              <div className="font-semibold text-white">{z.name}</div>
              <p className="text-slate-400 leading-relaxed">{z.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
