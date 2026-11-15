import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileArchive,
  FileCode2,
  FileSpreadsheet,
  Lock,
  Printer,
  ShoppingCart,
  Upload,
} from 'lucide-react';
import { DEFINITIVE_CONNECTIONS } from '../data/craneData';
import {
  CraneComponent,
  CraneProjectJson,
  HarnessConductor,
  NotebookLogRow,
  PinAssignment,
  RealMeasurementRow,
  UserEditableParams,
} from '../types/crane';
import {
  generateOverleafZip,
  OverleafFigurePayload,
  rasterizeSvgToPng,
} from '../utils/overleafZip';
import { buildProjectDocumentationMarkdown } from '../utils/projectJson';
import { computeShoppingList, runProjectValidation } from '../utils/validator';
import { SCHEMATIC_PLATES, SchematicSvg } from './ElectricalSchematics';

interface ExportsCenterProps {
  components: CraneComponent[];
  pinAssignments: PinAssignment[];
  conductors: HarnessConductor[];
  params: UserEditableParams;
  projectJson?: CraneProjectJson;
  logRows: NotebookLogRow[];
  realMeasurements: RealMeasurementRow[];
  onUpdateParams?: (next: Partial<UserEditableParams>) => void;
  onExportConfig: (format: 'json' | 'table') => void;
  onImportProjectJson: (rawJson: string) => { ok: boolean; message: string };
  onNavigateTab: (tab: string) => void;
}

export const ExportsCenter: React.FC<ExportsCenterProps> = ({
  pinAssignments,
  components,
  conductors,
  params,
  projectJson,
  realMeasurements,
  onUpdateParams,
  onExportConfig,
  onImportProjectJson,
  onNavigateTab,
}) => {
  const [exportingZip, setExportingZip] = useState(false);
  const [importFeedback, setImportFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [activeToolSection, setActiveToolSection] = useState<'exports' | 'bom' | 'labels' | 'docs'>('exports');
  const jsonInputRef = useRef<HTMLInputElement | null>(null);
  const offscreenSvgContainerRef = useRef<HTMLDivElement | null>(null);

  const validation = runProjectValidation(pinAssignments, components, params);
  const shoppingList = computeShoppingList(components, params);
  const bomCosts = params.bomUnitCostsCop || {};
  const totalProjectCost = components.reduce(
    (sum, c) => sum + (bomCosts[c.id] || 0) * c.usedQty,
    0
  );
  const docsMd = projectJson ? buildProjectDocumentationMarkdown(projectJson) : '';

  const downloadBlob = (filename: string, blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadFile = (filename: string, content: string, mime: string) => {
    downloadBlob(filename, new Blob([content], { type: mime }));
  };

  const handleExportHarnessCsv = () => {
    const header = 'Index,Tramo,Etiqueta,Grupo,Color,Origen,Destino,Voltaje,ExtraCm\n';
    const rows = conductors
      .map(
        (c) =>
          `${c.index},"${c.tramo}","${c.shortLabel}","${c.group}","${c.color}","${c.origin}","${c.destination}","${c.voltage}",${c.extraLengthCm}`
      )
      .join('\n');
    downloadFile('crane-engineering-studio-manguera.csv', header + rows, 'text/csv;charset=utf-8;');
  };

  const handleExportInventoryCsv = () => {
    const header = 'Codigo,Nombre,Categoria,Disponible,Usada,Zona,Dimensiones,Estado,Voltaje\n';
    const rows = components
      .map(
        (c) =>
          `"${c.shortCode}","${c.name}","${c.category}",${c.availableQty},${c.usedQty},"${c.zone}","${c.dimensionsMm}","${c.status}","${c.operatingVoltage}"`
      )
      .join('\n');
    downloadFile('crane-engineering-studio-inventario.csv', header + rows, 'text/csv;charset=utf-8;');
  };

  const handleExportMasterConnectionsCsv = () => {
    const header =
      'ID,Etapa,Origen,PinOrigen,Destino,PinDestino,Voltaje,ColorCable,TipoJumper,CoordProtoboard,Divisor,Estado,Notas\n';
    const rows = DEFINITIVE_CONNECTIONS.map(
      (w) =>
        `"${w.id}","${w.stage}","${w.fromComponentName}","${w.fromPin}","${w.toComponentName}","${w.toPin}","${w.voltage}","${w.wireColor}","${w.jumperType}","${w.breadboardCoord ?? ''}","${w.dividerId ?? 'No'}","${w.status}","${w.notes}"`
    ).join('\n');
    downloadFile(
      'crane-engineering-studio-conexiones-maestra.csv',
      header + rows,
      'text/csv;charset=utf-8;'
    );
  };

  const handleExportShoppingListCsv = () => {
    const header = 'ID,Componente,Necesario,Disponible,Faltante,Especificacion,Estado\n';
    const rows = shoppingList
      .map(
        (s) =>
          `"${s.id}","${s.item}",${s.neededQty},"${s.availableQty ?? 'POR CONFIRMAR'}",${s.missingQty},"${s.specification}","${s.status}"`
      )
      .join('\n');
    downloadFile(
      'crane-engineering-studio-lista-compras.csv',
      header + rows,
      'text/csv;charset=utf-8;'
    );
  };

  const handleExportOverleafZip = async () => {
    if (!validation.canExport) return;
    setExportingZip(true);
    try {
      const container = offscreenSvgContainerRef.current;
      const svgNodes = container ? Array.from(container.querySelectorAll('svg')) : [];
      const figures: OverleafFigurePayload[] = [];
      for (let i = 0; i < SCHEMATIC_PLATES.length; i++) {
        const plate = SCHEMATIC_PLATES[i];
        const svgEl = svgNodes[i] as SVGSVGElement | undefined;
        if (svgEl) {
          const rendered = await rasterizeSvgToPng(svgEl, 1400);
          figures.push({
            filename: `lamina_${plate.id}`,
            ext: rendered.ext,
            data: rendered.data,
            caption: plate.title,
          });
        }
      }
      const zipBlob = generateOverleafZip({
        components,
        pinAssignments,
        params,
        realMeasurements,
        figures,
      });
      downloadBlob('crane-engineering-studio-overleaf.zip', zipBlob);
    } finally {
      setExportingZip(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-2">
        <h2 className="text-xl font-bold text-white">
          Centro de Exportaciones (Overleaf .zip, PDF A4, Conexiones y Compras CSV)
        </h2>
        <p className="text-xs text-slate-400">
          Por seguridad eléctrica y verificación de montaje, las exportaciones requieren que el
          Validador reporte <strong>0 errores</strong> antes de generar los archivos finales.
        </p>
      </div>

      {/* Contenedor oculto para renderizar las 8 láminas SVG en tema claro y rasterizarlas a PNG en Overleaf */}
      <div
        ref={offscreenSvgContainerRef}
        aria-hidden="true"
        className="fixed -left-[9999px] top-0 w-[900px] pointer-events-none opacity-0"
      >
        {SCHEMATIC_PLATES.map((p) => (
          <div key={p.id}>
            <SchematicSvg plateId={p.id} lightTheme />
          </div>
        ))}
      </div>

      {/* Puerta de validación */}
      {!validation.canExport ? (
        <div className="rounded-xl bg-rose-950/35 border border-rose-500/60 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Lock className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-rose-200">
                Exportaciones bloqueadas ({validation.errorCount} error(es) en el Validador)
              </h3>
              <p className="text-xs text-rose-100 mt-1">
                Corrige los fallos eléctricos, de guía o de inventario para desbloquear la
                descarga.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('validator')}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold whitespace-nowrap shrink-0"
          >
            Ir al Validador
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-emerald-950/25 border border-emerald-500/50 p-4 flex items-center gap-3 text-xs text-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            <strong>Validador aprobado (0 errores):</strong> todas las exportaciones están
            habilitadas.
          </span>
        </div>
      )}

      {/* Tarjetas de exportación */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <FileArchive className="w-6 h-6 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Proyecto LaTeX para Overleaf (.zip)</h3>
            <p className="text-xs text-slate-400">
              Incluye <code className="text-slate-300">main.tex</code>, carpeta{' '}
              <code className="text-slate-300">secciones/</code>,{' '}
              <code className="text-slate-300">referencias.bib</code> y las 8 láminas en{' '}
              <code className="text-slate-300">figuras/</code>.
            </p>
          </div>
          <button
            disabled={!validation.canExport || exportingZip}
            onClick={handleExportOverleafZip}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition"
          >
            <Download className="w-4 h-4" />
            {exportingZip ? 'Empaquetando ZIP...' : 'Descargar ZIP Overleaf'}
          </button>
        </div>

        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <FileSpreadsheet className="w-6 h-6 text-sky-400" />
            <h3 className="text-base font-bold text-white">Tabla Maestra de Conexiones (CSV)</h3>
            <p className="text-xs text-slate-400">
              Exporta las {DEFINITIVE_CONNECTIONS.length} conexiones definitivas (origen, destino,
              color, tipo de jumper, coordenada en protoboard y etapa E1–E8).
            </p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={!validation.canExport}
              onClick={handleExportMasterConnectionsCsv}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition"
            >
              <Download className="w-3.5 h-3.5" />
              Conexiones CSV
            </button>
            <button
              disabled={!validation.canExport}
              onClick={() => onExportConfig('table')}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold"
            >
              Pines MD
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <ShoppingCart className="w-6 h-6 text-amber-400" />
            <h3 className="text-base font-bold text-white">
              Lista de Compras ({shoppingList.length} ítem(s))
            </h3>
            <p className="text-xs text-slate-400">
              Exporta en CSV lo que falta comprar o confirmar por cantidad (incluye electroimán
              12 V 25 N y faltantes de inventario).
            </p>
          </div>
          <button
            disabled={!validation.canExport}
            onClick={handleExportShoppingListCsv}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition"
          >
            <Download className="w-4 h-4" />
            Descargar Compras CSV
          </button>
        </div>

        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <FileCode2 className="w-6 h-6 text-violet-400" />
            <h3 className="text-base font-bold text-white">Respaldo e Importación (JSON)</h3>
            <p className="text-xs text-slate-400">
              Exporta o importa el proyecto completo: dimensiones del usuario, inventario, pines,
              pasos completados, bitácora, mediciones reales y lecciones aprendidas.
            </p>
            {importFeedback && (
              <div
                className={`mt-2 rounded border px-2.5 py-1.5 text-[11px] flex items-start gap-1.5 ${
                  importFeedback.ok
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/50 border-rose-500/40 text-rose-200'
                }`}
              >
                {importFeedback.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                )}
                <span>{importFeedback.message}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={!validation.canExport}
              onClick={() => onExportConfig('json')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Exportar JSON
            </button>
            <input
              ref={jsonInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const res = onImportProjectJson(String(reader.result ?? ''));
                  setImportFeedback(res);
                };
                reader.onerror = () => {
                  setImportFeedback({
                    ok: false,
                    message: 'No se pudo leer el archivo JSON seleccionado.',
                  });
                };
                reader.readAsText(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => jsonInputRef.current?.click()}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold transition whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              Importar JSON
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1.5">
            <FileSpreadsheet className="w-6 h-6 text-amber-300" />
            <h3 className="text-base font-bold text-white">Manguera e Inventario (CSV)</h3>
            <p className="text-xs text-slate-400">
              Descarga por separado los 31 conductores (Tramo A + Tramo B) y la tabla de
              componentes.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              disabled={!validation.canExport}
              onClick={handleExportHarnessCsv}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold"
            >
              Manguera CSV
            </button>
            <button
              disabled={!validation.canExport}
              onClick={handleExportInventoryCsv}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold"
            >
              Inventario CSV
            </button>
          </div>
        </div>

        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <Printer className="w-6 h-6 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Informe A4 y Cuaderno en PDF</h3>
            <p className="text-xs text-slate-400">
              Tema claro académico serif con márgenes de 2,5 cm listo para imprimir o guardar PDF.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              disabled={!validation.canExport}
              onClick={() => onNavigateTab('report')}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold"
            >
              Abrir Informe UIS (PDF A4)
            </button>
            <button
              disabled={!validation.canExport}
              onClick={() => onNavigateTab('notebook')}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-semibold"
            >
              Abrir Cuaderno de Ingeniería
            </button>
          </div>
        </div>
      </div>

      {/* Navegador de herramientas Fase 6: BOM Costos, Etiquetas de Cables y Manuales */}
      <div className="no-print flex flex-wrap gap-2 pt-2">
        {[
          ['bom', 'BOM y Costos Editables'],
          ['labels', 'Etiquetas Imprimibles de Cables'],
          ['docs', 'Manuales Auto-generados (Operación / E01–E07)'],
        ].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveToolSection(id as typeof activeToolSection)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
              activeToolSection === id
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-[#0F172A] border-slate-800 text-slate-300 hover:border-slate-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* BOM con costos editables */}
      {activeToolSection === 'bom' && (
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Lista de Materiales (BOM) con Costos Unitarios Editables
              </h3>
              <p className="text-xs text-slate-400">
                Ingresa el precio unitario real de tu ciudad (COP/USD); no inventamos precios.
              </p>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-slate-400">Costo total estimado usado:</div>
              <div className="text-lg font-mono font-bold text-emerald-300">
                $ {totalProjectCost.toLocaleString('es-CO')}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#0B1120] text-slate-400">
                <tr>
                  <th className="py-2 px-3">Código</th>
                  <th className="py-2 px-3">Componente</th>
                  <th className="py-2 px-3">Usado / Disp.</th>
                  <th className="py-2 px-3">Estado</th>
                  <th className="py-2 px-3">Precio unitario</th>
                  <th className="py-2 px-3 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {components.map((c) => {
                  const unit = bomCosts[c.id] || 0;
                  return (
                    <tr key={c.id}>
                      <td className="py-2 px-3 font-mono text-sky-300">{c.shortCode}</td>
                      <td className="py-2 px-3 font-medium text-white">{c.name}</td>
                      <td className="py-2 px-3 font-mono">{c.usedQty} / {c.availableQty}</td>
                      <td className="py-2 px-3 text-[11px]">{c.status}</td>
                      <td className="py-2 px-3">
                        <input
                          type="number"
                          min={0}
                          value={unit || ''}
                          placeholder="0"
                          onChange={(e) =>
                            onUpdateParams?.({
                              bomUnitCostsCop: {
                                ...bomCosts,
                                [c.id]: Number(e.target.value) || 0,
                              },
                            })
                          }
                          className="w-28 rounded bg-slate-950 border border-slate-700 px-2 py-1 text-xs font-mono text-white"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-emerald-300">
                        $ {(unit * c.usedQty).toLocaleString('es-CO')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Etiquetas imprimibles de cables */}
      {activeToolSection === 'labels' && (
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
          <div className="no-print flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Etiquetas Imprimibles para los {conductors.length} Conductores (Tramo A y Tramo B)
              </h3>
              <p className="text-xs text-slate-400">
                Ajusta el ancho de etiqueta (mm) para envolver cada cable antes de pasarlo por el mástil.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <label className="text-slate-300 flex items-center gap-1.5">
                Ancho etiqueta (mm):
                <input
                  type="number"
                  min={22}
                  max={80}
                  value={params.labelWidthMm ?? 35}
                  onChange={(e) => onUpdateParams?.({ labelWidthMm: Number(e.target.value) || 35 })}
                  className="w-16 rounded bg-slate-950 border border-slate-700 px-2 py-1 text-white font-mono"
                />
              </label>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir etiquetas
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 bg-white text-slate-900 p-4 rounded-xl">
            {conductors.map((c) => {
              const swatch =
                c.color.toLowerCase().includes('rojo')
                  ? '#ef4444'
                  : c.color.toLowerCase().includes('naranja')
                    ? '#f97316'
                    : c.color.toLowerCase().includes('negro')
                      ? '#0f172a'
                      : c.color.toLowerCase().includes('verde')
                        ? '#16a34a'
                        : '#2563eb';
              return (
                <div
                  key={c.index}
                  style={{ width: `${Math.max(24, params.labelWidthMm ?? 35) * 4}px` }}
                  className="border border-slate-400 rounded p-1.5 text-[10px] leading-tight break-inside-avoid"
                >
                  <div className="flex items-center justify-between gap-1 font-bold">
                    <span className="font-mono">{c.shortLabel}</span>
                    <span
                      style={{ backgroundColor: swatch }}
                      className="w-3 h-3 rounded-full inline-block border border-slate-500 shrink-0"
                    />
                  </div>
                  <div className="text-[9px] text-slate-700 truncate">
                    {c.origin} → {c.destination}
                  </div>
                  <div className="text-[8px] font-mono text-slate-500">{c.voltage}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Documentación Auto-generada */}
      {activeToolSection === 'docs' && projectJson && (
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">
                Documentación Técnica Auto-generada (desde project.json)
              </h3>
              <p className="text-xs text-slate-400">
                Incluye Manual de Operación, Manual de Mantenimiento y Tabla de Códigos de Error E01–E07.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  downloadFile(
                    'manual-operacion-mantenimiento-grua.md',
                    docsMd,
                    'text/markdown;charset=utf-8;'
                  )
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" /> Descargar Markdown (.md)
              </button>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                <Printer className="w-3.5 h-3.5" /> Imprimir / PDF
              </button>
            </div>
          </div>

          <pre className="rounded-lg bg-slate-950 border border-slate-800 p-4 text-xs text-slate-200 whitespace-pre-wrap max-h-[420px] overflow-auto">
            {docsMd}
          </pre>
        </div>
      )}
    </div>
  );
};
