import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Code2,
  Copy,
  Cpu,
  Download,
  FileCode,
  Play,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Square,
  Zap,
} from 'lucide-react';
import {
  CraneProjectJson,
  CraneWorkingSubState,
  DigitalTwinState,
  LinterFinding,
  LoadItem,
  UserEditableParams,
} from '../types/crane';
import { buildFirmwareZipBlob, generateFirmwareBundle } from '../utils/firmwareGenerator';
import { lintSingleFirmwareFile } from '../utils/firmwareLinter';

interface CodeGeneratorAndPanelProps {
  projectJson: CraneProjectJson;
  params: UserEditableParams;
  onUpdateParams: (next: Partial<UserEditableParams>) => void;
}

const COMPILER_FAQ = [
  {
    err: "fatal error: AFMotor.h: No such file or directory",
    fix: "Instala «Adafruit Motor Shield library» (V1) desde el Gestor de librerías. NO instales la V2.",
  },
  {
    err: "'TwoWire' / 'Adafruit_SSD1306' does not name a type",
    fix: "Verifica en Herramientas → Placa que esté seleccionado «ESP32 Dev Module» cuando compilas grua_esp32.ino.",
  },
  {
    err: "A fatal error occurred: Failed to connect to ESP32: Timed out",
    fix: "Retira el jumper desmontable de ESP32 D2 y desconecta R2 (+5 V) de VIN antes de programar por USB.",
  },
  {
    err: "esp_task_wdt_reconfigure was not declared in this scope",
    fix: "Actualiza el núcleo esp32 by Espressif Systems en el Gestor de placas a la última versión estable v3.x.",
  },
];

export const CodeGeneratorAndPanel: React.FC<CodeGeneratorAndPanelProps> = ({
  projectJson,
  params,
  onUpdateParams,
}) => {
  const [subView, setSubView] = useState<'code' | 'linter' | 'twin'>('code');
  const [selectedFilePath, setSelectedFilePath] = useState<string>('grua_esp32/config.h');
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Linter interactivo de usuario
  const [customTarget, setCustomTarget] = useState<'ESP32' | 'UNO'>('ESP32');
  const [customCode, setCustomCode] = useState<string>(
    `// Pega aquí tu propio código .ino o .h para auditarlo contra las reglas de seguridad:\nvoid IRAM_ATTR miInterrupcion() {\n  // correcto\n}\nvoid loop() {\n  // prueba escribir delay(500); para ver la alerta exacta\n}\n`
  );

  // Gemelo Digital + Vista Previa del Panel Tablet
  const [twin, setTwin] = useState<DigitalTwinState>(() => ({
    fsmState: 'REPOSO',
    subState: 'NINGUNO',
    subStateTimerMs: 0,
    thetaDeg: 0,
    targetThetaDeg: 0,
    rCm: projectJson.calibration.r0MinCm ?? 10,
    targetRCm: projectJson.calibration.r0MinCm ?? 10,
    zCm: 0,
    targetZCm: 0,
    hallTriggered: true,
    homeSwitchActive: true,
    paroLatched: false,
    linkAlive: true,
    electromagnetOn: false,
    reversePulseMs: 0,
    bulbPwm: projectJson.calibration.maxPwmBombillo,
    activeMotors: [],
    activeLoadIndex: 0,
    completedLoadIds: [],
    usHReadingCm: projectJson.calibration.r0MinCm ?? 10,
    usVReadingCm: 32,
    errorCode: 'OK',
    counterweightConfirmed: projectJson.calibration.counterweightPlaced,
    logs: [{ time: '00:00', event: 'Gemelo digital inicializado en REPOSO', level: 'INFO' }],
  }));

  const [tabletTab, setTabletTab] = useState<'control' | 'cargas' | 'cal' | 'diag' | 'reg'>('control');
  const [showCpModal, setShowCpModal] = useState(false);
  const [editingLoad, setEditingLoad] = useState<{ index: number; item: LoadItem } | null>(null);
  const [twinPinUnlocked, setTwinPinUnlocked] = useState(!projectJson.network.operatorPinEnabled);
  const [twinPinInput, setTwinPinInput] = useState('');

  const bundle = useMemo(() => generateFirmwareBundle(projectJson), [projectJson]);
  const activeFile = bundle.files.find((f) => f.path === selectedFilePath) || bundle.files[0];

  const customFindings: LinterFinding[] = useMemo(
    () => lintSingleFirmwareFile('codigo_usuario.ino', customCode, projectJson, customTarget),
    [customCode, projectJson, customTarget]
  );

  const loads = projectJson.loads;
  const dCp = projectJson.calibration.counterweightDistDcpCm;
  const maxMoment = loads.length > 0 ? Math.max(...loads.map((l) => l.massG * l.rCm)) : 0;
  const minCpG = dCp && dCp > 0 && maxMoment > 0 ? (1.1 * maxMoment) / dCp : null;

  // Bucle de simulación no bloqueante (cada 200 ms) para el Gemelo Digital
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTwin((prev) => {
        if (prev.paroLatched || prev.fsmState === 'PARO' || prev.fsmState === 'FALLA') {
          return prev;
        }
        const nowStr = new Date().toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const appendLog = (
          logs: DigitalTwinState['logs'],
          event: string,
          level: 'INFO' | 'WARN' | 'ERR' = 'INFO'
        ) => [{ time: nowStr, event, level }, ...logs].slice(0, 25);

        if (prev.fsmState === 'HOMING') {
          const nextTheta = Math.max(0, prev.thetaDeg - 8);
          const nextZ = Math.max(0, prev.zCm - 2);
          const done = nextTheta <= 0 && nextZ <= 0;
          return {
            ...prev,
            thetaDeg: nextTheta,
            zCm: nextZ,
            homeSwitchActive: nextTheta <= 0,
            hallTriggered: nextZ <= 0,
            activeMotors: done ? [] : ['GIRO', 'CABRESTANTE'],
            fsmState: done ? 'LISTO' : 'HOMING',
            logs: done
              ? appendLog(prev.logs, 'HOMING finalizado: θ = 0°, Hall superior activo → LISTO')
              : prev.logs,
          };
        }

        if (prev.fsmState === 'ESCANEO') {
          const nextTheta = Math.min(360, prev.thetaDeg + 15);
          if (nextTheta >= 360) {
            return {
              ...prev,
              thetaDeg: 0,
              activeMotors: [],
              fsmState: 'LISTO',
              logs: appendLog(prev.logs, `Escaneo 360° finalizado: ${loads.length} carga(s) verificadas → LISTO`),
            };
          }
          return { ...prev, thetaDeg: nextTheta, activeMotors: ['GIRO'] };
        }

        if (prev.fsmState === 'TRABAJANDO') {
          const load = loads[prev.activeLoadIndex];
          if (!load) {
            return {
              ...prev,
              fsmState: 'LISTO',
              subState: 'NINGUNO',
              activeMotors: [],
              logs: appendLog(prev.logs, 'Todas las cargas completadas → LISTO'),
            };
          }

          const whR = projectJson.calibration.warehouseRadiusCm || 36;
          const whA = projectJson.calibration.warehouseAngleDeg ?? 180;
          const stepTowards = (cur: number, tgt: number, spd: number) =>
            Math.abs(cur - tgt) <= spd ? tgt : cur + Math.sign(tgt - cur) * spd;

          let nextSub: CraneWorkingSubState = prev.subState;
          let timerMs = prev.subStateTimerMs + 200;
          let theta = prev.thetaDeg;
          let r = prev.rCm;
          let z = prev.zCm;
          let mag = prev.electromagnetOn;
          let motors: DigitalTwinState['activeMotors'] = [];
          let loadIdx = prev.activeLoadIndex;
          let completed = prev.completedLoadIds;
          let logs = prev.logs;

          switch (prev.subState) {
            case 'IR':
              theta = stepTowards(theta, load.thetaDeg, 9);
              r = stepTowards(r, load.rCm, 2.5);
              motors = ['GIRO', 'CARRO'];
              if (theta === load.thetaDeg && r === load.rCm) {
                nextSub = 'BAJAR';
                timerMs = 0;
                logs = appendLog(logs, `Posicionado sobre ${load.id} (θ=${load.thetaDeg}°, r=${load.rCm} cm) → BAJAR`);
              }
              break;
            case 'BAJAR':
              z = stepTowards(z, 24, 3);
              motors = ['CABRESTANTE'];
              if (z >= 24) {
                mag = true;
                nextSub = 'ENGANCHAR_5S';
                timerMs = 0;
                logs = appendLog(logs, `Electroimán energizado sobre ${load.id} → ENGANCHAR_5S`);
              }
              break;
            case 'ENGANCHAR_5S':
              if (timerMs >= 1600) {
                nextSub = 'VERIFICAR_2CM';
                timerMs = 0;
              }
              break;
            case 'VERIFICAR_2CM':
              z = stepTowards(z, 0, 3);
              motors = ['CABRESTANTE'];
              if (z <= 0) {
                nextSub = 'TRANSPORTAR';
                timerMs = 0;
                logs = appendLog(logs, 'Carga izada y verificada por US-V → TRANSPORTAR a Bodega Z7');
              }
              break;
            case 'TRANSPORTAR':
              theta = stepTowards(theta, whA, 9);
              r = stepTowards(r, whR, 2.5);
              motors = ['GIRO', 'CARRO'];
              if (theta === whA && r === whR) {
                nextSub = 'BAJAR_BODEGA';
                timerMs = 0;
              }
              break;
            case 'BAJAR_BODEGA':
              z = stepTowards(z, 22, 3);
              motors = ['CABRESTANTE'];
              if (z >= 22) {
                nextSub = 'ESPERA_5S';
                timerMs = 0;
              }
              break;
            case 'ESPERA_5S':
              if (timerMs >= 1400) {
                nextSub = 'SOLTAR_PULSO_INVERSO';
                timerMs = 0;
                logs = appendLog(logs, 'Pulso inverso M2 ≤ 80 ms para soltar carga sin remanencia');
              }
              break;
            case 'SOLTAR_PULSO_INVERSO':
              mag = false;
              if (timerMs >= 400) {
                nextSub = 'SUBIR';
                timerMs = 0;
              }
              break;
            case 'SUBIR':
              z = stepTowards(z, 0, 3);
              motors = ['CABRESTANTE'];
              if (z <= 0) {
                completed = [...completed, load.id];
                loadIdx++;
                if (loadIdx >= loads.length) {
                  logs = appendLog(logs, `Carga ${load.id} depositada. Ciclo finalizado → LISTO`);
                  return {
                    ...prev,
                    zCm: 0,
                    hallTriggered: true,
                    electromagnetOn: false,
                    activeMotors: [],
                    completedLoadIds: completed,
                    activeLoadIndex: 0,
                    fsmState: 'LISTO',
                    subState: 'NINGUNO',
                    logs,
                  };
                }
                nextSub = 'IR';
                timerMs = 0;
              }
              break;
          }

          return {
            ...prev,
            thetaDeg: theta,
            rCm: r,
            zCm: z,
            hallTriggered: z <= 0,
            homeSwitchActive: theta <= 0,
            electromagnetOn: mag,
            activeMotors: motors,
            subState: nextSub,
            subStateTimerMs: timerMs,
            activeLoadIndex: loadIdx,
            completedLoadIds: completed,
            usHReadingCm: Number((r - (projectJson.calibration.usHOffsetShCm ?? 0)).toFixed(1)),
            usVReadingCm: Number(Math.max(4, 34 - z).toFixed(1)),
            logs,
          };
        }

        return prev;
      });
    }, 200);

    return () => window.clearInterval(timer);
  }, [loads, projectJson.calibration]);

  const appendTwinLog = (event: string, level: 'INFO' | 'WARN' | 'ERR' = 'INFO') => {
    const time = new Date().toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setTwin((prev) => ({
      ...prev,
      logs: [{ time, event, level }, ...prev.logs].slice(0, 25),
    }));
  };

  const handleDownloadFirmwareZip = () => {
    const blob = buildFirmwareZipBlob(bundle);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grua-torre-firmware-gt10.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyFile = async () => {
    if (!activeFile) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopiedPath(activeFile.path);
      setTimeout(() => setCopiedPath(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleTwinCmd = (cmd: string) => {
    if (cmd === 'PARO') {
      setTwin((p) => ({
        ...p,
        fsmState: 'PARO',
        subState: 'NINGUNO',
        paroLatched: true,
        activeMotors: [],
        errorCode: 'E05',
      }));
      appendTwinLog('PARO activado: motores detenidos y electroimán CONSERVADO', 'ERR');
      return;
    }
    if (cmd === 'REARMAR') {
      setTwin((p) => ({
        ...p,
        paroLatched: false,
        linkAlive: true,
        errorCode: 'OK',
        fsmState: 'REPOSO',
      }));
      appendTwinLog('Sistema rearmado manualmente a REPOSO', 'INFO');
      return;
    }
    if (twin.paroLatched) return;

    if (cmd === 'HOME') {
      setTwin((p) => ({ ...p, fsmState: 'HOMING', subState: 'NINGUNO' }));
      appendTwinLog('Ejecutando HOMING hacia θ = 0° y Hall superior');
    } else if (cmd === 'ESCANEO') {
      setTwin((p) => ({ ...p, fsmState: 'ESCANEO', thetaDeg: 0 }));
      appendTwinLog('Escaneo 360° en progreso');
    } else if (cmd === 'TRABAJAR') {
      setShowCpModal(true);
    } else if (cmd === 'IMAN_ON') {
      setTwin((p) => ({ ...p, electromagnetOn: true }));
      appendTwinLog('Electroimán encendido manualmente');
    } else if (cmd === 'IMAN_OFF') {
      setTwin((p) => ({ ...p, electromagnetOn: false }));
      appendTwinLog('Electroimán apagado manualmente');
    }
  };

  const handleTwinJog = (motor: 'GIRO' | 'CARRO' | 'CABRESTANTE', dir: number) => {
    if (twin.paroLatched || !twin.linkAlive) return;
    setTwin((p) => {
      if (!p.activeMotors.includes(motor) && p.activeMotors.length >= 2) {
        return p;
      }
      const nextTheta =
        motor === 'GIRO' ? Math.max(0, Math.min(360, p.thetaDeg + dir * 10)) : p.thetaDeg;
      const nextR =
        motor === 'CARRO'
          ? Math.max(5, Math.min(projectJson.calibration.rMaxUsefulCm, p.rCm + dir * 3))
          : p.rCm;
      const nextZ = motor === 'CABRESTANTE' ? Math.max(0, Math.min(30, p.zCm - dir * 3)) : p.zCm;
      return {
        ...p,
        fsmState: 'MANUAL',
        thetaDeg: nextTheta,
        rCm: nextR,
        zCm: nextZ,
        hallTriggered: nextZ <= 0,
        homeSwitchActive: nextTheta <= 0,
        activeMotors: [motor],
      };
    });
  };

  const injectFault = (type: 'E01' | 'E02' | 'E05' | 'CLEAR') => {
    if (type === 'CLEAR') {
      handleTwinCmd('REARMAR');
      return;
    }
    if (type === 'E01') {
      setTwin((p) => ({
        ...p,
        linkAlive: false,
        fsmState: 'FALLA',
        activeMotors: [],
        errorCode: 'E01',
      }));
      appendTwinLog('FALLO E01 inyectado: Enlace UNO perdido. Carro M1 detenido, electroimán M2 INTACTO.', 'ERR');
    } else if (type === 'E02') {
      setTwin((p) => ({
        ...p,
        fsmState: 'FALLA',
        activeMotors: [],
        errorCode: 'E02',
      }));
      appendTwinLog('FALLO E02 inyectado: Lectura US-V fuera de rango (2–400 cm).', 'ERR');
    } else if (type === 'E05') {
      handleTwinCmd('PARO');
    }
  };

  const sizeKb = (bundle.panelHtmlBytes / 1024).toFixed(1);
  const linterErrors = bundle.linterFindings.filter((f) => f.severity === 'ERROR').length;

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Code2 className="w-5 h-5 text-emerald-400" />
              Código Arduino/ESP32, Revisor (Linter) y Gemelo Digital
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600/50 text-emerald-300">
              panel_web.h: {sizeKb} KB / 60 KB · 0 CDN externos
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generado al 100 % desde <code className="text-emerald-300">project.json</code>: incluye firmware ESP32, Arduino UNO, panel web embebido y 7 pruebas de banco.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSubView('code')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              subView === 'code'
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            Generador ZIP ({bundle.files.length} archivos)
          </button>
          <button
            onClick={() => setSubView('linter')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              subView === 'linter'
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Linter ({linterErrors} errores)
          </button>
          <button
            onClick={() => setSubView('twin')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              subView === 'twin'
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Panel Tablet + Gemelo Digital
          </button>
        </div>
      </div>

      {/* Sub-vista 1: Generador de Código + Compilación */}
      {subView === 'code' && (
        <div className="space-y-5">
          {/* Aviso explícito de compilación */}
          <div className="rounded-xl bg-amber-950/35 border border-amber-500/40 p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-amber-100 space-y-1 max-w-3xl">
              <div className="font-bold flex items-center gap-1.5 text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                Nota importante: este navegador no compila C++ de Arduino directamente
              </div>
              <p>
                Descarga el archivo ZIP, descomprímelo en tu PC y compila en <strong>Arduino IDE 2.x</strong> siguiendo la pestaña «Instalación». El código ya pasó nuestro revisor estático (Linter) con{' '}
                <strong>{bundle.linterFindings.length} alertas</strong>.
              </p>
            </div>
            <button
              onClick={handleDownloadFirmwareZip}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
            >
              <Download className="w-4 h-4" />
              Descargar Firmware (.zip)
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Árbol de archivos */}
            <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-3 space-y-1.5">
              <div className="text-xs font-bold text-slate-300 px-2 pb-1 border-b border-slate-800">
                Archivos del paquete ZIP
              </div>
              {bundle.files.map((f) => (
                <button
                  key={f.path}
                  onClick={() => setSelectedFilePath(f.path)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between gap-2 ${
                    activeFile?.path === f.path
                      ? 'bg-emerald-600/25 border border-emerald-500/50 text-emerald-200'
                      : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate">{f.path}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 shrink-0">
                    {f.category}
                  </span>
                </button>
              ))}
            </div>

            {/* Visor de código */}
            <div className="lg:col-span-3 rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-mono text-xs text-emerald-300 font-bold">{activeFile?.path}</div>
                <button
                  onClick={handleCopyFile}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedPath === activeFile?.path ? 'Copiado' : 'Copiar archivo'}
                </button>
              </div>
              <pre className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-[11px] font-mono text-slate-200 max-h-[450px] overflow-auto">
                {activeFile?.content}
              </pre>
            </div>
          </div>

          {/* Checklist y errores frecuentes del compilador */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">
              Errores frecuentes del compilador Arduino IDE y cómo resolverlos
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {COMPILER_FAQ.map((item, idx) => (
                <div key={idx} className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-xs space-y-1">
                  <div className="font-mono text-rose-300 text-[11px]">{item.err}</div>
                  <div className="text-slate-300">{item.fix}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sub-vista 2: Revisor de Código (Linter) */}
      {subView === 'linter' && (
        <div className="space-y-5">
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Auditoría automática sobre los {bundle.files.length} archivos generados
                </h3>
                <p className="text-xs text-slate-400">
                  Verifica cero <code className="text-slate-200">delay()</code>, todas las ISR con <code className="text-slate-200">IRAM_ATTR</code>, coincidencia exacta de pines con <code className="text-slate-200">project.json</code>, protección 3,3 V, pines reservados del Shield L293D y regla D12.
                </p>
              </div>
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  bundle.linterFindings.length === 0
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                    : 'bg-rose-950 text-rose-200 border border-rose-600/50'
                }`}
              >
                {bundle.linterFindings.length === 0
                  ? '0 problemas en código generado'
                  : `${bundle.linterFindings.length} hallazgo(s)`}
              </span>
            </div>

            {bundle.linterFindings.length > 0 && (
              <div className="space-y-2">
                {bundle.linterFindings.map((f) => (
                  <div key={f.id} className="rounded-lg bg-rose-950/40 border border-rose-500/40 p-3 text-xs">
                    <div className="font-bold text-rose-200">
                      [{f.ruleId}] {f.file}:{f.line} — {f.title}
                    </div>
                    <p className="text-slate-300 mt-0.5">{f.detail}</p>
                    <p className="text-emerald-300 mt-0.5">Solución: {f.fix}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sandbox para auditar código del usuario */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Analiza tu propio código Arduino / ESP32 antes de subirlo
                </h3>
                <p className="text-xs text-slate-400">
                  Pega cualquier fragmento `.ino` o `.h` para verificar si viola las reglas de seguridad física de la grúa.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Placa destino:</span>
                <button
                  onClick={() => setCustomTarget('ESP32')}
                  className={`px-2.5 py-1 rounded ${
                    customTarget === 'ESP32' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  ESP32
                </button>
                <button
                  onClick={() => setCustomTarget('UNO')}
                  className={`px-2.5 py-1 rounded ${
                    customTarget === 'UNO' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  Arduino UNO
                </button>
              </div>
            </div>

            <textarea
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              rows={9}
              className="w-full rounded-lg bg-slate-950 border border-slate-700 p-3 text-xs font-mono text-emerald-200"
            />

            {customFindings.length === 0 ? (
              <div className="rounded-lg bg-emerald-950/40 border border-emerald-500/40 p-3 text-xs text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Tu código pegado no viola ninguna regla de seguridad del Linter.</span>
              </div>
            ) : (
              <div className="space-y-2">
                {customFindings.map((f) => (
                  <div key={f.id} className="rounded-lg bg-rose-950/40 border border-rose-500/40 p-3 text-xs">
                    <div className="font-bold text-rose-200">
                      Línea {f.line} [{f.ruleId}]: {f.title}
                    </div>
                    <p className="text-slate-300 mt-0.5">{f.detail}</p>
                    <p className="text-emerald-300 mt-0.5">Cómo corregirlo: {f.fix}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-vista 3: Gemelo Digital + Vista Previa Interactiva del Panel Tablet */}
      {subView === 'twin' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Izquierda: Gemelo Digital de la Grúa + Inyección de Fallos */}
          <div className="xl:col-span-5 rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                Gemelo Digital del Firmware (FSM en vivo)
              </h3>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded font-bold ${
                  twin.fsmState === 'PARO' || twin.fsmState === 'FALLA'
                    ? 'bg-rose-950 text-rose-300 border border-rose-600'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                }`}
              >
                {twin.fsmState} {twin.subState !== 'NINGUNO' ? `· ${twin.subState}` : ''}
              </span>
            </div>

            {/* Vista superior polar + lateral en vivo */}
            <div className="grid grid-cols-2 gap-2">
              <svg viewBox="0 0 180 180" className="w-full h-auto rounded-lg bg-[#080E1A] border border-slate-800">
                <circle cx="90" cy="90" r="72" fill="none" stroke="#1E293B" />
                <circle cx="90" cy="90" r="36" fill="none" stroke="#1E293B" strokeDasharray="3 3" />
                {/* Pluma */}
                <line
                  x1="90"
                  y1="90"
                  x2={90 + Math.cos(((twin.thetaDeg - 90) * Math.PI) / 180) * 72}
                  y2={90 + Math.sin(((twin.thetaDeg - 90) * Math.PI) / 180) * 72}
                  stroke="#38BDF8"
                  strokeWidth="3"
                />
                {/* Carro */}
                <circle
                  cx={90 + Math.cos(((twin.thetaDeg - 90) * Math.PI) / 180) * ((twin.rCm / Math.max(1, projectJson.calibration.rMaxUsefulCm)) * 72)}
                  cy={90 + Math.sin(((twin.thetaDeg - 90) * Math.PI) / 180) * ((twin.rCm / Math.max(1, projectJson.calibration.rMaxUsefulCm)) * 72)}
                  r="4.5"
                  fill="#10B981"
                />
                {/* Bodega */}
                <rect
                  x={90 + Math.cos((((projectJson.calibration.warehouseAngleDeg ?? 180) - 90) * Math.PI) / 180) * ((projectJson.calibration.warehouseRadiusCm / Math.max(1, projectJson.calibration.rMaxUsefulCm)) * 72) - 5}
                  y={90 + Math.sin((((projectJson.calibration.warehouseAngleDeg ?? 180) - 90) * Math.PI) / 180) * ((projectJson.calibration.warehouseRadiusCm / Math.max(1, projectJson.calibration.rMaxUsefulCm)) * 72) - 5}
                  width="10"
                  height="10"
                  fill="#F59E0B"
                  rx="2"
                />
                {/* Cargas */}
                {loads.map((l) => {
                  const rad = ((l.thetaDeg - 90) * Math.PI) / 180;
                  const dist = (l.rCm / Math.max(1, projectJson.calibration.rMaxUsefulCm)) * 72;
                  const done = twin.completedLoadIds.includes(l.id);
                  return (
                    <circle
                      key={l.id}
                      cx={90 + Math.cos(rad) * dist}
                      cy={90 + Math.sin(rad) * dist}
                      r="4"
                      fill={done ? '#475569' : '#EC4899'}
                      stroke="#fff"
                      strokeWidth="0.8"
                    />
                  );
                })}
                <text x="6" y="14" fill="#94A3B8" fontSize="8">Planta (θ={twin.thetaDeg.toFixed(0)}°)</text>
              </svg>

              <svg viewBox="0 0 180 180" className="w-full h-auto rounded-lg bg-[#080E1A] border border-slate-800">
                <line x1="26" y1="30" x2="26" y2="160" stroke="#475569" strokeWidth="5" />
                <line x1="10" y1="30" x2="165" y2="30" stroke="#38BDF8" strokeWidth="4" />
                <rect x="12" y="34" width="12" height="10" fill="#F59E0B" rx="1" />
                {(() => {
                  const px = 30 + (twin.rCm / Math.max(1, projectJson.calibration.rMaxUsefulCm)) * 125;
                  const py = 36 + (twin.zCm / 30) * 100;
                  return (
                    <>
                      <rect x={px - 7} y="27" width="14" height="7" fill="#38BDF8" />
                      <line x1={px} y1="34" x2={px} y2={py} stroke="#CBD5E1" strokeDasharray="3 2" />
                      <rect x={px - 5} y={py} width="10" height="8" fill={twin.electromagnetOn ? '#F59E0B' : '#10B981'} />
                    </>
                  );
                })()}
                <text x="34" y="170" fill="#94A3B8" fontSize="8">
                  r={twin.rCm.toFixed(1)} cm · z={twin.zCm.toFixed(1)} cm · Imán:{twin.electromagnetOn ? 'ON' : 'OFF'}
                </text>
              </svg>
            </div>

            {/* Estado eléctrico en tiempo real */}
            <div className="grid grid-cols-3 gap-2 text-[11px]">
              <div className="rounded bg-slate-950 border border-slate-800 p-2">
                <div className="text-slate-400">Motores</div>
                <div className="font-mono font-bold text-white">{twin.activeMotors.length}/2 ({twin.activeMotors.join('+') || 'Alto'})</div>
              </div>
              <div className="rounded bg-slate-950 border border-slate-800 p-2">
                <div className="text-slate-400">Enlace UNO</div>
                <div className={`font-mono font-bold ${twin.linkAlive ? 'text-emerald-300' : 'text-rose-400'}`}>
                  {twin.linkAlive ? 'OK (250 ms)' : 'E01 PERDIDO'}
                </div>
              </div>
              <div className="rounded bg-slate-950 border border-slate-800 p-2">
                <div className="text-slate-400">Electroimán</div>
                <div className={`font-mono font-bold ${twin.electromagnetOn ? 'text-amber-300' : 'text-slate-300'}`}>
                  {twin.electromagnetOn ? 'ENERGIZADO' : 'APAGADO'}
                </div>
              </div>
            </div>

            {/* Botones de inyección de fallos */}
            <div className="rounded-lg bg-rose-950/25 border border-rose-500/30 p-3 space-y-2">
              <div className="text-xs font-bold text-rose-200 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                Inyección de fallos para validar seguridad
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => injectFault('E01')}
                  className="px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-[11px] text-rose-100"
                >
                  Simular corte UNO (E01)
                </button>
                <button
                  onClick={() => injectFault('E02')}
                  className="px-2.5 py-1 rounded bg-amber-900/60 hover:bg-amber-800 text-[11px] text-amber-100"
                >
                  Fallo US-V (E02)
                </button>
                <button
                  onClick={() => injectFault('E05')}
                  className="px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-[11px] text-white font-semibold"
                >
                  PARO físico D12 (E05)
                </button>
                <button
                  onClick={() => injectFault('CLEAR')}
                  className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-[11px] text-white font-semibold"
                >
                  Rearmar
                </button>
              </div>
            </div>
          </div>

          {/* Derecha: Simulador exacto del Panel Embebido de la Tablet */}
          <div className="xl:col-span-7 rounded-xl bg-[#080E1A] border-2 border-slate-700 overflow-hidden flex flex-col">
            {/* Barra superior fija del panel tablet */}
            <div className="bg-[#0F172A] border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-white">
                  PANEL TABLET ({projectJson.network.apIp})
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                  {twin.fsmState}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTwinCmd('REARMAR')}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold"
                >
                  Rearmar
                </button>
                <button
                  onClick={() => handleTwinCmd('PARO')}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black tracking-wider shadow-lg"
                >
                  PARO
                </button>
              </div>
            </div>

            {/* Sub-navegación de 5 pestañas del panel embebido */}
            <div className="bg-slate-950 border-b border-slate-800 px-3 py-2 flex items-center gap-1.5 overflow-x-auto">
              {(
                [
                  ['control', 'Control'],
                  ['cargas', 'Cargas'],
                  ['cal', 'Calibración'],
                  ['diag', 'Diagnóstico'],
                  ['reg', 'Registro'],
                ] as const
              ).map(([id, lbl]) => (
                <button
                  key={id}
                  onClick={() => setTabletTab(id)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold ${
                    tabletTab === id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900 text-slate-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {/* Gate opcional de PIN si el usuario lo activó */}
            {!twinPinUnlocked ? (
              <div className="p-6 text-center space-y-3">
                <p className="text-xs text-slate-300">
                  PIN de operador activado en <code>project.json</code> (prueba ingresar {projectJson.network.operatorPin}):
                </p>
                <div className="inline-flex gap-2">
                  <input
                    type="password"
                    maxLength={4}
                    value={twinPinInput}
                    onChange={(e) => setTwinPinInput(e.target.value)}
                    className="rounded bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white w-28 text-center font-mono"
                    placeholder="0000"
                  />
                  <button
                    onClick={() => {
                      if (twinPinInput === projectJson.network.operatorPin) setTwinPinUnlocked(true);
                    }}
                    className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-bold"
                  >
                    Desbloquear
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4 flex-1">
                {twin.errorCode !== 'OK' && (
                  <div className="rounded-lg bg-rose-950/70 border border-rose-500 px-3 py-2 text-xs text-rose-100 flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      Código activo <strong>{twin.errorCode}</strong>:{' '}
                      {projectJson.errorCodes.find((e) => e.code === twin.errorCode)?.title}
                    </span>
                  </div>
                )}

                {tabletTab === 'control' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5">
                        <span className="text-[10px] text-slate-400 block">Ángulo (θ)</span>
                        <strong className="font-mono text-base text-white">{twin.thetaDeg.toFixed(1)}°</strong>
                      </div>
                      <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5">
                        <span className="text-[10px] text-slate-400 block">Radio (r)</span>
                        <strong className="font-mono text-base text-white">{twin.rCm.toFixed(1)} cm</strong>
                      </div>
                      <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5">
                        <span className="text-[10px] text-slate-400 block">Descenso (z)</span>
                        <strong className="font-mono text-base text-white">{twin.zCm.toFixed(1)} cm</strong>
                      </div>
                      <div className="rounded-lg bg-slate-900 border border-slate-800 p-2.5">
                        <span className="text-[10px] text-slate-400 block">Contrapeso mín.</span>
                        <strong className="font-mono text-base text-amber-300">
                          {minCpG !== null ? `${minCpG.toFixed(1)} g` : 'POR CONF.'}
                        </strong>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleTwinCmd('HOME')}
                        disabled={twin.paroLatched}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold"
                      >
                        1. HOME
                      </button>
                      <button
                        onClick={() => handleTwinCmd('ESCANEO')}
                        disabled={twin.paroLatched}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-bold"
                      >
                        2. ESCANEAR
                      </button>
                      <button
                        onClick={() => handleTwinCmd('TRABAJAR')}
                        disabled={twin.paroLatched}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold"
                      >
                        <Play className="w-3.5 h-3.5" /> 3. TRABAJAR
                      </button>
                      <button
                        onClick={() => handleTwinCmd(twin.electromagnetOn ? 'IMAN_OFF' : 'IMAN_ON')}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-600/30 border border-amber-500/50 text-amber-200 text-xs font-bold"
                      >
                        <Zap className="w-3.5 h-3.5" /> {twin.electromagnetOn ? 'Apagar Imán' : 'Encender Imán'}
                      </button>
                    </div>

                    <div className="rounded-lg bg-slate-900/70 border border-slate-800 p-3 space-y-2">
                      <div className="text-[11px] font-semibold text-slate-300">
                        Movimiento Manual (respeta límite de 2 motores y 0–360°)
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        <button onClick={() => handleTwinJog('GIRO', -1)} className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white">Giro −10°</button>
                        <button onClick={() => handleTwinJog('GIRO', 1)} className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white">Giro +10°</button>
                        <button onClick={() => handleTwinJog('CARRO', -1)} className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white">Carro −3 cm</button>
                        <button onClick={() => handleTwinJog('CARRO', 1)} className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white">Carro +3 cm</button>
                        <button onClick={() => handleTwinJog('CABRESTANTE', 1)} className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white">Gancho Subir</button>
                        <button onClick={() => handleTwinJog('CABRESTANTE', -1)} className="px-2 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white">Gancho Bajar</button>
                      </div>
                    </div>
                  </div>
                )}

                {tabletTab === 'cargas' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300">
                        Doble clic en la tabla o «Agregar» para editar las cargas en <code>project.json</code> (sin prompt()).
                      </span>
                      <button
                        onClick={() =>
                          setEditingLoad({
                            index: -1,
                            item: {
                              id: `L${loads.length + 1}`,
                              name: `Carga ${loads.length + 1}`,
                              massG: 120,
                              rCm: 20,
                              thetaDeg: 90,
                              order: loads.length + 1,
                            },
                          })
                        }
                        className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                      >
                        + Agregar
                      </button>
                    </div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-slate-400 border-b border-slate-800">
                          <th className="py-1.5 text-left">Orden</th>
                          <th className="py-1.5 text-left">Carga</th>
                          <th className="py-1.5 text-left">Masa</th>
                          <th className="py-1.5 text-left">Radio r</th>
                          <th className="py-1.5 text-left">Ángulo θ</th>
                          <th className="py-1.5 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loads.map((l, idx) => (
                          <tr
                            key={l.id}
                            onDoubleClick={() => setEditingLoad({ index: idx, item: { ...l } })}
                            className="border-b border-slate-800/60 hover:bg-slate-900/50 cursor-pointer"
                          >
                            <td className="py-1.5">{l.order}</td>
                            <td className="py-1.5 font-semibold text-white">{l.name}</td>
                            <td className="py-1.5 font-mono">{l.massG} g</td>
                            <td className="py-1.5 font-mono">{l.rCm} cm</td>
                            <td className="py-1.5 font-mono">{l.thetaDeg}°</td>
                            <td className="py-1.5 text-right">
                              <button
                                onClick={() => setEditingLoad({ index: idx, item: { ...l } })}
                                className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 mr-1"
                              >
                                Editar
                              </button>
                              <button
                                onClick={() =>
                                  onUpdateParams({ activeLoads: loads.filter((_, i) => i !== idx) })
                                }
                                className="px-2 py-0.5 rounded bg-rose-950 text-rose-300"
                              >
                                Quitar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {tabletTab === 'cal' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="rounded-lg bg-slate-900 border border-slate-800 p-3">
                      <label className="block text-slate-400 mb-1">Radio mínimo r₀ (cm)</label>
                      <input
                        type="number"
                        value={params.r0MinCm ?? ''}
                        onChange={(e) => onUpdateParams({ r0MinCm: e.target.value ? Number(e.target.value) : null })}
                        placeholder="POR CONFIRMAR"
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div className="rounded-lg bg-slate-900 border border-slate-800 p-3">
                      <label className="block text-slate-400 mb-1">Offset US-H s_H (cm)</label>
                      <input
                        type="number"
                        value={params.usHOffsetShCm ?? ''}
                        onChange={(e) => onUpdateParams({ usHOffsetShCm: e.target.value ? Number(e.target.value) : null })}
                        placeholder="POR CONFIRMAR"
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div className="rounded-lg bg-slate-900 border border-slate-800 p-3">
                      <label className="block text-slate-400 mb-1">Distancia contrapeso d_cp (cm)</label>
                      <input
                        type="number"
                        value={params.counterweightDistDcpCm ?? ''}
                        onChange={(e) => onUpdateParams({ counterweightDistDcpCm: e.target.value ? Number(e.target.value) : null })}
                        placeholder="POR CONFIRMAR"
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div className="rounded-lg bg-slate-900 border border-slate-800 p-3">
                      <label className="block text-slate-400 mb-1">Temperatura ambiente (°C)</label>
                      <input
                        type="number"
                        value={params.ambientTempC}
                        onChange={(e) => onUpdateParams({ ambientTempC: Number(e.target.value) || 25 })}
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white font-mono"
                      />
                    </div>
                  </div>
                )}

                {tabletTab === 'diag' && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="py-1.5 text-left">Sensor / Canal</th>
                        <th className="py-1.5 text-left">Lectura cruda simulada</th>
                        <th className="py-1.5 text-left">Voltaje esperado con multímetro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      <tr><td className="py-1.5">FC-33 Giro ({projectJson.pins.find((p) => p.id === 'PA07')?.pin})</td><td className="font-mono text-white">{Math.round(twin.thetaDeg * 2)} pulsos</td><td className="text-slate-400">0 V / 3,3 V</td></tr>
                      <tr><td className="py-1.5">Hall KY-003 ({projectJson.pins.find((p) => p.id === 'PA10')?.pin})</td><td className="font-mono text-white">{twin.hallTriggered ? 'IMÁN ACTIVO' : 'LIBRE'}</td><td className="text-slate-400">≤ 3,33 V (Divisor #4)</td></tr>
                      <tr><td className="py-1.5">US-H ({projectJson.pins.find((p) => p.id === 'PA15')?.pin})</td><td className="font-mono text-white">{twin.usHReadingCm} cm</td><td className="text-slate-400">≤ 3,33 V (Divisor #1)</td></tr>
                      <tr><td className="py-1.5">US-V ({projectJson.pins.find((p) => p.id === 'PA17')?.pin})</td><td className="font-mono text-white">{twin.usVReadingCm} cm</td><td className="text-slate-400">≤ 3,33 V (Divisor #2)</td></tr>
                      <tr><td className="py-1.5">HOME ({projectJson.pins.find((p) => p.id === 'PA11')?.pin}) / PARO ({projectJson.pins.find((p) => p.id === 'PA13')?.pin})</td><td className="font-mono text-white">{twin.homeSwitchActive ? '0' : '1'} / {twin.paroLatched ? '0' : '1'}</td><td className="text-slate-400">3,3 V en reposo</td></tr>
                    </tbody>
                  </table>
                )}

                {tabletTab === 'reg' && (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {twin.logs.map((log, i) => (
                      <div key={i} className="text-xs flex items-start gap-2 border-b border-slate-800/60 pb-1.5">
                        <span className="font-mono text-slate-500">[{log.time}]</span>
                        <span
                          className={
                            log.level === 'ERR'
                              ? 'text-rose-300'
                              : log.level === 'WARN'
                                ? 'text-amber-300'
                                : 'text-slate-200'
                          }
                        >
                          {log.event}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Modal personalizado de confirmación de contrapeso */}
            {showCpModal && (
              <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
                <div className="rounded-xl bg-[#0F172A] border border-amber-500/50 max-w-md w-full p-5 space-y-4">
                  <h4 className="text-base font-bold text-white">Confirmación obligatoria antes de TRABAJAR</h4>
                  <p className="text-xs text-amber-200 leading-relaxed">
                    {minCpG !== null
                      ? `¿Ya está colocado el contrapeso de al menos ${minCpG.toFixed(1)} g en la contrapluma (Z4)?`
                      : 'Falta definir d_cp en Calibración (POR CONFIRMAR). ¿Confirmas físicamente que el contrapeso suficiente ya está instalado en la contrapluma?'}
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setShowCpModal(false);
                        appendTwinLog('Arranque TRABAJANDO cancelado: contrapeso no confirmado (E03)', 'WARN');
                      }}
                      className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
                    >
                      No, cancelar
                    </button>
                    <button
                      onClick={() => {
                        setShowCpModal(false);
                        onUpdateParams({ counterweightPlaced: true });
                        setTwin((p) => ({
                          ...p,
                          counterweightConfirmed: true,
                          fsmState: 'TRABAJANDO',
                          subState: 'IR',
                          subStateTimerMs: 0,
                          activeLoadIndex: 0,
                          completedLoadIds: [],
                        }));
                        appendTwinLog('Contrapeso confirmado → iniciando ciclo TRABAJANDO');
                      }}
                      className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      Sí, contrapeso colocado
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal personalizado para editar/crear carga (sin prompt) */}
            {editingLoad && (
              <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4">
                <div className="rounded-xl bg-[#0F172A] border border-slate-700 max-w-sm w-full p-5 space-y-3 text-xs">
                  <h4 className="text-sm font-bold text-white">
                    {editingLoad.index >= 0 ? `Editar ${editingLoad.item.id}` : 'Agregar nueva carga'}
                  </h4>
                  <div>
                    <label className="block text-slate-400 mb-1">Nombre / ID</label>
                    <input
                      type="text"
                      value={editingLoad.item.name}
                      onChange={(e) =>
                        setEditingLoad({ ...editingLoad, item: { ...editingLoad.item, name: e.target.value } })
                      }
                      className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">Masa (g)</label>
                      <input
                        type="number"
                        value={editingLoad.item.massG}
                        onChange={(e) =>
                          setEditingLoad({ ...editingLoad, item: { ...editingLoad.item, massG: Number(e.target.value) || 0 } })
                        }
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Radio r (cm)</label>
                      <input
                        type="number"
                        value={editingLoad.item.rCm}
                        onChange={(e) =>
                          setEditingLoad({ ...editingLoad, item: { ...editingLoad.item, rCm: Number(e.target.value) || 0 } })
                        }
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Ángulo θ (°)</label>
                      <input
                        type="number"
                        value={editingLoad.item.thetaDeg}
                        onChange={(e) =>
                          setEditingLoad({ ...editingLoad, item: { ...editingLoad.item, thetaDeg: Number(e.target.value) || 0 } })
                        }
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Orden</label>
                      <input
                        type="number"
                        value={editingLoad.item.order}
                        onChange={(e) =>
                          setEditingLoad({ ...editingLoad, item: { ...editingLoad.item, order: Number(e.target.value) || 1 } })
                        }
                        className="w-full rounded bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setEditingLoad(null)}
                      className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        const next = [...loads];
                        if (editingLoad.index >= 0) next[editingLoad.index] = editingLoad.item;
                        else next.push(editingLoad.item);
                        next.sort((a, b) => a.order - b.order);
                        onUpdateParams({ activeLoads: next });
                        setEditingLoad(null);
                      }}
                      className="px-3 py-1.5 rounded bg-emerald-600 text-white font-bold"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
