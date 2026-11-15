import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Camera,
  CheckCircle2,
  Send,
  Sparkles,
  Wrench,
  X,
} from 'lucide-react';
import {
  AdvisorMessage,
  AdvisorPatchProposal,
  CraneComponent,
  CraneProjectJson,
  PinAssignment,
  UserEditableParams,
} from '../types/crane';
import { runProjectValidation } from '../utils/validator';

interface AdvisorCraneDrawerProps {
  activeTab: string;
  activeStepTitle?: string;
  projectJson: CraneProjectJson;
  components: CraneComponent[];
  pinAssignments: PinAssignment[];
  params: UserEditableParams;
  onApplyValidatedPatch: (patch: AdvisorPatchProposal) => { ok: boolean; message: string };
  onExportConversationToNotebook: (summaryText: string) => void;
}

const DIAGNOSIS_TREES = [
  {
    id: 'oled-blank',
    label: 'OLED no prende',
    prompt: 'Mi pantalla OLED está completamente en negro y no muestra texto. Guíame paso a paso con el multímetro para diagnosticar si es alimentación R3 (3,3 V), pines I2C (OLED A o OLED B) o código.',
  },
  {
    id: 'motor-dead',
    label: 'Motor no gira',
    prompt: 'Uno de los motores de 12 V no gira cuando lo ordeno. Ayúdame a revisar paso a paso el interruptor general, puente PWR/5V-EN, señal del driver L298N o Shield M1 y tope de 2 motores.',
  },
  {
    id: 'fc33-zero',
    label: 'FC-33 sin pulsos',
    prompt: 'El sensor óptico FC-33 no cuenta pulsos cuando giro el disco. ¿Qué debo medir en +3,3 V (R3), GND y pin OUT del ESP32?',
  },
  {
    id: 'hall-fail',
    label: 'Hall no detecta',
    prompt: 'El sensor magnético Hall KY-003 no detecta el imán o no cambia de estado en el pin D33. Revisa su alimentación de 5 V (R2) y el Divisor #4.',
  },
  {
    id: 'us-noisy',
    label: 'US oscila o marca 0',
    prompt: 'El ultrasonido US-H o US-V oscila mucho o marca 0 cm. ¿Cómo reviso el Divisor #1 o #2, el disparo alternado ≥ 60 ms y el blanco acústico?',
  },
  {
    id: 'esp32-flash',
    label: 'ESP32 no sube código',
    prompt: 'Arduino IDE no logra subir el firmware al ESP32 (Timed out waiting for packet header). ¿Qué debo desconectar de VIN y del pin D2?',
  },
  {
    id: 'tablet-nowifi',
    label: 'Tablet no ve WiFi',
    prompt: 'Mi tablet no encuentra la red WiFi de la grúa o no abre http://192.168.4.1. Guíame para diagnosticarlo.',
  },
];

function extractPatchBlock(text: string): { cleanText: string; patch?: AdvisorPatchProposal } {
  const m = text.match(/```patch\s*([\s\S]*?)```/i);
  if (!m) return { cleanText: text };
  try {
    const parsed = JSON.parse(m[1]) as AdvisorPatchProposal;
    return {
      cleanText: text.replace(m[0], '').trim(),
      patch: {
        id: `PAT-${Date.now()}`,
        description: parsed.description || 'Cambio propuesto por Asesor Crane',
        paramsPatch: parsed.paramsPatch,
        pinPatches: parsed.pinPatches,
      },
    };
  } catch {
    return { cleanText: text };
  }
}

export const AdvisorCraneDrawer: React.FC<AdvisorCraneDrawerProps> = ({
  activeTab,
  activeStepTitle,
  projectJson,
  components,
  pinAssignments,
  params,
  onApplyValidatedPatch,
  onExportConversationToNotebook,
}) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'sencillo' | 'tecnico'>('sencillo');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    mimeType: string;
    previewUrl: string;
  } | null>(null);
  const [messages, setMessages] = useState<AdvisorMessage[]>([
    {
      id: 'ADV-WELCOME',
      role: 'assistant',
      timestamp: 'Inicio',
      text: 'Hola, soy tu Asesor Crane. Leo directamente tu project.json actual, las 8 láminas eléctricas y los pasos E0–E12. Pregúntame sobre pines, divisores, calibración, librerías, diagnóstico o sube una foto de tu protoboard.',
    },
  ]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const quickQuestions = useMemo(() => {
    switch (activeTab) {
      case 'schematics':
      case 'designer':
        return [
          '¿A qué pin va conectado ECHO del US-V y por qué divisor pasa?',
          '¿Cómo conecto el divisor del Hall KY-003 con resistencias de 1 kΩ?',
        ];
      case 'install':
      case 'codegen':
        return [
          '¿Qué librerías exactas necesito instalar en el Arduino UNO?',
          'Si el disco de giro tiene N=12 y i=3,6, ¿cuál es su resolución en °/pulso?',
        ];
      case 'assembly':
        return [
          '¿Por qué D12 (PARO) no puede llevar resistencia externa?',
          '¿Qué pasa si conecto el cable USB con R2 (+5 V) enchufado a VIN?',
        ];
      default:
        return [
          '¿A qué pin va conectado ECHO del US-V?',
          '¿Cómo conecto el divisor del Hall KY-003?',
          '¿Qué librerías van en el Arduino UNO?',
        ];
    }
  }, [activeTab]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const [meta, base64] = dataUrl.split(',');
      const mimeMatch = meta.match(/data:(.*?);/);
      if (base64) {
        setPendingImage({
          base64,
          mimeType: mimeMatch?.[1] || 'image/jpeg',
          previewUrl: dataUrl,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const sendMessage = async (textOverride?: string) => {
    const q = (textOverride ?? input).trim();
    if (!q && !pendingImage) return;

    const userMsg: AdvisorMessage = {
      id: `USR-${Date.now()}`,
      role: 'user',
      timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      text: q || 'Revisa esta fotografía de mi montaje comparándola con el paso actual.',
      imagePreviewUrl: pendingImage?.previewUrl,
    };

    const imgCopy = pendingImage;
    setMessages((prev) => [...prev, userMsg]);
    if (!textOverride) setInput('');
    setPendingImage(null);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setMessages((prev) => [
        ...prev,
        {
          id: `OFF-${Date.now()}`,
          role: 'assistant',
          timestamp: 'Offline',
          text: 'Estás sin conexión a internet: el Asesor Crane IA en línea no está disponible ahora. Puedes consultar las láminas eléctricas, los pasos E0–E12 y el Validador de forma totalmente offline.',
        },
      ]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          mode,
          activeTab,
          activeStepTitle,
          history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
          projectJson,
          imageBase64: imgCopy?.base64,
          imageMimeType: imgCopy?.mimeType,
        }),
      });
      const data = (await res.json()) as {
        text?: string;
        error?: string;
        toolCallsUsed?: string[];
      };

      if (!res.ok || data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ERR-${Date.now()}`,
            role: 'assistant',
            timestamp: 'Error',
            text: data.error || 'No se pudo obtener respuesta del Asesor Crane.',
          },
        ]);
      } else {
        const { cleanText, patch } = extractPatchBlock(data.text || '');
        setMessages((prev) => [
          ...prev,
          {
            id: `AST-${Date.now()}`,
            role: 'assistant',
            timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
            text: cleanText,
            toolCallsUsed: data.toolCallsUsed,
            patchProposal: patch,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `ERR-${Date.now()}`,
          role: 'assistant',
          timestamp: 'Error',
          text: 'No se pudo conectar con el servidor del Asesor Crane. Verifica tu conexión a internet.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyProposal = (msgId: string, patch: AdvisorPatchProposal) => {
    // Pre-validar antes de aplicar
    const nextParams = { ...params, ...(patch.paramsPatch || {}) };
    const nextPins = pinAssignments.map((p) => {
      const hit = patch.pinPatches?.find((pp) => pp.id === p.id);
      return hit ? { ...p, pin: hit.pin, notes: hit.notes ?? p.notes } : p;
    });
    const check = runProjectValidation(nextPins, components, nextParams);
    if (check.errorCount > 0) {
      const failList = check.checks.filter((c) => !c.passed && c.severity === 'ERROR').map((c) => c.title);
      setMessages((prev) => [
        ...prev,
        {
          id: `REJ-${Date.now()}`,
          role: 'assistant',
          timestamp: 'Validador',
          text: `Cambio bloqueado por el Validador porque violaría las reglas de seguridad: ${failList.join('; ')}`,
        },
      ]);
      return;
    }

    const res = onApplyValidatedPatch(patch);
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, patchApplied: res.ok } : m))
    );
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen(true)}
        className="no-print fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xl border border-emerald-400/50 transition"
        title="Abrir Asesor Crane IA"
      >
        <Bot className="w-4 h-4" />
        <span>Asesor Crane</span>
      </button>

      {/* Cajón lateral */}
      {open && (
        <div className="no-print fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#0B1120] border-l border-slate-800 h-full flex flex-col shadow-2xl">
            {/* Header del Asesor */}
            <div className="p-4 border-b border-slate-800 bg-[#0F172A] flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Asesor Crane (conectado a project.json)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Cita láminas y pasos exactos · Modo {mode === 'sencillo' ? 'Sencillo' : 'Técnico'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setMode((m) => (m === 'sencillo' ? 'tecnico' : 'sencillo'))}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-300 font-semibold"
                >
                  {mode === 'sencillo' ? 'Sencillo' : 'Técnico'}
                </button>
                <button
                  onClick={() => {
                    const summary = messages
                      .slice(-4)
                      .map((m) => `${m.role === 'user' ? 'Pregunta' : 'Asesor'}: ${m.text}`)
                      .join(' | ');
                    onExportConversationToNotebook(summary);
                  }}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-sky-300"
                  title="Guardar resumen en el Cuaderno de ingeniería"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Árboles de diagnóstico guiado */}
            <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-950/60 space-y-2">
              <div className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                <Wrench className="w-3 h-3 text-amber-400" />
                Diagnóstico guiado rápido:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DIAGNOSIS_TREES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => sendMessage(t.prompt)}
                    className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-200"
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de mensajes */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl p-3 text-xs space-y-2 ${
                    m.role === 'user'
                      ? 'bg-emerald-950/40 border border-emerald-700/40 ml-8 text-emerald-50'
                      : 'bg-[#0F172A] border border-slate-800 mr-4 text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-bold">{m.role === 'user' ? 'Tú' : 'Asesor Crane'}</span>
                    <span>{m.timestamp}</span>
                  </div>
                  {m.imagePreviewUrl && (
                    <img
                      src={m.imagePreviewUrl}
                      alt="Foto subida para inspección"
                      className="max-h-40 rounded-lg border border-slate-700"
                    />
                  )}
                  <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                  {m.toolCallsUsed && m.toolCallsUsed.length > 0 && (
                    <div className="text-[10px] font-mono text-sky-300">
                      Herramientas verificadas: {m.toolCallsUsed.join(', ')}
                    </div>
                  )}
                  {m.patchProposal && (
                    <div className="rounded-lg bg-amber-950/40 border border-amber-500/40 p-2.5 space-y-2">
                      <div className="text-[11px] font-bold text-amber-200 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Propuesta de cambio en project.json:
                      </div>
                      <p className="text-[11px] text-slate-200">{m.patchProposal.description}</p>
                      {m.patchApplied ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Cambio aplicado y propagado
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApplyProposal(m.id, m.patchProposal!)}
                            className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                          >
                            Aplicar
                          </button>
                          <button
                            onClick={() =>
                              setMessages((prev) =>
                                prev.map((x) => (x.id === m.id ? { ...x, patchProposal: undefined } : x))
                              )
                            }
                            className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[11px]"
                          >
                            Descartar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="text-xs text-slate-400 italic px-2">
                  Consultando project.json y herramientas de ingeniería...
                </div>
              )}
            </div>

            {/* Preguntas sugeridas según pantalla activa */}
            <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/50 flex flex-wrap gap-1.5">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-sky-300 text-left"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Barra de entrada + subida de foto */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="p-3 border-t border-slate-800 bg-[#0F172A] space-y-2"
            >
              {pendingImage && (
                <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
                  <span className="text-emerald-300 truncate">Foto lista para comparar con el paso actual</span>
                  <button
                    type="button"
                    onClick={() => setPendingImage(null)}
                    className="text-rose-300 text-[11px]"
                  >
                    Quitar
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 shrink-0"
                  title="Subir foto de protoboard o montaje para comparar"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pregunta sobre pines, voltajes, divisores o fallos..."
                  className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-xs text-white"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};
