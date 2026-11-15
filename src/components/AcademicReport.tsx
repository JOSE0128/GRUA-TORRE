import React from 'react';
import { ImagePlus, Printer } from 'lucide-react';
import {
  APA_REFERENCES,
  COMPONENT_DIMENSIONS_TABLE,
  computeJumperSummary,
  CONTROL_BOX_FIT_ITEMS,
  DEFINITIVE_CONNECTIONS,
  HARNESS_CONDUCTORS,
  HEAD_Z3_FIT_ITEMS,
  ZONES,
} from '../data/craneData';
import {
  CraneComponent,
  PinAssignment,
  RealMeasurementRow,
  UserEditableParams,
} from '../types/crane';
import { SCHEMATIC_PLATES, SchematicSvg, WireLegend } from './ElectricalSchematics';

interface AcademicReportProps {
  components: CraneComponent[];
  pinAssignments: PinAssignment[];
  params: UserEditableParams;
  realMeasurements: RealMeasurementRow[];
  onUpdateParams: (next: Partial<UserEditableParams>) => void;
  onUpdateMeasurement: (id: string, patch: Partial<RealMeasurementRow>) => void;
}

export const AcademicReport: React.FC<AcademicReportProps> = ({
  components,
  pinAssignments,
  params,
  realMeasurements,
  onUpdateParams,
  onUpdateMeasurement,
}) => {
  const accent = params.institutionalColorHex || '#006837';
  const jumperSummary = computeJumperSummary(DEFINITIVE_CONNECTIONS);

  const formattedDate = '14 de noviembre de 2026';

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateParams({ universityLogoDataUrl: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  // Cálculos dinámicos Sección 5 y 8
  const vSound = 331.3 + 0.606 * params.ambientTempC;
  const resGiroOptADeg =
    params.slotsGiroN && params.pinionDiameterMm > 0
      ? 360 / (2 * params.slotsGiroN * (params.crownDiameterMm / params.pinionDiameterMm))
      : null;
  const resGiroOptBDeg = params.slotsGiroN ? 360 / (2 * params.slotsGiroN * 10.8) : null;
  const resGiro =
    params.slotsGiroN && params.gearRatioGiroI
      ? `${(360 / (2 * params.slotsGiroN * params.gearRatioGiroI)).toFixed(2)} °/pulso`
      : 'POR CONFIRMAR (N_giro, i)';
  const resCarro =
    params.slotsCarroN && params.drumDiameterCarroCm
      ? `${((Math.PI * params.drumDiameterCarroCm * 10) / (2 * params.slotsCarroN)).toFixed(2)} mm/pulso`
      : 'POR CONFIRMAR (N_carro, D_carro)';
  const resGancho =
    params.slotsGanchoN && params.drumDiameterGanchoCm
      ? `${((Math.PI * params.drumDiameterGanchoCm * 10) / (2 * params.slotsGanchoN)).toFixed(2)} mm/pulso`
      : 'POR CONFIRMAR (N_gancho, D_gancho)';

  const mastFillPct =
    params.mastInnerSideMm > 0
      ? ((Math.PI * Math.pow(params.harnessOuterDiameterMm / 2, 2)) /
          (params.mastInnerSideMm * params.mastInnerSideMm)) *
        100
      : 0;
  const usefulHookCm =
    params.mastHeightCm !== null
      ? params.mastHeightCm - params.hookBlockHeightCm - params.hallMarginCm
      : null;

  const maxMoment =
    params.activeLoads.length > 0
      ? Math.max(...params.activeLoads.map((l) => l.massG * l.rCm))
      : 0;
  const minCp =
    params.counterweightDistDcpCm && maxMoment > 0
      ? `${((1.1 * maxMoment) / params.counterweightDistDcpCm).toFixed(1)} g`
      : 'POR CONFIRMAR (d_cp)';

  const peakCurrent =
    params.estimatedMaxCurrentMotorA * 2 +
    params.estimatedMaxCurrentElectromagnetA +
    params.estimatedMaxCurrentBulbA;

  const figuresList = [
    'Figura 1. Esquema de zonas físicas Z1–Z8 y recorrido de manguera.',
    ...SCHEMATIC_PLATES.map(
      (p, i) => `Figura ${i + 2}. ${p.title.replace(/^Lámina \d+\.\s*/, '')}.`
    ),
    'Figura 10. Diagrama de flujo de la secuencia automática de izaje y descarga.',
  ];

  const tablesList = [
    'Tabla 1. Distribución física por zonas (Z1–Z8).',
    'Tabla 2. Inventario general de piezas y cantidades.',
    'Tabla 3. Mapa definitivo de pines (ESP32 y Arduino UNO).',
    'Tabla 4. Conductores de manguera Tramo A (22 hilos) y Tramo B (9 hilos).',
    'Tabla 5. Cálculos de resolución, contrapeso y presupuesto de corriente.',
    'Tabla 6. Registro de mediciones experimentales reales.',
  ];

  return (
    <div className="space-y-6">
      {/* Barra superior de personalización del informe (no se imprime) */}
      <div className="no-print rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Informe Académico (Estilo LaTeX / A4 · Tema Claro Imprimible)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configura la portada, sube el logo oficial de la Universidad Industrial de Santander,
              ajusta el color verde institucional y registra tus mediciones reales antes de imprimir
              a PDF.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold whitespace-nowrap shrink-0"
          >
            <Printer className="w-4 h-4" />
            Imprimir / Guardar PDF (A4)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <label className="block">
            <span className="text-slate-300">Estudiante</span>
            <input
              type="text"
              value={params.studentName}
              onChange={(e) => onUpdateParams({ studentName: e.target.value })}
              className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-1.5 text-white"
            />
          </label>
          <label className="block">
            <span className="text-slate-300">Asignatura</span>
            <input
              type="text"
              value={params.academicCourse}
              onChange={(e) => onUpdateParams({ academicCourse: e.target.value })}
              className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-1.5 text-white"
            />
          </label>
          <label className="block">
            <span className="text-slate-300">Docente</span>
            <input
              type="text"
              value={params.academicProfessor}
              onChange={(e) => onUpdateParams({ academicProfessor: e.target.value })}
              className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-3 py-1.5 text-white"
            />
          </label>
          <label className="block">
            <span className="text-slate-300">Verde institucional</span>
            <div className="mt-1 flex items-center gap-2">
              <input
                type="color"
                value={accent}
                onChange={(e) => onUpdateParams({ institutionalColorHex: e.target.value })}
                className="h-8 w-12 rounded bg-transparent border border-slate-700 cursor-pointer"
              />
              <span className="font-mono text-slate-300">{accent}</span>
            </div>
          </label>
          <label className="block">
            <span className="text-slate-300">Logo UIS (subir imagen)</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="mt-1 block w-full text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-slate-800 file:text-white"
            />
          </label>
        </div>
      </div>

      {/* DOCUMENTO ACADÉMICO A4 EN TEMA CLARO (SERIF) */}
      <div className="academic-page font-academic bg-white text-slate-900 max-w-[210mm] mx-auto shadow-2xl border border-slate-300 p-8 sm:p-[25mm] space-y-8 leading-relaxed text-[11pt]">
        {/* Encabezado institucional */}
        <div
          className="flex items-center justify-between text-[9pt] text-slate-600 pb-2 border-b"
          style={{ borderColor: accent }}
        >
          <span>Grúa Torre Automatizada — Informe Técnico</span>
          <span>Bucaramanga · {formattedDate}</span>
        </div>

        {/* PORTADA */}
        <section className="min-h-[210mm] flex flex-col justify-between text-center py-8 border-b border-slate-200">
          <div className="space-y-4 flex flex-col items-center">
            {params.universityLogoDataUrl ? (
              <img
                src={params.universityLogoDataUrl}
                alt="Logo Universidad Industrial de Santander"
                referrerPolicy="no-referrer"
                className="max-h-28 object-contain"
              />
            ) : (
              <label className="no-print cursor-pointer border-2 border-dashed border-slate-300 hover:border-slate-500 rounded-lg px-6 py-4 flex flex-col items-center gap-1.5 text-slate-500 text-xs">
                <ImagePlus className="w-5 h-5" />
                <span>Espacio para SUBIR logo de la Universidad Industrial de Santander (UIS)</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </label>
            )}
            <div className="text-sm font-bold uppercase tracking-wide" style={{ color: accent }}>
              Universidad Industrial de Santander
            </div>
            <div className="text-xs text-slate-700 max-w-md">{params.academicProgram}</div>
          </div>

          <div className="space-y-4 my-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-snug">
              Diseño, Integración Electrónica y Estrategia de Control de una Grúa Torre Automatizada
              con Modos Manual y Automático
            </h1>
            <div className="w-24 h-0.5 mx-auto" style={{ backgroundColor: accent }} />
            <p className="text-sm text-slate-600 italic">
              Documentación técnica de arquitectura dual ESP32 + Arduino UNO, instrumentación
              multisensor y cálculo de equilibrio estático
            </p>
          </div>

          <div className="space-y-1.5 text-sm text-slate-800">
            <div>
              <strong>Presentado por:</strong> {params.studentName || 'José'}
            </div>
            <div>
              <strong>Asignatura:</strong> {params.academicCourse}
            </div>
            <div>
              <strong>Docente:</strong> {params.academicProfessor}
            </div>
            <div className="pt-4 text-xs text-slate-600">
              Bucaramanga, Colombia · {formattedDate}
            </div>
          </div>
        </section>

        {/* Tabla de contenido, Lista de figuras y Lista de tablas */}
        <section className="page-break-before space-y-6">
          <div>
            <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
              Tabla de Contenido
            </h2>
            <ol className="mt-3 space-y-1 text-xs text-slate-800">
              <li>Resumen</li>
              <li>1. Introducción</li>
              <li>2. Objetivos (General y Específicos)</li>
              <li>3. Marco Teórico</li>
              <li>4. Metodología</li>
              <li>5. Diseño Mecánico y Distribución de Zonas</li>
              <li>6. Diseño Electrónico y Esquemas</li>
              <li>7. Funcionamiento y Secuencia Automática</li>
              <li>8. Cálculos de Ingeniería</li>
              <li>9. Pruebas y Resultados Experimentales</li>
              <li>10. Seguridad, Riesgos y Protecciones</li>
              <li>11. Conclusiones y Trabajo Futuro</li>
              <li>Referencias (APA 7)</li>
              <li>Anexos (Inventario y Mapa Definitivo de Pines)</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div>
              <h3 className="font-bold pb-1 border-b border-slate-300" style={{ color: accent }}>
                Lista de Figuras
              </h3>
              <ul className="mt-2 space-y-1 text-slate-700">
                {figuresList.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-bold pb-1 border-b border-slate-300" style={{ color: accent }}>
                Lista de Tablas
              </h3>
              <ul className="mt-2 space-y-1 text-slate-700">
                {tablesList.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Resumen */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            Resumen
          </h2>
          <p className="text-justify">
            Este documento presenta el diseño electrónico, la arquitectura de control, la guía de
            integración física y el análisis de cálculos de una maqueta automatizada de grúa torre
            con operación dual. En modo manual, el operador comanda los tres ejes mediante un mando
            Bluetooth conectado al controlador principal ESP32 (lógica de 3,3 V). En modo automático,
            una tablet enlazada por WiFi registra las cargas ubicadas en el plano de trabajo en
            coordenadas cilíndricas (r, θ, z) junto con su masa y orden de recolección, calcula el
            contrapeso mínimo requerido y bloquea el arranque hasta confirmar su instalación. La
            arquitectura separa estrictamente la potencia de 12 V 2 A (motores, electroimán y
            baliza) de la alimentación lógica de 5 V 3 A, utilizando un único nodo de masa común,
            divisores resistivos de 1 kΩ para proteger las entradas del ESP32 y un Arduino UNO con
            shield L293D como etapa auxiliar.
          </p>
        </section>

        {/* 1. Introducción */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            1. Introducción
          </h2>
          <p className="text-justify">
            Las grúas torre constituyen un sistema electromecánico clásico en ingeniería civil e
            industrial para el izaje y posicionamiento tridimensional de cargas pesadas en
            coordenadas polares elevadas. Reproducir su comportamiento a escala didáctica exige
            resolver problemas reales de mecatrónica: transmisión de energía y señales a través de
            una columna giratoria sin anillo colector, fusión de sensores ultrasónicos y encoders
            ópticos, aislamiento eléctrico entre actuadores inductivos y microcontroladores de 3,3 V,
            y prevención de volcamiento mediante cálculo previo de momento estático.
          </p>
        </section>

        {/* 2. Objetivos */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            2. Objetivos
          </h2>
          <p>
            <strong>Objetivo general:</strong> Diseñar, integrar y validar el sistema electrónico,
            sensorial y electromecánico de una grúa torre automatizada a escala capaz de operar en
            modo manual (Bluetooth) y modo automático secuencial (WiFi), garantizando seguridad
            eléctrica y equilibrio mecánico.
          </p>
          <div>
            <strong>Objetivos específicos:</strong>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>
                Implementar una arquitectura distribuida de control con ESP32 (3,3 V) y Arduino UNO +
                Shield L293D (5 V) con separación estricta de rieles de alimentación y masa común única.
              </li>
              <li>
                Acondicionar las señales de sensores de 5 V hacia el ESP32 mediante divisores de
                tensión de 1 kΩ (3,33 V nominales) y enrutar 22 hilos internos por el mástil con un
                rizo flexible de 0° a 360°.
              </li>
              <li>
                Instrumentar los tres ejes (r, θ, z) mediante sensores ultrasónicos HC-SR04 alternados,
                tres lectores ópticos FC-33, sensor Hall KY-003 y pulsador HOME.
              </li>
              <li>
                Establecer un protocolo experimental de pruebas paso a paso y registro metrológico sin
                alterar ni inventar mediciones reales.
              </li>
            </ul>
          </div>
        </section>

        {/* 3. Marco Teórico */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            3. Marco Teórico
          </h2>
          <p className="text-justify">
            <strong>3.1 Ultrasonido por tiempo de vuelo:</strong> El módulo HC-SR04 emite ocho
            pulsos a 40 kHz tras un disparo de 10 µs en TRIG y entrega en ECHO un pulso proporcional
            al viaje de ida y vuelta: <em>d = v · t / 2</em>, donde{' '}
            <em>v = 331,3 + 0,606 · T</em> (m/s). Para evitar interferencias acústicas mutuas entre
            US-H y US-V, los disparos se alternan cada ≥ 60 ms aplicando la mediana de 5 lecturas.
          </p>
          <p className="text-justify">
            <strong>3.2 Encoder óptico ranurado (FC-33 / LM393):</strong> Un haz infrarrojo
            interrumpido por un disco de <em>N</em> ranuras genera <em>2·N</em> flancos por vuelta.
            Para el giro con relación <em>i</em>, la resolución angular es{' '}
            <em>Δθ = 360° / (2·N·i)</em>; para tambores de diámetro <em>D</em> (carro y cabrestante),
            la resolución lineal es <em>Δs = π·D / (2·N)</em>.
          </p>
          <p className="text-justify">
            <strong>3.3 Puente H y modulación PWM:</strong> Los puentes H L298N y L293D invierten la
            polaridad sobre la carga mediante cuatro interruptores y regulan la tensión efectiva
            modulando el ciclo útil (PWM). Para el bombillo en M3 (PWM ≈ 40 %) se busca 4–5 V
            efectivos; para el electroimán en M2 se emplea un pulso inverso ≤ 80 ms al liberar para
            vencer la histéresis magnética residual.
          </p>
          <p className="text-justify">
            <strong>3.4 Divisor de tensión resistivo:</strong> Con tres resistencias iguales de 1 kΩ
            (1 kΩ arriba, 2 kΩ a tierra), toda señal de 5 V se atenúa a{' '}
            <em>V_out = 5 × 2 / (1 + 2) = 3,33 V</em>, compatible con los pines de 3,3 V del ESP32.
          </p>
          <p className="text-justify">
            <strong>3.5 Equilibrio de momentos y coordenadas cilíndricas:</strong> La posición de cada
            carga se expresa en coordenadas cilíndricas <em>(r, θ, z)</em> respecto al eje del
            mástil. El momento volcador máximo producido por la carga crítica exige un contrapeso
            mínimo <em>m_cp = 1,1 × máx(mᵢ · rᵢ) / d_cp</em> con factor de seguridad del 10 %.
          </p>
        </section>

        {/* 4. Metodología */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            4. Metodología
          </h2>
          <p className="text-justify">
            El desarrollo sigue una metodología incremental en cinco fases: (a) diseño mecánico
            modular por zonas Z1–Z8 separando la caja de control de la contrapluma; (b) diseño
            eléctrico con aislamiento de rieles R1/R2/R3 y validación previa de divisores; (c)
            estrategia de control dual manual/automática (código marcado <em>POR DEFINIR</em>); (d)
            calibración física de <em>r₀</em>, offset vertical <em>e = 3,5 cm</em>, discos ranurados{' '}
            <em>N</em> y tambores <em>D</em>; y (e) plan de pruebas progresivo desde potencia en vacío
            (Etapa E1) hasta izaje con carga real y contrapeso verificado (Etapa E12).
          </p>
        </section>

        {/* 5. Diseño Mecánico */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            5. Diseño Mecánico
          </h2>
          <p className="text-justify">
            La maqueta se divide en ocho zonas físicas (Z1 a Z8). El giro está limitado
            mecánicamente entre 0° (pulsador HOME) y 360° mediante topes físicos, permitiendo llevar
            22 conductores por el interior del mástil hueco (Tramo A) hasta un rizo superior de
            ≥ 1,5 vueltas (Ø 6–8 cm, reserva ≥ 40 cm + 15 cm por extremo) y derivar 9 conductores
            mediante una bornera en Z3 hacia el carro Z5 y el gancho Z6 (Tramo B).
          </p>

          <figure className="avoid-break space-y-1.5">
            <div className="border border-slate-300 rounded p-2">
              <SchematicSvg plateId={8} lightTheme />
            </div>
            <figcaption className="text-center text-xs text-slate-600">
              <strong>Figura 1.</strong> Distribución de manguera (Tramo A y Tramo B) y rizo de giro
              entre zonas Z1, Z2, Z3, Z5, Z6 y Z8.
            </figcaption>
          </figure>

          <div className="avoid-break">
            <div className="text-xs font-bold mb-1">
              Tabla 1. Distribución física por zonas (Z1–Z8)
            </div>
            <table className="w-full text-[9.5pt] border-collapse border-y border-slate-700">
              <thead>
                <tr className="border-b border-slate-400 text-left">
                  <th className="py-1.5 pr-3">Zona</th>
                  <th className="py-1.5 pr-3">Descripción</th>
                  <th className="py-1.5">Componentes alojados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {ZONES.map((z) => (
                  <tr key={z.id}>
                    <td className="py-1.5 pr-3 font-semibold whitespace-nowrap">{z.name}</td>
                    <td className="py-1.5 pr-3">{z.description}</td>
                    <td className="py-1.5">{z.componentsSummary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="avoid-break">
            <div className="text-xs font-bold mb-1">
              Tabla 2. Dimensiones reales verificadas y cabida en Caja Z1 ({params.controlBoxLengthCm}×{params.controlBoxWidthCm}×{params.controlBoxHeightCm} cm) y Cabeza Z3 ({params.headWidthMm}×{params.headDepthMm} mm)
            </div>
            <table className="w-full text-[9pt] border-collapse border-y border-slate-700 tabular-nums mb-4">
              <thead>
                <tr className="border-b border-slate-400 text-left">
                  <th className="py-1.5 pr-2">Componente</th>
                  <th className="py-1.5 pr-2">Dimensiones reales</th>
                  <th className="py-1.5 pr-2 text-right">Cant.</th>
                  <th className="py-1.5">Ubicación física</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {COMPONENT_DIMENSIONS_TABLE.map((row, idx) => (
                  <tr key={idx}>
                    <td className="py-1 pr-2">{row.component}</td>
                    <td className="py-1 pr-2 font-mono">{row.dimensions}</td>
                    <td className="py-1 pr-2 text-right font-mono">{row.qty}</td>
                    <td className="py-1">{row.mountLocation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-slate-700 text-justify mb-3">
              <strong>Espacio de montaje (medidas del usuario):</strong> En la caja de control Z1 ({params.controlBoxLengthCm * params.controlBoxWidthCm * 100} mm² de base interior), los {CONTROL_BOX_FIT_ITEMS.filter((i) => i.zone === 'Base interior Z1').length} grupos de tarjetas ocupan ≈ {CONTROL_BOX_FIT_ITEMS.filter((i) => i.zone === 'Base interior Z1').reduce((a, b) => a + b.areaMm2, 0)} mm². En la cabeza giratoria Z3 ({params.headWidthMm * params.headDepthMm} mm²), los {HEAD_Z3_FIT_ITEMS.length} subconjuntos suman {HEAD_Z3_FIT_ITEMS.reduce((a, b) => a + b.areaMm2, 0)} mm². En el mástil hueco ({params.mastInnerSideMm}×{params.mastInnerSideMm} mm), el haz de Ø {params.harnessOuterDiameterMm} mm ocupa {mastFillPct.toFixed(1)} %. Los discos FC-33 cuentan con N_giro = {params.slotsGiroN ?? 'POR CONFIRMAR'}, N_carro = {params.slotsCarroN ?? 'POR CONFIRMAR'} y N_gancho = {params.slotsGanchoN ?? 'POR CONFIRMAR'} ranuras.
            </p>
            <div className="text-xs font-bold mb-1">
              Inventario general del sistema ({jumperSummary.totalDupontJumpers} jumpers + {jumperSummary.resistors1kCount} resistencias de 1 kΩ)
            </div>
            <table className="w-full text-[9pt] border-collapse border-y border-slate-700 tabular-nums">
              <thead>
                <tr className="border-b border-slate-400 text-left">
                  <th className="py-1.5 pr-2">Componente</th>
                  <th className="py-1.5 pr-2 text-right">Disp.</th>
                  <th className="py-1.5 pr-2 text-right">Usado</th>
                  <th className="py-1.5 pr-2">Zona</th>
                  <th className="py-1.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {components.map((c) => (
                  <tr key={c.id}>
                    <td className="py-1 pr-2">{c.name}</td>
                    <td className="py-1 pr-2 text-right font-mono">{c.availableQty}</td>
                    <td className="py-1 pr-2 text-right font-mono">{c.usedQty}</td>
                    <td className="py-1 pr-2 font-mono">{c.zone}</td>
                    <td className="py-1 font-mono text-[8.5pt]">{c.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 6. Diseño Electrónico (las 8 láminas + tabla de pines + protecciones) */}
        <section className="space-y-6">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            6. Diseño Electrónico
          </h2>
          <WireLegend light />

          {SCHEMATIC_PLATES.map((plate, idx) => (
            <div key={idx} className="avoid-break space-y-2 border-b border-slate-200 pb-4">
              <h3 className="text-sm font-bold text-slate-900">{plate.title}</h3>
              <figure className="space-y-1">
                <div className="border border-slate-300 rounded p-1.5">
                  <SchematicSvg plateId={idx + 1} lightTheme />
                </div>
                <figcaption className="text-center text-xs text-slate-600">
                  <strong>Figura {idx + 2}.</strong> {plate.title}.
                </figcaption>
              </figure>
              <p className="text-xs text-slate-800 text-justify">
                <strong>Descripción:</strong> {plate.description}
              </p>
              <p className="text-xs text-slate-800 text-justify">
                <strong>Funcionamiento:</strong> {plate.operation}
              </p>
            </div>
          ))}

          <div className="avoid-break">
            <div className="text-xs font-bold mb-1">
              Tabla 3. Mapa definitivo de pines asignados (ESP32 y Arduino UNO)
            </div>
            <table className="w-full text-[9pt] border-collapse border-y border-slate-700 tabular-nums">
              <thead>
                <tr className="border-b border-slate-400 text-left">
                  <th className="py-1.5 pr-2">Controlador</th>
                  <th className="py-1.5 pr-2">Pin</th>
                  <th className="py-1.5 pr-2">Componente / Señal</th>
                  <th className="py-1.5 pr-2">Divisor</th>
                  <th className="py-1.5">Observación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pinAssignments.map((pa) => (
                  <tr key={pa.id}>
                    <td className="py-1 pr-2 font-mono">{pa.controller}</td>
                    <td className="py-1 pr-2 font-mono font-bold">{pa.pin}</td>
                    <td className="py-1 pr-2">{pa.componentLabel}</td>
                    <td className="py-1 pr-2">{pa.usesDivider ? 'Sí (3×1 kΩ)' : 'No'}</td>
                    <td className="py-1">{pa.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. Funcionamiento */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            7. Funcionamiento y Secuencia Automática
          </h2>
          <p className="text-justify">
            El ciclo automático consta de ocho pasos secuenciales: (1) confirmación obligatoria del
            contrapeso en la tablet (bloqueo si no está instalado); (2) encendido del bombillo (M3) y
            buzzer 1; (3) giro a θᵢ y desplazamiento del carro a rᵢ; (4) descenso hasta Δh ≤ 1 cm a
            velocidad reducida (Potenciómetro 2); (5) activación del electroimán durante 5 s; (6)
            verificación de agarre subiendo 2 cm mientras US-V comprueba d_V ≈ 3,5 cm; (7) ascenso
            hasta el sensor Hall y traslado a bodega Z7; y (8) descenso controlado por el encoder
            del gancho hasta &lt; 1 cm del piso, espera de 5 s y liberación con pulso inverso
            ≤ 80 ms. Las interfaces locales (LCD 1602, OLED A de 3 pestañas y OLED B de 2 pestañas)
            reportan el estado en tiempo real. El firmware y protocolo UART/WebSocket permanecen{' '}
            <strong>POR DEFINIR</strong>.
          </p>
        </section>

        {/* 8. Cálculos */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            8. Cálculos de Ingeniería
          </h2>
          <div className="avoid-break">
            <div className="text-xs font-bold mb-1">
              Tabla 5. Fórmulas aplicadas y valores actuales del proyecto
            </div>
            <table className="w-full text-[9.5pt] border-collapse border-y border-slate-700 tabular-nums">
              <thead>
                <tr className="border-b border-slate-400 text-left">
                  <th className="py-1.5 pr-3">Parámetro</th>
                  <th className="py-1.5 pr-3">Fórmula</th>
                  <th className="py-1.5">Valor calculado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-1.5 pr-3">Velocidad del sonido (T = {params.ambientTempC} °C)</td>
                  <td className="py-1.5 pr-3 font-mono">v = 331,3 + 0,606 · T</td>
                  <td className="py-1.5 font-mono">{vSound.toFixed(1)} m/s</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">Resolución de giro activa ({params.gearOptionGiro === 'A_PINON_CORONA' ? 'Opción A' : 'Opción B'})</td>
                  <td className="py-1.5 pr-3 font-mono">Δθ = 360 ÷ (2·N·i)</td>
                  <td className="py-1.5 font-mono">
                    {resGiro} (Op. A: {resGiroOptADeg?.toFixed(2) ?? '—'}° gruesa · Op. B: {resGiroOptBDeg?.toFixed(2) ?? '—'}° recom.)
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">Resolución lineal del carro</td>
                  <td className="py-1.5 pr-3 font-mono">Δr = π·D_carro ÷ (2·N)</td>
                  <td className="py-1.5 font-mono">{resCarro}</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">Resolución lineal del gancho</td>
                  <td className="py-1.5 pr-3 font-mono">Δz = π·D_gancho ÷ (2·N)</td>
                  <td className="py-1.5 font-mono">{resGancho}</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">Contrapeso mínimo requerido</td>
                  <td className="py-1.5 pr-3 font-mono">m_cp = 1,1 × máx(mᵢ·rᵢ) ÷ d_cp</td>
                  <td className="py-1.5 font-mono">{minCp}</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">Altura útil del gancho y bodega Z7</td>
                  <td className="py-1.5 pr-3 font-mono">H_mástil − H_bloque − margen Hall</td>
                  <td className="py-1.5 font-mono">
                    {usefulHookCm !== null ? `${usefulHookCm} cm` : 'POR CONFIRMAR'} · Bodega r = {params.warehouseRadiusCm} cm
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">Ocupación de manguera en mástil hueco</td>
                  <td className="py-1.5 pr-3 font-mono">A_haz ÷ A_interior</td>
                  <td className="py-1.5 font-mono">{mastFillPct.toFixed(1)} %</td>
                </tr>
                <tr>
                  <td className="py-1.5 pr-3">Corriente pico 12 V (máx. 2 motores)</td>
                  <td className="py-1.5 pr-3 font-mono">2·I_motor + I_imán + I_bombillo</td>
                  <td className="py-1.5 font-mono">{peakCurrent.toFixed(2)} A (límite 2,00 A)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 9. Pruebas y resultados (espacio real para mediciones, sin inventar resultados) */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            9. Pruebas y Resultados Experimentales
          </h2>
          <p className="text-xs text-slate-700">
            La Tabla 6 recoge los valores experimentales medidos directamente en el montaje real.
            Las celdas vacías esperan las lecturas tomadas con multímetro y regla durante las etapas
            E1 a E12 (no se incluyen datos simulados ni inventados).
          </p>
          <div className="avoid-break">
            <div className="text-xs font-bold mb-1">
              Tabla 6. Mediciones reales de verificación eléctrica y metrológica
            </div>
            <table className="w-full text-[9pt] border-collapse border-y border-slate-700 tabular-nums">
              <thead>
                <tr className="border-b border-slate-400 text-left">
                  <th className="py-1.5 pr-2">Magnitud</th>
                  <th className="py-1.5 pr-2">Instrumento</th>
                  <th className="py-1.5 pr-2">Rango esperado</th>
                  <th className="py-1.5 pr-2">Valor medido real</th>
                  <th className="py-1.5">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {realMeasurements.map((m) => (
                  <tr key={m.id}>
                    <td className="py-1.5 pr-2">{m.magnitude}</td>
                    <td className="py-1.5 pr-2">{m.instrument}</td>
                    <td className="py-1.5 pr-2 font-mono">{m.expectedRange}</td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        placeholder="Por medir"
                        value={m.measuredValue}
                        onChange={(e) =>
                          onUpdateMeasurement(m.id, { measuredValue: e.target.value })
                        }
                        className="w-28 border-b border-slate-300 bg-transparent px-1 py-0.5 font-mono text-slate-900 focus:outline-none focus:border-slate-700"
                      />
                    </td>
                    <td className="py-1.5">
                      <input
                        type="text"
                        placeholder="Notas..."
                        value={m.observations}
                        onChange={(e) =>
                          onUpdateMeasurement(m.id, { observations: e.target.value })
                        }
                        className="w-full border-b border-slate-300 bg-transparent px-1 py-0.5 text-slate-900 focus:outline-none focus:border-slate-700"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* 10. Seguridad y riesgos */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            10. Seguridad y Riesgos
          </h2>
          <ul className="list-disc list-inside space-y-1 text-justify">
            <li>
              <strong>Paro físico vs. paro por software:</strong> El interruptor general en serie con
              la línea de 12 V garantiza el corte físico inmediato de actuadores; el pulsador PARO en
              D12 implementa parada por software sin resistencia externa.
            </li>
            <li>
              <strong>Aislamiento USB / 5 V:</strong> Está prohibido energizar el riel R2 y conectar
              el USB de programación simultáneamente; los cables hacia VIN y 5V deben retirarse
              antes de flashear código.
            </li>
            <li>
              <strong>Protección de pines de 3,3 V y arranque:</strong> Cuatro divisores resistivos
              impiden sobrevoltaje en D23, D18, D2 y D33; D2 incorpora jumper desmontable y D12
              prohíbe pull-up externa.
            </li>
            <li>
              <strong>Límite mecánico de giro y corriente:</strong> Topes físicos en 0° y 360°
              protegen la manguera de 22 hilos y regla estricta de máximo 2 motores simultáneos
              protege la fuente de 12 V 2 A.
            </li>
          </ul>
        </section>

        {/* 11. Conclusiones */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            11. Conclusiones y Trabajo Futuro
          </h2>
          <p className="text-justify">
            La separación física de la caja de control en Z1, el uso de fuentes independientes de
            12 V y 5 V con masa común única y la protección mediante divisores resistivos de 1 kΩ
            consolidan una plataforma reproducible, segura y didáctica. Como trabajo futuro se
            proyecta la definición e implementación del protocolo UART ESP32↔UNO, la interfaz
            WebSocket en tiempo real para la tablet y la validación experimental completa de la
            Tabla 6 en laboratorio.
          </p>
        </section>

        {/* Referencias APA 7 */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            Referencias (APA 7.ª edición)
          </h2>
          <ul className="space-y-2 text-[9.5pt] text-slate-800 pl-6 -indent-6">
            {APA_REFERENCES.map((ref) => (
              <li key={ref.id}>{ref.citation}</li>
            ))}
          </ul>
        </section>

        {/* Anexos */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold pb-1 border-b" style={{ color: accent, borderColor: accent }}>
            Anexos
          </h2>
          <div className="text-xs font-bold">
            Tabla 4. Lista completa de conductores de manguera (Tramo A: 22 hilos · Tramo B: 9 hilos)
          </div>
          <table className="w-full text-[8.5pt] border-collapse border-y border-slate-700 tabular-nums">
            <thead>
              <tr className="border-b border-slate-400 text-left">
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">Tramo</th>
                <th className="py-1 pr-2">Etiqueta</th>
                <th className="py-1 pr-2">Color</th>
                <th className="py-1 pr-2">Origen</th>
                <th className="py-1">Destino</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {HARNESS_CONDUCTORS.map((hc) => (
                <tr key={hc.index}>
                  <td className="py-1 pr-2 font-mono">{hc.index}</td>
                  <td className="py-1 pr-2">{hc.tramo}</td>
                  <td className="py-1 pr-2 font-mono font-semibold">{hc.shortLabel}</td>
                  <td className="py-1 pr-2">{hc.color}</td>
                  <td className="py-1 pr-2">{hc.origin}</td>
                  <td className="py-1">{hc.destination}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};
