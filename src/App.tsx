import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Cable,
  CheckCircle2,
  ClipboardList,
  Code2,
  Compass,
  Cpu,
  Download,
  FileText,
  Home,
  Layers,
  Package,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Tablet,
  Wrench,
} from 'lucide-react';
import { AcademicReport } from './components/AcademicReport';
import { AdvisorCraneDrawer } from './components/AdvisorCraneDrawer';
import { AssemblyGuide } from './components/AssemblyGuide';
import { CodeGeneratorAndPanel } from './components/CodeGeneratorAndPanel';
import { ComponentLibrary } from './components/ComponentLibrary';
import { ElectricalSchematics } from './components/ElectricalSchematics';
import { EngineeringNotebook } from './components/EngineeringNotebook';
import { ExportsCenter } from './components/ExportsCenter';
import { HomeDashboard } from './components/HomeDashboard';
import { InstallationGuide } from './components/InstallationGuide';
import { InteractiveDesigner } from './components/InteractiveDesigner';
import { PhysicalCraneStudio } from './components/PhysicalCraneStudio';
import { ProjectValidator } from './components/ProjectValidator';
import { OfflineIndicator, PWAInstallButton } from './components/PWAControls';
import { TabletAndProjectHub } from './components/TabletAndProjectHub';
import { WorkshopModeModal } from './components/WorkshopModeModal';
import { ZonesAndHarness } from './components/ZonesAndHarness';
import { ASSEMBLY_STAGES } from './data/assemblyGuideData';
import {
  DEFAULT_EDITABLE_PARAMS,
  DEFAULT_PIN_ASSIGNMENTS,
  DEFAULT_REAL_MEASUREMENTS,
  HARNESS_CONDUCTORS,
  INVENTORY_COMPONENTS,
} from './data/craneData';
import {
  AdvisorPatchProposal,
  CraneComponent,
  HarnessConductor,
  LessonLearnedItem,
  NotebookLogRow,
  PinAssignment,
  ProjectChangeEvent,
  ProjectVersionSnapshot,
  RealMeasurementRow,
  UserEditableParams,
} from './types/crane';
import { buildProjectJson, computeProjectJsonDiff } from './utils/projectJson';
import { runProjectValidation } from './utils/validator';

type TabId =
  | 'home'
  | 'library'
  | 'zones'
  | 'physical'
  | 'schematics'
  | 'designer'
  | 'assembly'
  | 'tablet'
  | 'codegen'
  | 'install'
  | 'validator'
  | 'report'
  | 'notebook'
  | 'exports';

const STORAGE_KEY = 'crane_studio_workspace_v1';
const SNAPSHOTS_KEY = 'crane_studio_snapshots_v1';

interface PersistedState {
  components: CraneComponent[];
  pinAssignments: PinAssignment[];
  conductors: HarnessConductor[];
  params: UserEditableParams;
  completedStepIds: string[];
  logRows: NotebookLogRow[];
  realMeasurements: RealMeasurementRow[];
  lessonsLearned: LessonLearnedItem[];
}

function createInitialLogRows(): NotebookLogRow[] {
  return [
    { id: 'LOG-1', date: '', testName: '', expectedValue: '', measuredValue: '', approved: '', notes: '' },
    { id: 'LOG-2', date: '', testName: '', expectedValue: '', measuredValue: '', approved: '', notes: '' },
    { id: 'LOG-3', date: '', testName: '', expectedValue: '', measuredValue: '', approved: '', notes: '' },
  ];
}

function createInitialLessons(): LessonLearnedItem[] {
  return [{ id: 'LES-1', topic: '', lesson: '', applyNextTime: '' }];
}

function mergePersistedComponents(stored: CraneComponent[]): CraneComponent[] {
  const baseById = new Map(INVENTORY_COMPONENTS.map((c) => [c.id, c]));
  const merged = stored.map((item) => {
    const base = baseById.get(item.id);
    if (!base) {
      return {
        ...item,
        dimensionsMm: item.dimensionsMm || 'POR CONFIRMAR (medir con regla)',
        dimensionsStatus: item.dimensionsStatus || 'POR CONFIRMAR',
      };
    }
    return {
      ...base,
      ...item,
      dimensionsMm: item.dimensionsMm || base.dimensionsMm,
      dimensionsStatus: item.dimensionsStatus || base.dimensionsStatus,
      poolGroup: base.poolGroup,
      poolNote: base.poolNote,
    };
  });
  for (const base of INVENTORY_COMPONENTS) {
    if (!merged.some((m) => m.id === base.id)) {
      merged.push(base);
    }
  }
  return merged;
}

function loadInitialState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      return {
        components:
          Array.isArray(parsed.components) && parsed.components.length > 0
            ? mergePersistedComponents(parsed.components)
            : INVENTORY_COMPONENTS,
        pinAssignments:
          Array.isArray(parsed.pinAssignments) && parsed.pinAssignments.length > 0
            ? parsed.pinAssignments
            : DEFAULT_PIN_ASSIGNMENTS,
        conductors:
          Array.isArray(parsed.conductors) && parsed.conductors.length > 0
            ? parsed.conductors
            : HARNESS_CONDUCTORS,
        params: parsed.params
          ? { ...DEFAULT_EDITABLE_PARAMS, ...parsed.params }
          : DEFAULT_EDITABLE_PARAMS,
        completedStepIds: Array.isArray(parsed.completedStepIds) ? parsed.completedStepIds : [],
        logRows:
          Array.isArray(parsed.logRows) && parsed.logRows.length > 0
            ? parsed.logRows
            : createInitialLogRows(),
        realMeasurements:
          Array.isArray(parsed.realMeasurements) && parsed.realMeasurements.length > 0
            ? parsed.realMeasurements
            : DEFAULT_REAL_MEASUREMENTS,
        lessonsLearned:
          Array.isArray(parsed.lessonsLearned) && parsed.lessonsLearned.length > 0
            ? parsed.lessonsLearned
            : createInitialLessons(),
      };
    }
  } catch {
    // Fallback to clean defaults if storage is corrupted or unavailable
  }
  return {
    components: INVENTORY_COMPONENTS,
    pinAssignments: DEFAULT_PIN_ASSIGNMENTS,
    conductors: HARNESS_CONDUCTORS,
    params: DEFAULT_EDITABLE_PARAMS,
    completedStepIds: [],
    logRows: createInitialLogRows(),
    realMeasurements: DEFAULT_REAL_MEASUREMENTS,
    lessonsLearned: createInitialLessons(),
  };
}

export default function App() {
  const initial = useMemo(() => loadInitialState(), []);

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [components, setComponents] = useState<CraneComponent[]>(initial.components);
  const [pinAssignments, setPinAssignments] = useState<PinAssignment[]>(initial.pinAssignments);
  const [conductors, setConductors] = useState<HarnessConductor[]>(initial.conductors);
  const [params, setParams] = useState<UserEditableParams>(initial.params);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>(initial.completedStepIds);
  const [logRows, setLogRows] = useState<NotebookLogRow[]>(initial.logRows);
  const [realMeasurements, setRealMeasurements] = useState<RealMeasurementRow[]>(initial.realMeasurements);
  const [lessonsLearned, setLessonsLearned] = useState<LessonLearnedItem[]>(initial.lessonsLearned);
  const [virtualEstop, setVirtualEstop] = useState<boolean>(false);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [workshopOpen, setWorkshopOpen] = useState<boolean>(false);
  const [recentChanges, setRecentChanges] = useState<ProjectChangeEvent[]>([]);
  const [snapshots, setSnapshots] = useState<ProjectVersionSnapshot[]>(() => {
    try {
      const raw = localStorage.getItem(SNAPSHOTS_KEY);
      return raw ? (JSON.parse(raw) as ProjectVersionSnapshot[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const payload: PersistedState = {
        components,
        pinAssignments,
        conductors,
        params,
        completedStepIds,
        logRows,
        realMeasurements,
        lessonsLearned,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors (e.g. large uploaded images)
    }
  }, [components, pinAssignments, conductors, params, completedStepIds, logRows, realMeasurements, lessonsLearned]);

  useEffect(() => {
    try {
      localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(snapshots.slice(0, 15)));
    } catch {
      // ignore
    }
  }, [snapshots]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const totalStepsCount = useMemo(
    () => ASSEMBLY_STAGES.reduce((acc, s) => acc + s.steps.length, 0),
    []
  );

  const projectJson = useMemo(
    () => buildProjectJson(params, pinAssignments, components),
    [params, pinAssignments, components]
  );

  const prevProjectJsonRef = useRef(projectJson);
  useEffect(() => {
    const diff = computeProjectJsonDiff(prevProjectJsonRef.current, projectJson);
    prevProjectJsonRef.current = projectJson;
    if (diff) {
      setRecentChanges((prev) => [diff, ...prev].slice(0, 15));
      setNotice(
        `${diff.summary} (${diff.details[0] || ''}) → Regenerado automáticamente: ${diff.affectedModules.join(', ')}.`
      );
    }
  }, [projectJson]);

  const validation = useMemo(
    () => runProjectValidation(pinAssignments, components, params),
    [pinAssignments, components, params]
  );

  const handleUpdateParams = (next: Partial<UserEditableParams>) => {
    setParams((prev) => ({ ...prev, ...next }));
  };

  const handleUpdateComponent = (id: string, patch: Partial<CraneComponent>) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleAddComponent = (newComp: CraneComponent) => {
    setComponents((prev) => [newComp, ...prev]);
    setNotice(`Componente «${newComp.name}» añadido a la biblioteca.`);
  };

  const handleUpdateConductorLength = (index: number, extraLengthCm: number) => {
    setConductors((prev) =>
      prev.map((c) => (c.index === index ? { ...c, extraLengthCm } : c))
    );
  };

  const handleUpdatePinAssignment = (id: string, patch: Partial<PinAssignment>) => {
    setPinAssignments((prev) => prev.map((pa) => (pa.id === id ? { ...pa, ...patch } : pa)));
  };

  const handleResetPins = () => {
    setPinAssignments(DEFAULT_PIN_ASSIGNMENTS);
    setNotice('Pines restablecidos a la arquitectura base confirmada.');
  };

  const handleToggleStepCompleted = (stepId: string) => {
    setCompletedStepIds((prev) =>
      prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
    );
  };

  const handleAddLogRow = () => {
    setLogRows((prev) => [
      ...prev,
      {
        id: `LOG-${Date.now()}`,
        date: '',
        testName: '',
        expectedValue: '',
        measuredValue: '',
        approved: '',
        notes: '',
      },
    ]);
  };

  const handleUpdateLogRow = (id: string, patch: Partial<NotebookLogRow>) => {
    setLogRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleDeleteLogRow = (id: string) => {
    setLogRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleUpdateMeasurement = (id: string, patch: Partial<RealMeasurementRow>) => {
    setRealMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  };

  const handleAddLesson = () => {
    setLessonsLearned((prev) => [
      ...prev,
      { id: `LES-${Date.now()}`, topic: '', lesson: '', applyNextTime: '' },
    ]);
  };

  const handleUpdateLesson = (id: string, patch: Partial<LessonLearnedItem>) => {
    setLessonsLearned((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const handleDeleteLesson = (id: string) => {
    setLessonsLearned((prev) => prev.filter((l) => l.id !== id));
  };

  const handleResetWorkspace = () => {
    setComponents(INVENTORY_COMPONENTS);
    setPinAssignments(DEFAULT_PIN_ASSIGNMENTS);
    setConductors(HARNESS_CONDUCTORS);
    setParams(DEFAULT_EDITABLE_PARAMS);
    setCompletedStepIds([]);
    setLogRows(createInitialLogRows());
    setRealMeasurements(DEFAULT_REAL_MEASUREMENTS);
    setLessonsLearned(createInitialLessons());
    setVirtualEstop(false);
    setConfirmReset(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setNotice('Espacio de trabajo restablecido a los valores iniciales del proyecto.');
  };

  const triggerDownload = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportConfig = (format: 'json' | 'table') => {
    const check = runProjectValidation(pinAssignments, components, params);
    if (!check.canExport) {
      setNotice(
        `Exportación bloqueada: corrige ${check.errorCount} error(es) en el Validador antes de exportar.`
      );
      setActiveTab('validator');
      return;
    }

    if (format === 'json') {
      const payload = {
        app: 'Crane Engineering Studio',
        exportedAt: new Date().toISOString(),
        validation: {
          errorCount: check.errorCount,
          warningCount: check.warningCount,
          canExport: check.canExport,
        },
        params,
        pinAssignments,
        conductors,
        components,
        completedStepIds,
        logRows,
        realMeasurements,
        lessonsLearned,
      };
      triggerDownload(
        'crane-engineering-studio-config.json',
        JSON.stringify(payload, null, 2),
        'application/json;charset=utf-8;'
      );
      setNotice('Descargado archivo crane-engineering-studio-config.json.');
    } else {
      const lines = [
        '# Crane Engineering Studio — Tabla Maestra de Pines (As-Built)',
        '',
        '| ID | Controlador | Pin | Componente | Señal | Voltaje origen | Divisor | Notas |',
        '|---|---|---|---|---|---|---|---|',
        ...pinAssignments.map(
          (pa) =>
            `| ${pa.id} | ${pa.controller} | ${pa.pin} | ${pa.componentLabel} | ${pa.signalName} | ${pa.sourceVoltage} | ${
              pa.usesDivider ? 'Sí' : 'No'
            } | ${pa.notes} |`
        ),
      ];
      triggerDownload(
        'crane-engineering-studio-pines.md',
        lines.join('\n'),
        'text/markdown;charset=utf-8;'
      );
      setNotice('Descargado archivo crane-engineering-studio-pines.md.');
    }
  };

  const handleImportProjectJson = (rawJson: string): { ok: boolean; message: string } => {
    try {
      const parsed = JSON.parse(rawJson) as Partial<PersistedState> & {
        app?: string;
        schemaVersion?: string;
        pins?: PinAssignment[];
        calibration?: Record<string, unknown>;
        network?: Record<string, unknown>;
        loads?: UserEditableParams['activeLoads'];
      };
      if (!parsed || typeof parsed !== 'object') {
        return {
          ok: false,
          message: 'El archivo no tiene una estructura JSON válida.',
        };
      }
      if (parsed.schemaVersion === '2.0.0' && Array.isArray(parsed.pins)) {
        setPinAssignments(parsed.pins);
        if (parsed.calibration || parsed.network || parsed.loads) {
          setParams((prev) => ({
            ...prev,
            ...(parsed.calibration as Partial<UserEditableParams>),
            wifiSsid: (parsed.network?.wifiSsid as string) ?? prev.wifiSsid,
            wifiPassword: (parsed.network?.wifiPassword as string) ?? prev.wifiPassword,
            useMdns: (parsed.network?.useMdns as boolean) ?? prev.useMdns,
            operatorPinEnabled: (parsed.network?.operatorPinEnabled as boolean) ?? prev.operatorPinEnabled,
            operatorPin: (parsed.network?.operatorPin as string) ?? prev.operatorPin,
            otaEnabled: (parsed.network?.otaEnabled as boolean) ?? prev.otaEnabled,
            activeLoads: Array.isArray(parsed.loads) ? parsed.loads : prev.activeLoads,
          }));
        }
        const msg = 'project.json (v2.0.0) importado y propagado a todos los módulos.';
        setNotice(msg);
        return { ok: true, message: msg };
      }

      if (!parsed.params && !parsed.pinAssignments) {
        return {
          ok: false,
          message: 'El archivo no tiene una estructura válida de Crane Engineering Studio.',
        };
      }
      if (parsed.params && typeof parsed.params === 'object') {
        setParams({ ...DEFAULT_EDITABLE_PARAMS, ...parsed.params });
      }
      if (Array.isArray(parsed.pinAssignments) && parsed.pinAssignments.length > 0) {
        setPinAssignments(parsed.pinAssignments);
      }
      if (Array.isArray(parsed.conductors) && parsed.conductors.length > 0) {
        setConductors(parsed.conductors);
      }
      if (Array.isArray(parsed.components) && parsed.components.length > 0) {
        setComponents(mergePersistedComponents(parsed.components));
      }
      if (Array.isArray(parsed.completedStepIds)) {
        setCompletedStepIds(parsed.completedStepIds);
      }
      if (Array.isArray(parsed.logRows) && parsed.logRows.length > 0) {
        setLogRows(parsed.logRows);
      }
      if (Array.isArray(parsed.realMeasurements) && parsed.realMeasurements.length > 0) {
        setRealMeasurements(parsed.realMeasurements);
      }
      if (Array.isArray(parsed.lessonsLearned) && parsed.lessonsLearned.length > 0) {
        setLessonsLearned(parsed.lessonsLearned);
      }
      const msg = 'Proyecto importado correctamente desde JSON.';
      setNotice(msg);
      return { ok: true, message: msg };
    } catch {
      return {
        ok: false,
        message: 'Error al leer el archivo: verifica que sea un JSON válido sin corrupción.',
      };
    }
  };

  const handleCreateSnapshot = (label: string) => {
    const snap: ProjectVersionSnapshot = {
      id: `SNAP-${Date.now()}`,
      timestamp: new Date().toLocaleString('es-CO'),
      label,
      summary: `${pinAssignments.filter((p) => p.pin !== p.defaultPin).length} pin(es) modificados · ${params.activeLoads.length} carga(s)`,
      projectJson,
      params,
      pinAssignments,
    };
    setSnapshots((prev) => [snap, ...prev].slice(0, 15));
    setNotice(`Versión «${label}» guardada en Historial.`);
  };

  const handleRestoreSnapshot = (id: string) => {
    const found = snapshots.find((s) => s.id === id);
    if (!found) return;
    setParams(found.params);
    setPinAssignments(found.pinAssignments);
    setNotice(`Versión «${found.label}» restaurada en todos los módulos.`);
  };

  const handleApplyAdvisorPatch = (patch: AdvisorPatchProposal) => {
    if (patch.paramsPatch) {
      setParams((prev) => ({ ...prev, ...patch.paramsPatch }));
    }
    if (patch.pinPatches && patch.pinPatches.length > 0) {
      setPinAssignments((prev) =>
        prev.map((p) => {
          const hit = patch.pinPatches?.find((pp) => pp.id === p.id);
          return hit ? { ...p, pin: hit.pin, notes: hit.notes ?? p.notes } : p;
        })
      );
    }
    handleCreateSnapshot(`Asesor: ${patch.description}`);
    setNotice(`Cambio del Asesor aplicado: ${patch.description}`);
    return { ok: true, message: 'Aplicado' };
  };

  const handleExportAdvisorToNotebook = (summaryText: string) => {
    setLessonsLearned((prev) => [
      {
        id: `LES-${Date.now()}`,
        topic: 'Consulta Asesor Crane',
        lesson: summaryText,
        applyNextTime: 'Verificar siempre con multímetro según lámina citada.',
      },
      ...prev,
    ]);
    setNotice('Resumen del Asesor Crane guardado en Lecciones Aprendidas del Cuaderno.');
  };

  const navItems: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Inicio', icon: <Home className="w-4 h-4" /> },
    { id: 'tablet', label: 'Tablet y project.json', icon: <Tablet className="w-4 h-4" /> },
    { id: 'library', label: 'Biblioteca', icon: <Cpu className="w-4 h-4" /> },
    { id: 'zones', label: 'Zonas y Manguera', icon: <Cable className="w-4 h-4" /> },
    { id: 'physical', label: 'Grúa Física', icon: <Compass className="w-4 h-4" /> },
    { id: 'schematics', label: 'Planos de Conexión', icon: <Layers className="w-4 h-4" /> },
    { id: 'designer', label: 'Diseñador', icon: <Sliders className="w-4 h-4" /> },
    { id: 'assembly', label: 'Montaje E0–E12', icon: <Wrench className="w-4 h-4" /> },
    { id: 'codegen', label: 'Código y Simulador', icon: <Code2 className="w-4 h-4" /> },
    { id: 'install', label: 'Instalación', icon: <Package className="w-4 h-4" /> },
    { id: 'validator', label: 'Validador', icon: <ShieldCheck className="w-4 h-4" /> },
    { id: 'report', label: 'Informe UIS', icon: <FileText className="w-4 h-4" /> },
    { id: 'notebook', label: 'Cuaderno', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'exports', label: 'Exportar / BOM', icon: <Download className="w-4 h-4" /> },
  ];

  const isLightDocumentView = activeTab === 'report' || activeTab === 'notebook';

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 flex flex-col">
      <OfflineIndicator />
      {/* Barra superior del entorno de ingeniería (oculta al imprimir PDF) */}
      <header className="no-print sticky top-0 z-40 border-b border-slate-800/90 bg-[#0B1120]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white truncate">
                  Crane Engineering Studio
                </h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 whitespace-nowrap shrink-0">
                  Grúa Torre Automatizada
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Ingeniería mecatrónica · Fuente única project.json · Firmware ESP32+UNO · Montaje E0–E12
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <PWAInstallButton />
            <button
              onClick={() => setWorkshopOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 whitespace-nowrap"
              title="Abrir guía paso a paso de alto contraste para el taller"
            >
              <Wrench className="w-3.5 h-3.5" />
              Modo Taller
            </button>
            <button
              onClick={() => setActiveTab('validator')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap ${
                validation.errorCount === 0
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/80'
                  : 'bg-rose-950/60 border-rose-500/50 text-rose-200 hover:bg-rose-950/90'
              }`}
              title="Abrir Validador del proyecto"
            >
              {validation.errorCount === 0 ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {validation.errorCount === 0
                ? 'Validador: 0 errores'
                : `Validador: ${validation.errorCount} error(es)`}
            </button>

            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 whitespace-nowrap"
                title="Restablecer cambios guardados"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer
              </button>
            ) : (
              <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-500/40 rounded-lg px-2 py-1">
                <span className="text-[11px] text-rose-200 whitespace-nowrap">¿Borrar ediciones?</span>
                <button
                  onClick={handleResetWorkspace}
                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold"
                >
                  Sí
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]"
                >
                  No
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Barra de navegación horizontal */}
        <nav
          aria-label="Módulos de Crane Engineering Studio"
          className="max-w-7xl mx-auto px-4 sm:px-6 pb-2.5 flex items-center gap-1.5 overflow-x-auto"
        >
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap shrink-0 border ${
                  active
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-[#0F172A] border-slate-800 text-slate-300 hover:border-slate-600 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </header>

      {/* Notificación flotante no intrusiva */}
      {notice && (
        <div className="no-print max-w-7xl w-full mx-auto px-4 sm:px-6 pt-3">
          <div className="rounded-lg bg-emerald-950/70 border border-emerald-500/50 px-4 py-2.5 text-xs text-emerald-100 flex items-center justify-between gap-3">
            <span>{notice}</span>
            <button
              onClick={() => setNotice(null)}
              className="text-emerald-300 hover:text-white font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <main
        className={`flex-1 w-full mx-auto ${
          isLightDocumentView
            ? 'max-w-7xl px-4 sm:px-6 py-6'
            : 'max-w-7xl px-4 sm:px-6 py-6'
        }`}
      >
        {activeTab === 'home' && (
          <HomeDashboard
            components={components}
            params={params}
            completedStepIds={completedStepIds}
            totalStepsCount={totalStepsCount}
            onUpdateParams={handleUpdateParams}
            onNavigateTab={(tab) => setActiveTab(tab as TabId)}
          />
        )}

        {activeTab === 'tablet' && (
          <TabletAndProjectHub
            projectJson={projectJson}
            params={params}
            recentChanges={recentChanges}
            snapshots={snapshots}
            onUpdateParams={handleUpdateParams}
            onImportProjectJson={handleImportProjectJson}
            onExportProjectJson={() =>
              triggerDownload(
                'project.json',
                JSON.stringify(projectJson, null, 2),
                'application/json;charset=utf-8;'
              )
            }
            onCreateSnapshot={handleCreateSnapshot}
            onRestoreSnapshot={handleRestoreSnapshot}
          />
        )}

        {activeTab === 'library' && (
          <ComponentLibrary
            components={components}
            params={params}
            onUpdateComponent={handleUpdateComponent}
            onAddComponent={handleAddComponent}
            onUpdateParams={handleUpdateParams}
          />
        )}

        {activeTab === 'zones' && (
          <ZonesAndHarness
            params={params}
            conductors={conductors}
            onUpdateParams={handleUpdateParams}
            onUpdateConductorLength={handleUpdateConductorLength}
          />
        )}

        {activeTab === 'physical' && (
          <PhysicalCraneStudio params={params} onUpdateParams={handleUpdateParams} />
        )}

        {activeTab === 'schematics' && (
          <ElectricalSchematics pinAssignments={pinAssignments} />
        )}

        {activeTab === 'designer' && (
          <InteractiveDesigner
            pinAssignments={pinAssignments}
            params={params}
            virtualEstop={virtualEstop}
            onToggleVirtualEstop={() => setVirtualEstop((v) => !v)}
            onUpdatePinAssignment={handleUpdatePinAssignment}
            onResetPins={handleResetPins}
            onExportConfig={handleExportConfig}
          />
        )}

        {activeTab === 'assembly' && (
          <AssemblyGuide
            completedStepIds={completedStepIds}
            onToggleStepCompleted={handleToggleStepCompleted}
            conductors={conductors}
            params={params}
            pinAssignments={pinAssignments}
            onOpenWorkshopMode={() => setWorkshopOpen(true)}
          />
        )}

        {activeTab === 'codegen' && (
          <CodeGeneratorAndPanel
            projectJson={projectJson}
            params={params}
            onUpdateParams={handleUpdateParams}
          />
        )}

        {activeTab === 'install' && (
          <InstallationGuide
            projectJson={projectJson}
            params={params}
            onUpdateParams={handleUpdateParams}
          />
        )}

        {activeTab === 'validator' && (
          <ProjectValidator
            pinAssignments={pinAssignments}
            components={components}
            params={params}
            onUpdateParams={handleUpdateParams}
            onNavigateTab={(tab) => setActiveTab(tab as TabId)}
          />
        )}

        {activeTab === 'report' && (
          <AcademicReport
            components={components}
            pinAssignments={pinAssignments}
            params={params}
            realMeasurements={realMeasurements}
            onUpdateParams={handleUpdateParams}
            onUpdateMeasurement={handleUpdateMeasurement}
          />
        )}

        {activeTab === 'notebook' && (
          <EngineeringNotebook
            logRows={logRows}
            lessonsLearned={lessonsLearned}
            pinAssignments={pinAssignments}
            params={params}
            onAddLogRow={handleAddLogRow}
            onUpdateLogRow={handleUpdateLogRow}
            onDeleteLogRow={handleDeleteLogRow}
            onAddLesson={handleAddLesson}
            onUpdateLesson={handleUpdateLesson}
            onDeleteLesson={handleDeleteLesson}
          />
        )}

        {activeTab === 'exports' && (
          <ExportsCenter
            components={components}
            pinAssignments={pinAssignments}
            conductors={conductors}
            params={params}
            projectJson={projectJson}
            logRows={logRows}
            realMeasurements={realMeasurements}
            onUpdateParams={handleUpdateParams}
            onExportConfig={handleExportConfig}
            onImportProjectJson={handleImportProjectJson}
            onNavigateTab={(tab) => setActiveTab(tab as TabId)}
          />
        )}
      </main>

      {workshopOpen && (
        <WorkshopModeModal
          completedStepIds={completedStepIds}
          onToggleStepCompleted={handleToggleStepCompleted}
          onClose={() => setWorkshopOpen(false)}
        />
      )}

      <AdvisorCraneDrawer
        activeTab={activeTab}
        projectJson={projectJson}
        components={components}
        pinAssignments={pinAssignments}
        params={params}
        onApplyValidatedPatch={handleApplyAdvisorPatch}
        onExportConversationToNotebook={handleExportAdvisorToNotebook}
      />
    </div>
  );
}
