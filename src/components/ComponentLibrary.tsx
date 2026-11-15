import React, { useMemo, useState } from 'react';
import {
  Camera,
  ExternalLink,
  Filter,
  ImagePlus,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { computeJumperSummary, DEFINITIVE_CONNECTIONS } from '../data/craneData';
import {
  ComponentCategory,
  CraneComponent,
  UserEditableParams,
  ZoneId,
} from '../types/crane';
import { StatusChip } from './StatusChip';

interface ComponentLibraryProps {
  components: CraneComponent[];
  params: UserEditableParams;
  onUpdateComponent: (id: string, patch: Partial<CraneComponent>) => void;
  onAddComponent: (newComp: CraneComponent) => void;
  onUpdateParams: (next: Partial<UserEditableParams>) => void;
}

const CATEGORIES: ComponentCategory[] = [
  'Controladores',
  'Drivers y Potencia',
  'Motores y Actuadores',
  'Sensores',
  'Pantallas e Interfaz',
  'Fuentes y Protección',
  'Cableado y Protoboards',
];

const ZONES_FILTER: ZoneId[] = [
  'Z1', 'Z2', 'Z3', 'Z4', 'Z5', 'Z6', 'Z7', 'Z8', 'EXTERNO', 'RESERVA',
];

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({
  components,
  params,
  onUpdateComponent,
  onAddComponent,
  onUpdateParams,
}) => {
  const [search, setSearch] = useState('');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showNewModal, setShowNewModal] = useState(false);

  // Formulario "Nuevo desde foto"
  const [newName, setNewName] = useState('');
  const [newShortCode, setNewShortCode] = useState('');
  const [newCategory, setNewCategory] = useState<ComponentCategory>('Sensores');
  const [newZone, setNewZone] = useState<ZoneId>('Z1');
  const [newZoneDetail, setNewZoneDetail] = useState('');
  const [newAvail, setNewAvail] = useState(1);
  const [newUsed, setNewUsed] = useState(0);
  const [newRole, setNewRole] = useState('');
  const [newSentence1, setNewSentence1] = useState('');
  const [newSentence2, setNewSentence2] = useState('');
  const [newVoltage, setNewVoltage] = useState('POR CONFIRMAR');
  const [newWireColor, setNewWireColor] = useState('POR CONFIRMAR');
  const [newDimensions, setNewDimensions] = useState('POR CONFIRMAR (medir con regla)');
  const [newPhoto, setNewPhoto] = useState<string | undefined>(undefined);

  const jumperSummary = useMemo(
    () => computeJumperSummary(DEFINITIVE_CONNECTIONS),
    []
  );

  const filtered = useMemo(() => {
    return components.filter((c) => {
      const q = search.toLowerCase();
      const matchText =
        c.name.toLowerCase().includes(q) ||
        c.shortCode.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        c.zoneDetail.toLowerCase().includes(q);
      const matchZone = zoneFilter === 'ALL' || c.zone === zoneFilter;
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchText && matchZone && matchStatus;
    });
  }, [components, search, zoneFilter, statusFilter]);

  const handleFileUpload = (file: File, onLoaded: (dataUrl: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onLoaded(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateFromPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const comp: CraneComponent = {
      id: `custom-${Date.now()}`,
      name: newName.trim(),
      shortCode: newShortCode.trim() || 'NUEVO',
      category: newCategory,
      status: 'POR CONFIRMAR',
      availableQty: newAvail,
      usedQty: newUsed,
      zone: newZone,
      zoneDetail: newZoneDetail.trim() || `${newZone} — Ubicación definida por el usuario`,
      role: newRole.trim() || 'Componente añadido mediante fotografía para evaluación.',
      howItWorks: [
        newSentence1.trim() || 'Componente incorporado desde fotografía por el usuario.',
        newSentence2.trim() || 'Pendiente verificar pines, tensión de trabajo y uso en la maqueta.',
      ],
      pins: [],
      wireColorsSummary: newWireColor.trim(),
      dimensionsMm: newDimensions.trim() || 'POR CONFIRMAR (medir con regla)',
      dimensionsStatus: newDimensions.trim().toUpperCase().includes('POR CONFIRMAR') ? 'POR CONFIRMAR' : 'CONFIRMADO',
      datasheetUrl: 'https://www.google.com/search?q=' + encodeURIComponent(newName.trim()),
      datasheetLabel: 'Buscar hoja de datos del componente',
      toConfirm: ['Confirmar pines con voltaje, polaridad, dimensiones reales y si entra en uso o queda en reserva.'],
      imageDataUrl: newPhoto,
      operatingVoltage: newVoltage.trim(),
    };
    onAddComponent(comp);
    setShowNewModal(false);
    setNewName('');
    setNewShortCode('');
    setNewRole('');
    setNewSentence1('');
    setNewSentence2('');
    setNewDimensions('POR CONFIRMAR (medir con regla)');
    setNewPhoto(undefined);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl bg-[#0F172A] border border-slate-800 p-5">
        <div>
          <h2 className="text-xl font-bold text-white">
            Biblioteca de Componentes (Inventario y Fichas Técnicas)
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Cada ficha muestra cantidades disponibles/usadas, zona exacta, rol, funcionamiento en 2
            frases claras, pines con voltaje, color de cable, hoja de datos y qué falta confirmar.
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition shrink-0 whitespace-nowrap"
        >
          <Camera className="w-4 h-4" />
          Nuevo desde foto
        </button>
      </div>

      {/* Conteo automático de Jumpers/Resistencias + Confirmaciones de campo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Cálculo Automático de Jumpers y Resistencias
            </h3>
            <StatusChip status="CONFIRMADO" />
          </div>
          <p className="text-xs text-slate-400">
            Sumatoria automática a partir de las {DEFINITIVE_CONNECTIONS.length} conexiones del mapa definitivo:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
            <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-2.5">
              <div className="text-slate-400">Macho–Macho (M-M)</div>
              <div className="text-lg font-bold font-mono text-sky-300">{jumperSummary.byType['M-M']}</div>
            </div>
            <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-2.5">
              <div className="text-slate-400">Macho–Hembra (M-H)</div>
              <div className="text-lg font-bold font-mono text-emerald-300">{jumperSummary.byType['M-H']}</div>
            </div>
            <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-2.5">
              <div className="text-slate-400">Hembra–Hembra (H-H)</div>
              <div className="text-lg font-bold font-mono text-slate-200">{jumperSummary.byType['H-H']}</div>
            </div>
            <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-2.5">
              <div className="text-slate-400">Bornera (AWG 20–22)</div>
              <div className="text-lg font-bold font-mono text-amber-300">
                {jumperSummary.byType['Cable bornera (AWG 20-22)']}
              </div>
            </div>
          </div>
          <div className="text-xs text-slate-300 bg-[#0B1120] border border-slate-800 rounded-lg px-3 py-2">
            <strong>Resistencias 1 kΩ:</strong> {jumperSummary.resistorsBreakdown}.
          </div>
        </div>

        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-amber-300">
              Verificaciones Físicas Pendientes
            </h3>
            <StatusChip status="POR CONFIRMAR" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <label className="block">
              <span className="text-slate-300">Dirección I2C LCD 1602</span>
              <select
                value={params.lcdI2cAddress}
                onChange={(e) =>
                  onUpdateParams({
                    lcdI2cAddress: e.target.value as UserEditableParams['lcdI2cAddress'],
                  })
                }
                className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
              >
                <option value="POR CONFIRMAR">POR CONFIRMAR</option>
                <option value="0x27">0x27 (Confirmada)</option>
                <option value="0x3F">0x3F (Confirmada)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-slate-300">Buzzers KY-012</span>
              <select
                value={params.buzzerType}
                onChange={(e) =>
                  onUpdateParams({
                    buzzerType: e.target.value as UserEditableParams['buzzerType'],
                  })
                }
                className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
              >
                <option value="POR CONFIRMAR">POR CONFIRMAR</option>
                <option value="ACTIVO">ACTIVO (suena con 5 V DC)</option>
                <option value="PASIVO">PASIVO (requiere tone)</option>
              </select>
            </label>
            <label className="block">
              <span className="text-slate-300">Tensión Kit LED sonido</span>
              <select
                value={params.ledSoundKitVoltage}
                onChange={(e) =>
                  onUpdateParams({
                    ledSoundKitVoltage: e.target.value as UserEditableParams['ledSoundKitVoltage'],
                  })
                }
                className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
              >
                <option value="POR CONFIRMAR">POR CONFIRMAR</option>
                <option value="3.3V (R3)">3,3 V (Riel R3)</option>
                <option value="5V (R2)">5 V (Riel R2)</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <label className="block">
              <span className="text-slate-300">Tensión medida / nominal del bombillo (Z8)</span>
              <input
                type="text"
                value={params.bulbNominalVoltage}
                onChange={(e) => onUpdateParams({ bulbNominalVoltage: e.target.value })}
                className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
              />
            </label>
            <label className="block">
              <span className="text-slate-300 flex items-center justify-between">
                <span>Resistencias 1 kΩ físicas (mín. 13)</span>
                <StatusChip
                  status={
                    params.resistors1kAvailable === null
                      ? 'POR CONFIRMAR'
                      : params.resistors1kAvailable >= 13
                        ? 'CONFIRMADO'
                        : 'POR COMPRAR'
                  }
                />
              </span>
              <input
                type="number"
                min={0}
                placeholder="POR CONFIRMAR (contar kit)"
                value={params.resistors1kAvailable ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : Number(e.target.value);
                  onUpdateParams({ resistors1kAvailable: val });
                  onUpdateComponent('resistencias-1k', {
                    availableQty: val ?? 13,
                    status: val === null ? 'POR CONFIRMAR' : val >= 13 ? 'CONFIRMADO' : 'POR COMPRAR',
                  });
                }}
                className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white font-mono tabular-nums"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#0F172A] border border-slate-800 p-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" aria-hidden="true" />
          <input
            type="text"
            placeholder="Buscar componente por nombre, código o rol..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#0B1120] border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:border-emerald-400 focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Filter className="w-4 h-4 text-slate-400" aria-hidden="true" />
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            aria-label="Filtrar por zona"
            className="bg-[#0B1120] border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
          >
            <option value="ALL">Todas las zonas</option>
            {ZONES_FILTER.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por estado"
            className="bg-[#0B1120] border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
          >
            <option value="ALL">Todos los estados</option>
            <option value="CONFIRMADO">CONFIRMADO</option>
            <option value="POR CONFIRMAR">POR CONFIRMAR</option>
            <option value="POR COMPRAR">POR COMPRAR</option>
            <option value="NO USADO">NO USADO</option>
            <option value="PROPUESTO">PROPUESTO</option>
          </select>
        </div>
      </div>

      {/* Fichas completas (Regla 3) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {filtered.map((comp) => (
          <article
            key={comp.id}
            className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col gap-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="font-mono font-semibold text-sky-300">{comp.shortCode}</span>
                  <span aria-hidden="true">·</span>
                  <span>{comp.category}</span>
                  <span aria-hidden="true">·</span>
                  <StatusChip status={comp.status} />
                </div>
                <h3 className="text-lg font-bold text-white">{comp.name}</h3>
              </div>

              <label className="cursor-pointer shrink-0">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file, (url) =>
                        onUpdateComponent(comp.id, { imageDataUrl: url })
                      );
                    }
                  }}
                />
                {comp.imageDataUrl ? (
                  <img
                    src={comp.imageDataUrl}
                    alt={comp.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-lg object-cover border border-slate-700"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-[#0B1120] border border-dashed border-slate-700 hover:border-emerald-500 flex flex-col items-center justify-center text-[10px] text-slate-400 gap-1 transition">
                    <ImagePlus className="w-4 h-4" />
                    <span>Subir foto</span>
                  </div>
                )}
              </label>
            </div>

            {/* Datos clave Regla 2 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs tabular-nums">
              <div className="rounded-lg bg-[#0B1120] border border-slate-800 px-3 py-2">
                <div className="text-slate-400">Disponible</div>
                <div className="font-bold text-white font-mono">{comp.availableQty} und</div>
              </div>
              <div className="rounded-lg bg-[#0B1120] border border-slate-800 px-3 py-2">
                <div className="text-slate-400">Usada</div>
                <div className="font-bold text-emerald-300 font-mono">{comp.usedQty} und</div>
              </div>
              <div className="rounded-lg bg-[#0B1120] border border-slate-800 px-3 py-2 col-span-2">
                <div className="text-slate-400">Zona física</div>
                <div className="font-medium text-slate-100 truncate" title={comp.zoneDetail}>
                  {comp.zoneDetail}
                </div>
              </div>
              <div className="rounded-lg bg-[#0B1120] border border-slate-800 px-3 py-2 col-span-2 sm:col-span-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-slate-400">Dimensiones reales: </span>
                  <span className="font-mono text-slate-100">{comp.dimensionsMm}</span>
                </div>
                <StatusChip status={comp.dimensionsStatus} />
              </div>
            </div>

            {comp.poolNote && (
              <div className="rounded-lg bg-sky-950/30 border border-sky-500/30 px-3 py-1.5 text-[11px] text-sky-200">
                <strong>Control de lote compartido:</strong> {comp.poolNote}
              </div>
            )}

            <div className="space-y-2 text-xs leading-relaxed">
              <div>
                <span className="text-slate-400 font-semibold">Rol: </span>
                <span className="text-slate-200">{comp.role}</span>
              </div>
              <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3 space-y-1">
                <div className="text-slate-400 font-semibold">Cómo funciona (en palabras sencillas):</div>
                <p className="text-slate-200">1. {comp.howItWorks[0]}</p>
                <p className="text-slate-200">2. {comp.howItWorks[1]}</p>
              </div>
            </div>

            {/* Pines con voltaje */}
            <div className="space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-300">Pines o terminales con voltaje</span>
                <span className="text-slate-400">Color de cable: {comp.wireColorsSummary}</span>
              </div>
              {comp.pins.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-slate-800">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-[#0B1120] text-slate-400 text-[11px]">
                      <tr>
                        <th className="py-1.5 px-2.5">Pin</th>
                        <th className="py-1.5 px-2.5">Voltaje</th>
                        <th className="py-1.5 px-2.5">Conexión</th>
                        <th className="py-1.5 px-2.5">Cable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 text-[11px]">
                      {comp.pins.map((pin, idx) => (
                        <tr key={idx} className="text-slate-200">
                          <td className="py-1.5 px-2.5 font-mono font-semibold text-sky-300">{pin.name}</td>
                          <td className="py-1.5 px-2.5 font-mono">{pin.voltage}</td>
                          <td className="py-1.5 px-2.5">{pin.connectedTo}</td>
                          <td className="py-1.5 px-2.5 text-slate-400">{pin.wireColor}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-slate-400 italic">
                  Sin pines cableados a la caja ({comp.operatingVoltage}).
                </div>
              )}
            </div>

            {comp.toConfirm.length > 0 && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs text-amber-200">
                <strong>Falta confirmar / acción:</strong> {comp.toConfirm.join(' ')}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <span className="text-slate-400">Voltaje: {comp.operatingVoltage}</span>
              <a
                href={comp.datasheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium"
              >
                <span>{comp.datasheetLabel}</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
          </article>
        ))}
      </div>

      {/* Modal Nuevo desde foto */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-xl bg-[#0F172A] border border-slate-700 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Nuevo componente desde foto</h3>
              <button
                onClick={() => setShowNewModal(false)}
                aria-label="Cerrar modal"
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFromPhoto} className="space-y-3 text-xs">
              <label className="block">
                <span className="text-slate-300">Fotografía del componente</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, (url) => setNewPhoto(url));
                  }}
                  className="mt-1 block w-full text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-slate-800 file:text-white"
                />
              </label>
              {newPhoto && (
                <img
                  src={newPhoto}
                  alt="Vista previa"
                  referrerPolicy="no-referrer"
                  className="h-28 rounded-lg object-cover border border-slate-700"
                />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-slate-300">Nombre del componente *</span>
                  <input
                    required
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300">Sigla corta</span>
                  <input
                    type="text"
                    value={newShortCode}
                    onChange={(e) => setNewShortCode(e.target.value)}
                    placeholder="Ej. RELAY-1"
                    className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300">Categoría</span>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ComponentCategory)}
                    className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-slate-300">Zona</span>
                  <select
                    value={newZone}
                    onChange={(e) => setNewZone(e.target.value as ZoneId)}
                    className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white"
                  >
                    {ZONES_FILTER.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-slate-300">Cantidad disponible</span>
                  <input
                    type="number"
                    min={0}
                    value={newAvail}
                    onChange={(e) => setNewAvail(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white tabular-nums"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300">Cantidad usada</span>
                  <input
                    type="number"
                    min={0}
                    value={newUsed}
                    onChange={(e) => setNewUsed(Number(e.target.value))}
                    className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white tabular-nums"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-slate-300">Ubicación exacta en la zona</span>
                <input
                  type="text"
                  value={newZoneDetail}
                  onChange={(e) => setNewZoneDetail(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Rol en la grúa</span>
                <input
                  type="text"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white"
                />
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-slate-300">Cómo funciona (frase 1)</span>
                  <input
                    type="text"
                    value={newSentence1}
                    onChange={(e) => setNewSentence1(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300">Cómo funciona (frase 2)</span>
                  <input
                    type="text"
                    value={newSentence2}
                    onChange={(e) => setNewSentence2(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300">Voltaje de operación</span>
                  <input
                    type="text"
                    value={newVoltage}
                    onChange={(e) => setNewVoltage(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-slate-300">Color de cable</span>
                  <input
                    type="text"
                    value={newWireColor}
                    onChange={(e) => setNewWireColor(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-slate-300">Dimensiones reales (mm)</span>
                  <input
                    type="text"
                    value={newDimensions}
                    onChange={(e) => setNewDimensions(e.target.value)}
                    placeholder="Ej. 35 × 20 × 12 mm"
                    className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-2 text-white"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  <Plus className="w-4 h-4" />
                  Guardar ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
