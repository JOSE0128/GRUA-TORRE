import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Database,
  Download,
  HelpCircle,
  History,
  Lock,
  RotateCcw,
  Save,
  Tablet,
  Upload,
  Wifi,
} from 'lucide-react';
import {
  CraneProjectJson,
  ProjectChangeEvent,
  ProjectVersionSnapshot,
  UserEditableParams,
} from '../types/crane';
import { StatusChip } from './StatusChip';

interface TabletAndProjectHubProps {
  projectJson: CraneProjectJson;
  params: UserEditableParams;
  recentChanges: ProjectChangeEvent[];
  snapshots: ProjectVersionSnapshot[];
  onUpdateParams: (next: Partial<UserEditableParams>) => void;
  onImportProjectJson: (raw: string) => { ok: boolean; message: string };
  onExportProjectJson: () => void;
  onCreateSnapshot: (label: string) => void;
  onRestoreSnapshot: (id: string) => void;
}

const TROUBLESHOOT_ITEMS = [
  {
    id: 'no-wifi',
    question: '«No veo la red WiFi de la grúa en mi tablet»',
    steps: [
      'Verifica que la fuente lógica de 5 V 3 A esté encendida y el LED rojo del ESP32 esté iluminado.',
      'Mide con multímetro entre R1 (GND) y R2 (+5 V): debe marcar entre 4,85 V y 5,15 V.',
      'Si acabas de cargar código, desconecta el cable USB, conecta VIN al riel R2 (+5 V) y presiona el botón EN (Reset) del ESP32.',
      'Asegúrate de haber configurado una clave WiFi de mínimo 8 caracteres en el bloque de abajo (el ESP32 rechaza crear AP WPA2 con claves menores a 8 caracteres).',
    ],
  },
  {
    id: 'no-page',
    question: '«Me conecté al WiFi pero la página no abre»',
    steps: [
      'Escribe exactamente http://192.168.4.1 (con http://, NO https://) en Chrome o Safari.',
      'Desactiva temporalmente los datos móviles (4G/5G) de la tablet si el sistema operativo intenta salir por datos al ver "Sin conexión a internet".',
      'Si aparece un aviso "Esta red no tiene conexión a internet — ¿Mantener conexión?", toca SÍ / Mantener.',
      'Si http://grua.local no abre (algunos dispositivos Android antiguos no soportan mDNS), usa directamente http://192.168.4.1.',
    ],
  },
  {
    id: 'drops',
    question: '«La conexión se pierde o se reinicia cuando arranca un motor»',
    steps: [
      'Causa principal: caída de tensión o ruido eléctrico porque los 12 V de motores comparten el cable positivo o falta masa común en R1.',
      'Comprueba que el jumper 5V-EN del L298N y el jumper PWR del Shield L293D estén RETIRADOS para mantener 5 V y 12 V separados.',
      'Verifica que la fuente de 5 V 3 A entregue ≥ 4,90 V estables en VIN mientras giran dos motores.',
      'No te alejes más de 6–8 metros de la caja Z1 si hay paredes metálicas.',
    ],
  },
];

export const TabletAndProjectHub: React.FC<TabletAndProjectHubProps> = ({
  projectJson,
  params,
  recentChanges,
  snapshots,
  onUpdateParams,
  onImportProjectJson,
  onExportProjectJson,
  onCreateSnapshot,
  onRestoreSnapshot,
}) => {
  const [subTab, setSubTab] = useState<'tablet' | 'project' | 'history'>('tablet');
  const [simpleMode, setSimpleMode] = useState<boolean>(true);
  const [openFaq, setOpenFaq] = useState<string>('no-wifi');
  const [snapshotLabel, setSnapshotLabel] = useState<string>('');
  const [importText, setImportText] = useState<string>('');
  const [importMsg, setImportMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const wifiPass = params.wifiPassword ?? '';
  const wifiValid = wifiPass.length >= 8;

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(projectJson, null, 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleImportPaste = () => {
    const res = onImportProjectJson(importText);
    setImportMsg(res);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-white">
              Conexión por Tablet &amp; Fuente Única de Verdad (project.json)
            </h2>
            <StatusChip status="CONFIRMADO" />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Cómo funciona la comunicación real entre tu tablet y la grúa sin internet, y control centralizado del archivo <code className="text-emerald-300">project.json</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSimpleMode((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              simpleMode
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            {simpleMode ? 'Explicación sencilla: ACTIVADA' : 'Modo técnico'}
          </button>
          <button
            onClick={() => setSubTab('tablet')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              subTab === 'tablet'
                ? 'bg-sky-600 border-sky-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <Tablet className="w-3.5 h-3.5" />
            ¿Cómo se conecta la tablet?
          </button>
          <button
            onClick={() => setSubTab('project')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              subTab === 'project'
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            project.json en vivo
          </button>
          <button
            onClick={() => setSubTab('history')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              subTab === 'history'
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Historial ({snapshots.length})
          </button>
        </div>
      </div>

      {/* Pestaña 1: ¿Cómo se conecta la tablet? */}
      {subTab === 'tablet' && (
        <div className="space-y-6">
          {/* Diferencia clara entre los dos programas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#0F172A] border border-sky-500/30 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-sky-300">
                  Programa 1 — En el computador (internet / offline PWA)
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-sky-950 text-sky-200 border border-sky-700">
                  NO maneja la grúa
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Crane Engineering Studio (esta app)</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {simpleMode
                  ? 'Piensa en Crane Studio como el "taller de diseño": aquí ves los planos de cables, validas que nada se queme, generas el programa que va dentro de los chips y preguntas dudas al asesor. NO controla los motores físicos.'
                  : 'Aplicación de ingeniería y documentación basada en project.json. Valida restricciones eléctricas, genera el firmware C++ (ESP32 + UNO), compila documentación académica y ofrece un gemelo digital de pruebas.'}
              </p>
            </div>

            <div className="rounded-xl bg-[#0F172A] border border-emerald-500/40 p-5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-300">
                  Programa 2 — Guardado dentro del ESP32
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-200 border border-emerald-700">
                  SÍ maneja la grúa (sin internet)
                </span>
              </div>
              <h3 className="text-base font-bold text-white">
                Panel de Control Embebido (http://{projectJson.network.apIp})
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {simpleMode
                  ? 'Cuando el ESP32 enciende, crea su propia red WiFi privada (como un pequeño router dentro de la caja). Tu tablet se conecta a esa red, abre una página web que vive dentro de la memoria del chip y maneja la grúa sin gastar datos ni usar internet.'
                  : 'Servidor HTTP embebido en PROGMEM (panel_web.h ≤ 60 KB sin dependencias externas) servido en modo SoftAP por el ESP32. Expone endpoints REST JSON cada 300 ms para control, cargas, calibración y diagnóstico.'}
              </p>
            </div>
          </div>

          {/* Diagrama visual de conexión Tablet <-> ESP32 <-> UNO */}
          <div className="rounded-xl bg-[#080E1A] border border-slate-800 p-5">
            <h3 className="text-sm font-bold text-white mb-3">
              Diagrama de conexión inalámbrica en el taller (sin internet)
            </h3>
            <svg viewBox="0 0 760 190" className="w-full h-auto select-none">
              <rect x="8" y="18" width="190" height="150" rx="10" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
              <text x="103" y="45" textAnchor="middle" fill="#E0F2FE" fontSize="13" fontWeight="700">1. Tablet del Operador</text>
              <text x="103" y="68" textAnchor="middle" fill="#94A3B8" fontSize="10">Red WiFi: "{projectJson.network.wifiSsid}"</text>
              <text x="103" y="86" textAnchor="middle" fill="#FBBF24" fontSize="10">"Sin conexión a internet" (Normal)</text>
              <rect x="28" y="102" width="150" height="44" rx="6" fill="#020617" stroke="#334155" />
              <text x="103" y="122" textAnchor="middle" fill="#34D399" fontSize="11" fontWeight="700">http://{projectJson.network.apIp}</text>
              <text x="103" y="137" textAnchor="middle" fill="#94A3B8" fontSize="9.5">
                {projectJson.network.useMdns ? `o http://${projectJson.network.mdnsHost}.local` : 'mDNS desactivado'}
              </text>

              <path d="M 198 92 L 295 92" stroke="#10B981" strokeWidth="3" strokeDasharray="6 4" />
              <polygon points="295,86 307,92 295,98" fill="#10B981" />
              <text x="252" y="78" textAnchor="middle" fill="#34D399" fontSize="10" fontWeight="700">WiFi Directo AP</text>
              <text x="252" y="112" textAnchor="middle" fill="#94A3B8" fontSize="9.5">JSON cada 300 ms</text>

              <rect x="307" y="18" width="215" height="150" rx="10" fill="#0F172A" stroke="#10B981" strokeWidth="2" />
              <text x="414" y="45" textAnchor="middle" fill="#D1FAE5" fontSize="13" fontWeight="700">2. ESP32 DevKit (Cerebro)</text>
              <text x="414" y="67" textAnchor="middle" fill="#94A3B8" fontSize="10">Sirve panel_web.h desde su Flash</text>
              <text x="414" y="85" textAnchor="middle" fill="#94A3B8" fontSize="10">Gobierna L298N (Cabrestante + Giro)</text>
              <text x="414" y="103" textAnchor="middle" fill="#94A3B8" fontSize="10">Lee 3×FC-33, Hall, US-H, US-V, PARO</text>
              <text x="414" y="122" textAnchor="middle" fill="#38BDF8" fontSize="10">OLED A (D21/22) + OLED B (D16/17)</text>
              <text x="414" y="144" textAnchor="middle" fill="#FBBF24" fontSize="10">
                OTA: {projectJson.network.otaEnabled ? 'Habilitado' : 'Desactivado'}
              </text>

              <path d="M 522 92 L 580 92" stroke="#FACC15" strokeWidth="3" />
              <polygon points="580,86 592,92 580,98" fill="#FACC15" />
              <text x="556" y="78" textAnchor="middle" fill="#FDE047" fontSize="9.5" fontWeight="700">GT-1.0</text>
              <text x="556" y="112" textAnchor="middle" fill="#94A3B8" fontSize="9">9600 bps</text>

              <rect x="592" y="18" width="160" height="150" rx="10" fill="#0F172A" stroke="#F59E0B" strokeWidth="2" />
              <text x="672" y="45" textAnchor="middle" fill="#FEF3C7" fontSize="13" fontWeight="700">3. Arduino UNO</text>
              <text x="672" y="67" textAnchor="middle" fill="#94A3B8" fontSize="10">+ Shield L293D</text>
              <text x="672" y="90" textAnchor="middle" fill="#94A3B8" fontSize="10">M1: Carro (≤ 50%)</text>
              <text x="672" y="108" textAnchor="middle" fill="#94A3B8" fontSize="10">M2: Electroimán</text>
              <text x="672" y="126" textAnchor="middle" fill="#94A3B8" fontSize="10">M3: Bombillo (~40%)</text>
              <text x="672" y="146" textAnchor="middle" fill="#FDE047" fontSize="10">LCD 1602 + 3 Buzzers</text>
            </svg>
          </div>

          {/* Capturas simuladas de la tablet + Configuración WiFi/PIN/OTA */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Simulación visual de los pasos en la tablet */}
            <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">
                Paso a paso en tu tablet (captura simulada)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-950 border border-slate-700 p-3 space-y-2">
                  <div className="text-[10px] font-mono text-sky-400">PASO 1 · Ajustes WiFi</div>
                  <div className="rounded bg-slate-900 border border-slate-800 p-2.5 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                        {projectJson.network.wifiSsid}
                      </span>
                      <span className="text-[10px] text-emerald-400">Conectada</span>
                    </div>
                    <p className="text-[10px] text-amber-300">
                      Conectada sin acceso a internet · Toca "Mantener conexión"
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-950 border border-slate-700 p-3 space-y-2">
                  <div className="text-[10px] font-mono text-emerald-400">PASO 2 · Navegador Web</div>
                  <div className="rounded bg-slate-900 border border-slate-800 p-2.5 text-xs space-y-1.5">
                    <div className="rounded bg-slate-950 px-2 py-1 text-[11px] font-mono text-emerald-300 border border-slate-700">
                      http://{projectJson.network.apIp}
                    </div>
                    <p className="text-[10px] text-slate-300">
                      Abre el Panel de Control guardado en el ESP32 (Control, Cargas, Calibración, Diagnóstico y Registro).
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Nota: Mientras manejas la grúa desde la tablet conectada a «{projectJson.network.wifiSsid}», no podrás navegar en internet hasta volver al WiFi de tu casa o laboratorio.
              </p>
            </div>

            {/* Configuración editable de Red WiFi AP, PIN y OTA */}
            <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  Configuración de Red del ESP32 (pasa a config.h)
                </h3>
                <StatusChip status={wifiValid ? 'CONFIRMADO' : 'POR CONFIRMAR'} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Nombre de red WiFi (SSID)</label>
                  <input
                    type="text"
                    value={params.wifiSsid ?? 'GRUA'}
                    onChange={(e) => onUpdateParams({ wifiSsid: e.target.value })}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-white font-mono"
                    placeholder="GRUA"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">
                    Clave WiFi WPA2 (mínimo 8 caracteres)
                  </label>
                  <input
                    type="text"
                    value={wifiPass}
                    onChange={(e) => onUpdateParams({ wifiPassword: e.target.value })}
                    className={`w-full rounded-lg bg-slate-950 border px-3 py-2 text-white font-mono ${
                      wifiValid ? 'border-emerald-600' : 'border-amber-500'
                    }`}
                    placeholder="Escribe 8+ caracteres"
                  />
                  {!wifiValid && (
                    <span className="text-[10px] text-amber-300 mt-1 block">
                      POR CONFIRMAR: define una clave personal de al menos 8 caracteres antes de subir el código.
                    </span>
                  )}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={params.useMdns ?? true}
                      onChange={(e) => onUpdateParams({ useMdns: e.target.checked })}
                      className="rounded border-slate-600"
                    />
                    Habilitar dirección fácil http://{(params.mdnsHost || 'grua')}.local (mDNS)
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer mt-1">
                    <input
                      type="checkbox"
                      checked={params.otaEnabled ?? true}
                      onChange={(e) => onUpdateParams({ otaEnabled: e.target.checked })}
                      className="rounded border-slate-600"
                    />
                    Habilitar actualización inalámbrica ArduinoOTA
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.operatorPinEnabled ?? false}
                      onChange={(e) => onUpdateParams({ operatorPinEnabled: e.target.checked })}
                      className="rounded border-slate-600"
                    />
                    Exigir PIN de 4 dígitos en la tablet
                  </label>
                </div>
                {params.operatorPinEnabled && (
                  <div>
                    <label className="block text-slate-400 mb-1">PIN de operador (4 dígitos)</label>
                    <input
                      type="text"
                      maxLength={4}
                      value={params.operatorPin ?? '1234'}
                      onChange={(e) => onUpdateParams({ operatorPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Solucionador de problemas */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              Si algo falla al conectar la tablet, revisa esto en orden:
            </h3>
            <div className="space-y-2">
              {TROUBLESHOOT_ITEMS.map((item) => {
                const open = openFaq === item.id;
                return (
                  <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950/70">
                    <button
                      onClick={() => setOpenFaq(open ? '' : item.id)}
                      className="w-full px-4 py-3 text-left text-xs font-semibold text-white flex items-center justify-between"
                    >
                      <span>{item.question}</span>
                      <span className="text-slate-400">{open ? 'Ocultar' : 'Ver solución'}</span>
                    </button>
                    {open && (
                      <ol className="px-4 pb-3 space-y-1.5 text-xs text-slate-300 list-decimal list-inside border-t border-slate-800/80 pt-2">
                        {item.steps.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Pestaña 2: project.json en vivo */}
      {subTab === 'project' && (
        <div className="space-y-4">
          {recentChanges.length > 0 && (
            <div className="rounded-xl bg-emerald-950/30 border border-emerald-500/40 p-4">
              <h4 className="text-xs font-bold text-emerald-300 mb-2">
                Registro de propagación automática (últimos cambios en project.json)
              </h4>
              <div className="space-y-2">
                {recentChanges.slice(0, 4).map((ev) => (
                  <div key={ev.id} className="text-xs text-slate-200 flex flex-wrap items-center gap-2">
                    <span className="font-mono text-slate-400">[{ev.timestamp}]</span>
                    <span>{ev.summary}:</span>
                    <span className="text-emerald-200">{ev.details.join(' · ')}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                      Regenerado: {ev.affectedModules.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-white">
                  project.json vigente (esquema {projectJson.schemaVersion})
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedJson ? 'Copiado' : 'Copiar JSON'}
                  </button>
                  <button
                    onClick={onExportProjectJson}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar project.json
                  </button>
                </div>
              </div>
              <pre className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-[11px] font-mono text-emerald-200 max-h-[420px] overflow-auto">
                {JSON.stringify(projectJson, null, 2)}
              </pre>
            </div>

            <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Upload className="w-4 h-4 text-sky-400" />
                Importar project.json
              </h3>
              <p className="text-xs text-slate-400">
                Pega el contenido de un <code className="text-slate-200">project.json</code> guardado anteriormente. Todos los módulos (láminas, guía, informe y firmware) se regenerarán automáticamente.
              </p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={10}
                placeholder='{"schemaVersion":"2.0.0", ...}'
                className="w-full rounded-lg bg-slate-950 border border-slate-700 p-2.5 text-[11px] font-mono text-slate-200"
              />
              <button
                onClick={handleImportPaste}
                className="w-full py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold"
              >
                Validar e Importar JSON
              </button>
              {importMsg && (
                <div
                  className={`rounded-lg p-2.5 text-xs flex items-start gap-2 ${
                    importMsg.ok
                      ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/60 border border-rose-500/40 text-rose-200'
                  }`}
                >
                  {importMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                  <span>{importMsg.message}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pestaña 3: Historial y Versiones */}
      {subTab === 'history' && (
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">
                Historial y Versiones de project.json
              </h3>
              <p className="text-xs text-slate-400">
                Guarda puntos de control manuales o restaura versiones previas cuando cambies pines o calibración.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                placeholder="Ej. Calibración final laboratorio"
                className="rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white"
              />
              <button
                onClick={() => {
                  onCreateSnapshot(snapshotLabel.trim() || 'Versión guardada');
                  setSnapshotLabel('');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                <Save className="w-3.5 h-3.5" />
                Guardar versión ahora
              </button>
            </div>
          </div>

          {snapshots.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center border border-dashed border-slate-800 rounded-lg">
              Aún no hay versiones guardadas. Cada cambio importante de pines o calibración crea una versión automática o puedes guardarla manualmente arriba.
            </p>
          ) : (
            <div className="space-y-2">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="rounded-lg bg-slate-950 border border-slate-800 p-3 flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{snap.label}</span>
                      <span className="text-[11px] font-mono text-slate-400">{snap.timestamp}</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{snap.summary}</p>
                  </div>
                  <button
                    onClick={() => onRestoreSnapshot(snap.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-200 text-xs font-semibold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar esta versión
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
