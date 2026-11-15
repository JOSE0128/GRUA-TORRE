import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import {
  CraneComponent,
  PinAssignment,
  UserEditableParams,
} from '../types/crane';
import { auditAssemblyGuide, runProjectValidation } from '../utils/validator';

interface ProjectValidatorProps {
  pinAssignments: PinAssignment[];
  components: CraneComponent[];
  params: UserEditableParams;
  onUpdateParams: (next: Partial<UserEditableParams>) => void;
  onNavigateTab: (tab: string) => void;
}

export const ProjectValidator: React.FC<ProjectValidatorProps> = ({
  pinAssignments,
  components,
  params,
  onUpdateParams,
  onNavigateTab,
}) => {
  const [lastValidatedAt, setLastValidatedAt] = useState<string | null>(null);

  const report = useMemo(
    () => runProjectValidation(pinAssignments, components, params),
    [pinAssignments, components, params]
  );

  const assemblyAudit = useMemo(() => auditAssemblyGuide(), []);

  const handleValidateClick = () => {
    setLastValidatedAt(new Date().toLocaleTimeString('es-CO'));
  };

  return (
    <div className="space-y-6">
      {/* Cabecera con botón Validar proyecto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl bg-[#0F172A] border border-slate-800 p-5">
        <div>
          <h2 className="text-xl font-bold text-white">
            Validador Eléctrico, de Guía de Montaje e Inventario
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Debe arrojar <strong>0 errores</strong> antes de habilitar las exportaciones finales del
            proyecto. Las dimensiones físicas de la grúa las defines libremente sin validaciones ni
            restricciones.
          </p>
        </div>
        <button
          onClick={handleValidateClick}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition whitespace-nowrap shrink-0"
        >
          <ShieldCheck className="w-4 h-4" />
          Validar proyecto
        </button>
      </div>

      {/* Estado global Pasa / Falla */}
      <div
        className={`rounded-xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          report.canExport
            ? 'bg-emerald-950/25 border-emerald-500/50'
            : 'bg-rose-950/35 border-rose-500/60'
        }`}
      >
        <div className="flex items-start gap-3">
          {report.canExport ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="text-lg font-bold text-white">
              {report.canExport
                ? 'PROYECTO APROBADO (0 errores críticos — Exportación habilitada)'
                : `VALIDACIÓN FALLIDA (${report.errorCount} error(es) crítico(s) — Exportación bloqueada)`}
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              {report.warningCount} advertencia(s) informativa(s)
              {lastValidatedAt ? ` · Última comprobación manual: ${lastValidatedAt}` : ''}
            </div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {!report.canExport ? (
            <button
              onClick={() => onNavigateTab('designer')}
              className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold whitespace-nowrap"
            >
              Corregir en Diseñador
            </button>
          ) : (
            <button
              onClick={() => onNavigateTab('exports')}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap"
            >
              Ir a Exportaciones →
            </button>
          )}
        </div>
      </div>

      {/* Presupuesto de corriente editable (12 V 2 A + 0,6 A L293D) */}
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
        <h3 className="text-sm font-bold text-white">
          Simulación de Corrientes (fuente 12 V 2 A, máx. 2 motores a la vez + L293D 0,6 A)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <label className="block">
            <span className="text-slate-300">
              Corriente por motor activo (A) — límite M1 L293D: 0,60 A
            </span>
            <input
              type="number"
              step="0.05"
              min="0.1"
              max="2.0"
              value={params.estimatedMaxCurrentMotorA}
              onChange={(e) =>
                onUpdateParams({ estimatedMaxCurrentMotorA: Number(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white font-mono tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-slate-300">Corriente electroimán M2 (A)</span>
            <input
              type="number"
              step="0.05"
              min="0.05"
              max="1.5"
              value={params.estimatedMaxCurrentElectromagnetA}
              onChange={(e) =>
                onUpdateParams({
                  estimatedMaxCurrentElectromagnetA: Number(e.target.value) || 0,
                })
              }
              className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white font-mono tabular-nums"
            />
          </label>
          <label className="block">
            <span className="text-slate-300">Corriente bombillo M3 a PWM ≈ 40 % (A)</span>
            <input
              type="number"
              step="0.05"
              min="0.05"
              max="1.0"
              value={params.estimatedMaxCurrentBulbA}
              onChange={(e) =>
                onUpdateParams({ estimatedMaxCurrentBulbA: Number(e.target.value) || 0 })
              }
              className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white font-mono tabular-nums"
            />
          </label>
        </div>
      </div>

      {/* Auditoría de la Guía de Montaje (Sección 7) */}
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              Auditoría de la Guía de Montaje (Sección 7)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprobación automática de cada paso: origen, destino, tipo de jumper, color,
              coordenadas en P1/P2, prueba con multímetro y ausencia total de frases ambiguas.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono ${
              assemblyAudit.problemCount === 0
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
                : 'bg-rose-600 text-white'
            }`}
          >
            {assemblyAudit.problemCount === 0
              ? '0 PROBLEMAS'
              : `${assemblyAudit.problemCount} PROBLEMA(S)`}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs tabular-nums">
          <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3">
            <div className="text-slate-400">Etapas</div>
            <div className="text-lg font-bold text-white font-mono">{assemblyAudit.totalStages}</div>
            <div className="text-[11px] text-slate-400">E0 a E12</div>
          </div>
          <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3">
            <div className="text-slate-400">Pasos auditados</div>
            <div className="text-lg font-bold text-sky-300 font-mono">{assemblyAudit.totalSteps}</div>
            <div className="text-[11px] text-slate-400">1 conexión / paso</div>
          </div>
          <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3">
            <div className="text-slate-400">Conexiones maestras</div>
            <div className="text-lg font-bold text-white font-mono">
              {assemblyAudit.totalDefinitiveConnections}
            </div>
            <div className="text-[11px] text-slate-400">Tabla definitiva</div>
          </div>
          <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3">
            <div className="text-slate-400">Frases ambiguas</div>
            <div
              className={`text-lg font-bold font-mono ${
                assemblyAudit.forbiddenPhraseHits === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {assemblyAudit.forbiddenPhraseHits}
            </div>
            <div className="text-[11px] text-slate-400">«ver arriba / como antes»</div>
          </div>
          <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3">
            <div className="text-slate-400">Problemas detectados</div>
            <div
              className={`text-lg font-bold font-mono ${
                assemblyAudit.problemCount === 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {assemblyAudit.problemCount}
            </div>
            <div className="text-[11px] text-slate-400">Campos y coordenadas</div>
          </div>
        </div>

        {assemblyAudit.issues.length > 0 && (
          <div className="rounded-lg bg-rose-950/30 border border-rose-500/40 p-3 text-xs text-rose-200 space-y-1">
            {assemblyAudit.issues.map((iss, idx) => (
              <div key={idx}>
                <strong>{iss.source}:</strong> {iss.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lista de los criterios */}
      <div className="space-y-3">
        {report.checks.map((chk) => (
          <div
            key={chk.id}
            className={`rounded-xl border p-4 flex flex-col md:flex-row md:items-start justify-between gap-4 ${
              chk.severity === 'ERROR' && !chk.passed
                ? 'bg-rose-950/25 border-rose-500/50'
                : chk.severity === 'ADVERTENCIA'
                  ? 'bg-amber-950/20 border-amber-500/40'
                  : 'bg-[#0F172A] border-slate-800'
            }`}
          >
            <div className="flex items-start gap-3">
              {chk.passed && chk.severity === 'OK' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              )}
              {chk.severity === 'ADVERTENCIA' && (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              {!chk.passed && chk.severity === 'ERROR' && (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-slate-400">{chk.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-sm font-bold text-white">{chk.title}</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{chk.detail}</p>
                <p className="text-sky-300">
                  <strong>Acción concreta:</strong> {chk.fixAction}
                </p>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded text-[11px] font-bold font-mono shrink-0 self-start ${
                !chk.passed && chk.severity === 'ERROR'
                  ? 'bg-rose-600 text-white'
                  : chk.severity === 'ADVERTENCIA'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {!chk.passed && chk.severity === 'ERROR'
                ? 'FALLA'
                : chk.severity === 'ADVERTENCIA'
                  ? 'ADVERTENCIA'
                  : 'PASA'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
