import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  Monitor,
  Package,
  ShieldAlert,
} from 'lucide-react';
import { CraneProjectJson, UserEditableParams } from '../types/crane';
import { FIRMWARE_LIBRARIES } from '../utils/projectJson';

interface InstallationGuideProps {
  projectJson: CraneProjectJson;
  params: UserEditableParams;
  onUpdateParams: (next: Partial<UserEditableParams>) => void;
}

export const InstallationGuide: React.FC<InstallationGuideProps> = ({
  projectJson,
  params,
  onUpdateParams,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [preUploadChecks, setPreUploadChecks] = useState<Record<string, boolean>>({
    c1: false,
    c2: false,
    c3: false,
    c4: false,
    c5: false,
  });

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  };

  const handleDownloadLibrariesTxt = () => {
    const content = [
      '# Librerías y núcleos requeridos — Crane Engineering Studio',
      '# Instala la última versión estable y anota el número exacto en la app / Cuaderno de ingeniería.',
      '',
      ...FIRMWARE_LIBRARIES.map((lib) => {
        const ver = params.libraryVersions?.[lib.id] || 'POR CONFIRMAR (anotar versión instalada)';
        return `[${lib.targetController}] ${lib.exactManagerName} | Autor: ${lib.author} | Versión instalada: ${ver}${
          lib.boardManagerUrl ? ` | URL: ${lib.boardManagerUrl}` : ''
        }`;
      }),
    ].join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'libraries.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const allChecked = Object.values(preUploadChecks).every(Boolean);

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            Instalación de Librerías y Entorno (Arduino IDE 2.x)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            No inventamos números de versión: instala la última versión estable desde el gestor oficial y anota aquí el número que te muestre Arduino IDE para guardarlo en tu <code className="text-emerald-300">project.json</code> y Cuaderno.
          </p>
        </div>
        <button
          onClick={handleDownloadLibrariesTxt}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
        >
          <Download className="w-4 h-4" />
          Descargar libraries.txt
        </button>
      </div>

      {/* Advertencias críticas de seguridad antes de conectar USB */}
      <div className="rounded-xl bg-rose-950/35 border border-rose-500/50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-rose-200 font-bold text-sm">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          4 Reglas críticas antes de conectar cualquier placa por cable USB
        </div>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-rose-100/90 list-disc list-inside">
          <li>
            <strong>NUNCA USB + riel +5 V al mismo tiempo:</strong> desconecta el cable rojo de <code className="text-white">R2 (+5 V)</code> que va a <code className="text-white">ESP32 VIN</code> y <code className="text-white">UNO 5V</code> antes de enchufar el USB.
          </li>
          <li>
            <strong>Retira el jumper desmontable de ESP32 D2:</strong> al programar por USB quita temporalmente ese jumper (o usa OTA inalámbrico una vez cargado el primer sketch).
          </li>
          <li>
            <strong>Cambia de placa activa cada vez:</strong> usa <code className="text-white">ESP32 Dev Module</code> para <code className="text-white">grua_esp32.ino</code> y cambia a <code className="text-white">Arduino UNO</code> para <code className="text-white">grua_uno.ino</code>.
          </li>
          <li>
            <strong>Dirección LCD 1602:</strong> verifica con el sketch escáner si tu módulo usa <code className="text-white">0x27</code> o <code className="text-white">0x3F</code> y selecciónalo en <code className="text-white">project.json</code> (actual: <strong>{projectJson.calibration.lcdI2cAddress}</strong>).
          </li>
        </ul>
      </div>

      {/* Pasos numerados + capturas simuladas del IDE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Monitor className="w-4 h-4 text-sky-400" />
            Pasos en Arduino IDE 2.x (principiantes)
          </h3>
          <ol className="space-y-2.5 text-xs text-slate-300 list-decimal list-inside">
            <li>Abre <strong>Archivo → Preferencias</strong> (Windows/Linux) o <strong>Arduino IDE → Settings</strong> (Mac).</li>
            <li>En el campo <strong>«URLs adicionales de gestor de placas»</strong>, pega las dos URLs de Espressif y Bluepad32 (separadas por coma o una por línea).</li>
            <li>Abre el ícono izquierdo <strong>Gestor de placas</strong>, busca <strong>«esp32»</strong> por Espressif Systems e instala la última estable.</li>
            <li>Abre el ícono izquierdo <strong>Gestor de librerías</strong> (pila de libros), busca uno por uno los nombres exactos de la tabla de abajo y acepta instalar sus dependencias.</li>
            <li>Anota en el campo editable de cada tarjeta la versión que quedó instalada para dejar trazabilidad en tu Cuaderno.</li>
          </ol>

          <div className="space-y-2 pt-2">
            {FIRMWARE_LIBRARIES.filter((l) => l.boardManagerUrl).map((l) => (
              <div key={l.id} className="rounded-lg bg-slate-950 border border-slate-800 p-2.5 text-xs">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-semibold text-sky-300">{l.name}</span>
                  <button
                    onClick={() => handleCopy(l.id, l.boardManagerUrl!)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200"
                  >
                    <Copy className="w-3 h-3" />
                    {copiedId === l.id ? 'Copiada' : 'Copiar URL'}
                  </button>
                </div>
                <code className="block text-[10px] font-mono text-slate-400 break-all">{l.boardManagerUrl}</code>
              </div>
            ))}
          </div>
        </div>

        {/* Captura simulada de Arduino IDE 2.x */}
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Vista simulada en Arduino IDE 2.x</h3>
          <div className="rounded-lg bg-[#161B22] border border-slate-700 overflow-hidden text-xs">
            <div className="bg-[#0D1117] px-3 py-2 border-b border-slate-700 flex items-center justify-between">
              <span className="font-mono text-[11px] text-slate-300">Archivo &gt; Preferencias &gt; Gestor de librerías</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300">Placas: ESP32 / UNO</span>
            </div>
            <div className="p-3 space-y-2.5">
              <div className="rounded bg-[#0D1117] border border-slate-700 p-2">
                <div className="text-[10px] text-slate-400">Additional Boards Manager URLs:</div>
                <div className="text-[11px] font-mono text-sky-300 truncate">
                  https://espressif.github.io/arduino-esp32/package_esp32_index.json
                </div>
              </div>
              <div className="rounded bg-[#0D1117] border border-slate-700 p-2 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-[11px]">Adafruit Motor Shield library</div>
                  <div className="text-[10px] text-slate-400">by Adafruit · V1 (AFMotor.h) — ¡NO usar V2!</div>
                </div>
                <span className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold">INSTALL</span>
              </div>
              <div className="rounded bg-[#0D1117] border border-slate-700 p-2 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-[11px]">LiquidCrystal I2C</div>
                  <div className="text-[10px] text-slate-400">by Frank de Brabander</div>
                </div>
                <span className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px] font-bold">INSTALL</span>
              </div>
            </div>
          </div>

          {/* Checklist Antes de Subir */}
          <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">Lista «Antes de subir»</span>
              {allChecked ? (
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Listo para subir
                </span>
              ) : (
                <span className="text-[11px] text-amber-300">Completa los 5 pasos</span>
              )}
            </div>
            {[
              { id: 'c1', text: 'Desconecté el cable +5 V de R2 hacia ESP32 VIN y UNO 5V antes de enchufar USB.' },
              { id: 'c2', text: 'Desconecté el jumper desmontable de ESP32 D2 (si voy a cargar al ESP32 por USB).' },
              { id: 'c3', text: 'Verifiqué que la placa seleccionada arriba coincide con el sketch (ESP32 Dev Module o Arduino UNO).' },
              { id: 'c4', text: 'Instalé Adafruit Motor Shield library V1 (NO V2) para el Arduino UNO.' },
              { id: 'c5', text: 'Definí una clave WiFi ≥ 8 caracteres en la pestaña Tablet / project.json.' },
            ].map((chk) => (
              <label key={chk.id} className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(preUploadChecks[chk.id])}
                  onChange={(e) =>
                    setPreUploadChecks((prev) => ({ ...prev, [chk.id]: e.target.checked }))
                  }
                  className="mt-0.5 rounded border-slate-600"
                />
                <span>{chk.text}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Tarjetas de todas las librerías */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIRMWARE_LIBRARIES.map((lib) => {
          const userVer = params.libraryVersions?.[lib.id] ?? '';
          return (
            <div key={lib.id} className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300">
                    {lib.targetController} · {lib.targetFile}
                  </span>
                  <h4 className="text-sm font-bold text-white mt-1.5">{lib.name}</h4>
                  <p className="text-[11px] text-slate-400">
                    Nombre exacto: <strong className="text-slate-200">{lib.exactManagerName}</strong> · Autor: {lib.author}
                  </p>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold shrink-0 ${
                    lib.isBuiltIn
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-amber-950 text-amber-200 border border-amber-700'
                  }`}
                >
                  {lib.isBuiltIn ? 'Integrada' : 'Instalar'}
                </span>
              </div>

              <p className="text-xs text-slate-300">{lib.purpose}</p>

              <div className="rounded-lg bg-rose-950/25 border border-rose-500/30 p-2.5 text-[11px]">
                <div className="text-rose-300 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Error típico: {lib.commonError}
                </div>
                <div className="text-slate-300 mt-1">
                  <strong>Solución:</strong> {lib.commonErrorFix}
                </div>
              </div>

              {lib.notes && (
                <p className="text-[11px] text-amber-300">{lib.notes}</p>
              )}

              {!lib.isBuiltIn && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Versión instalada en tu PC (instala la última estable y anótala aquí):
                  </label>
                  <input
                    type="text"
                    value={userVer}
                    onChange={(e) =>
                      onUpdateParams({
                        libraryVersions: {
                          ...(params.libraryVersions || {}),
                          [lib.id]: e.target.value,
                        },
                      })
                    }
                    placeholder="Ej. anotar tras instalar en Library Manager"
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs font-mono text-emerald-200"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
