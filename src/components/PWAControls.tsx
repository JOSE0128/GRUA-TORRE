import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, HelpCircle, Smartphone, WifiOff, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const OfflineIndicator: React.FC = () => {
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="no-print bg-amber-950/90 border-b border-amber-500/50 text-amber-100 px-4 py-2 text-xs flex items-center justify-center gap-2">
      <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
      <span>
        <strong>Modo sin conexión activo:</strong> La guía de montaje, biblioteca, láminas, validador, generador de código y simulador siguen funcionando con tus datos guardados. El Asesor IA requiere internet.
      </span>
    </div>
  );
};

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };
    checkStandalone();

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowGuide(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  if (isInstalled) return null;

  const triggerNativeInstall = async () => {
    if (!deferredPrompt) {
      setShowGuide(true);
      return;
    }
    await deferredPrompt.prompt();
    const res = await deferredPrompt.userChoice;
    if (res.outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowGuide(false);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Clipboard blocked in restricted context
    }
  };

  return (
    <>
      <div className="inline-flex items-center rounded-lg overflow-hidden border border-sky-500/40 bg-sky-950/60">
        <button
          onClick={triggerNativeInstall}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-900/70 whitespace-nowrap"
          title="Descargar Crane Studio en tu teléfono, tablet o PC para usarlo sin internet"
        >
          <Download className="w-3.5 h-3.5" />
          Instalar App
        </button>
        <button
          onClick={() => setShowGuide(true)}
          className="px-1.5 py-1.5 border-l border-sky-500/30 text-sky-300 hover:bg-sky-900/70 hover:text-white"
          title="¿Para qué sirve y cómo instalarlo en el teléfono?"
          aria-label="Guía para instalar en el teléfono"
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0F172A] border border-slate-700 shadow-2xl p-5 space-y-4 text-xs text-slate-200">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-300 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Descargar Crane Studio en tu teléfono o tablet
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Aplicación Web Progresiva (PWA · sin tienda de apps)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white"
                aria-label="Cerrar guía de instalación"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-1.5">
              <div className="font-semibold text-sky-300">¿Para qué sirve este botón?</div>
              <p className="text-slate-300 leading-relaxed">
                Guarda <strong>Crane Studio</strong> como un ícono en la pantalla de inicio de tu celular o tablet y descarga la Guía E0–E12, los planos eléctricos, el Validador y el Generador ZIP en la memoria del dispositivo para usarlos <strong>sin internet</strong> en el taller.
              </p>
              <p className="text-[11px] text-amber-300 leading-relaxed pt-1">
                <strong>Importante:</strong> Esta app es tu manual y diseñador de ingeniería. Para <em>mover la grúa física</em> con la tablet, te conectas al WiFi <strong>GRUA</strong> que crea el ESP32 y abres <code className="text-emerald-300">http://192.168.4.1</code>.
              </p>
            </div>

            {deferredPrompt && (
              <button
                onClick={triggerNativeInstall}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4" />
                Instalar ahora en este dispositivo
              </button>
            )}

            {isInIframe && (
              <div className="rounded-xl bg-amber-950/40 border border-amber-500/40 p-3 space-y-2">
                <div className="font-semibold text-amber-200">
                  Estás viendo la app dentro de una vista previa
                </div>
                <p className="text-amber-100/90 leading-relaxed">
                  Los navegadores bloquean el botón automático cuando una página está incrustada dentro de un marco de vista previa. Para descargarla en tu teléfono, abre la <strong>URL pública compartida</strong> directamente en Chrome (Android) o Safari (iPhone).
                </p>
                <button
                  onClick={handleCopyUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl ? 'Enlace copiado' : 'Copiar enlace actual'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`rounded-xl border p-3.5 space-y-2 ${!isIOS ? 'bg-slate-900/80 border-sky-500/40' : 'bg-slate-950 border-slate-800'}`}>
                <div className="font-bold text-white">Android (Chrome o Edge)</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
                  <li>Abre el enlace publicado en <strong>Chrome</strong>.</li>
                  <li>Pulsa <strong>«Instalar App»</strong> arriba o abre el menú <strong>⋮</strong> (arriba a la derecha).</li>
                  <li>Elige <strong>«Instalar aplicación»</strong> o <strong>«Añadir a pantalla de inicio»</strong>.</li>
                </ol>
              </div>

              <div className={`rounded-xl border p-3.5 space-y-2 ${isIOS ? 'bg-slate-900/80 border-sky-500/40' : 'bg-slate-950 border-slate-800'}`}>
                <div className="font-bold text-white">iPhone / iPad (Safari)</div>
                <ol className="list-decimal list-inside space-y-1 text-slate-300 leading-relaxed">
                  <li>Abre el enlace publicado en <strong>Safari</strong> (en iPhone, Chrome no instala apps web).</li>
                  <li>Toca el botón <strong>Compartir</strong> (cuadro con flecha arriba).</li>
                  <li>Baja y toca <strong>«Añadir a pantalla de inicio»</strong> → <strong>Añadir</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Cuando la abras desde el ícono instalado, este botón desaparecerá automáticamente.
              </span>
              <button
                onClick={() => setShowGuide(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold shrink-0"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
