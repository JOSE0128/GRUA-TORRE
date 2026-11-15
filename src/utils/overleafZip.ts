import {
  APA_REFERENCES,
  COMPONENT_DIMENSIONS_TABLE,
  CONTROL_BOX_FIT_ITEMS,
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

// --- Pure TypeScript ZIP Builder (CRC32 + STORE, sin dependencias externas) ---

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

export interface ZipEntryInput {
  path: string;
  data: Uint8Array | string;
}

export function buildZipBlob(entries: ZipEntryInput[]): Blob {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const dataBytes = typeof entry.data === 'string' ? encoder.encode(entry.data) : entry.data;
    const crc = crc32(dataBytes);
    const size = dataBytes.length;

    // Local file header (30 bytes + filename)
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true); // Local file header signature
    lv.setUint16(4, 20, true); // Version needed to extract (2.0)
    lv.setUint16(6, 0x0800, true); // UTF-8 filename flag
    lv.setUint16(8, 0, true); // Compression method 0 (STORE)
    lv.setUint16(10, 0, true); // Mod time
    lv.setUint16(12, 0x5421, true); // Mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, dataBytes);

    // Central directory header (46 bytes + filename)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true); // Central file header signature
    cv.setUint16(4, 20, true); // Version made by
    cv.setUint16(6, 20, true); // Version needed
    cv.setUint16(8, 0x0800, true); // UTF-8 flag
    cv.setUint16(10, 0, true); // Compression method 0 (STORE)
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true); // Offset of local header
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralDirSize = centralParts.reduce((acc, part) => acc + part.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // End of central directory signature
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralDirSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const blobParts: BlobPart[] = [...localParts, ...centralParts, eocd].map(
    (u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
  );
  return new Blob(blobParts, { type: 'application/zip' });
}

// --- Conversor SVG -> PNG para Overleaf (con respaldo SVG si falla el canvas) ---

export async function rasterizeSvgToPng(
  svgEl: SVGSVGElement,
  targetWidth = 1400
): Promise<{ ext: 'png' | 'svg'; data: Uint8Array }> {
  const serializer = new XMLSerializer();
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }
  const viewBox = clone.getAttribute('viewBox') || '0 0 880 420';
  const vbParts = viewBox.split(/[\s,]+/).map(Number);
  const vbW = vbParts[2] || 880;
  const vbH = vbParts[3] || 420;
  const targetHeight = Math.round((vbH / vbW) * targetWidth);
  clone.setAttribute('width', String(targetWidth));
  clone.setAttribute('height', String(targetHeight));

  const svgText = serializer.serializeToString(clone);
  const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = svgUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No 2D context');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    const pngBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/png')
    );
    if (!pngBlob) throw new Error('PNG export returned null');
    const buf = await pngBlob.arrayBuffer();
    return { ext: 'png', data: new Uint8Array(buf) };
  } catch {
    return { ext: 'svg', data: new TextEncoder().encode(svgText) };
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

// --- Generación del proyecto LaTeX completo (Overleaf) ---

function escapeTex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/Ω/g, '\\ensuremath{\\Omega}')
    .replace(/µ/g, '\\ensuremath{\\mu}')
    .replace(/°/g, '\\ensuremath{^\\circ}')
    .replace(/Δ/g, '\\ensuremath{\\Delta}')
    .replace(/θ/g, '\\ensuremath{\\theta}')
    .replace(/π/g, '\\ensuremath{\\pi}')
    .replace(/≤/g, '\\ensuremath{\\le}')
    .replace(/≥/g, '\\ensuremath{\\ge}')
    .replace(/×/g, '\\ensuremath{\\times}')
    .replace(/÷/g, '\\ensuremath{\\div}')
    .replace(/≈/g, '\\ensuremath{\\approx}')
    .replace(/↔/g, '\\ensuremath{\\leftrightarrow}')
    .replace(/→/g, '\\ensuremath{\\rightarrow}')
    .replace(/<-/g, '\\ensuremath{\\leftarrow}');
}

export interface OverleafFigurePayload {
  filename: string;
  ext: 'png' | 'svg';
  data: Uint8Array;
  caption: string;
}

export function generateOverleafZip(args: {
  components: CraneComponent[];
  pinAssignments: PinAssignment[];
  params: UserEditableParams;
  realMeasurements: RealMeasurementRow[];
  figures: OverleafFigurePayload[];
}): Blob {
  const { components, pinAssignments, params, realMeasurements, figures } = args;
  const accentHex = (params.institutionalColorHex || '#006837').replace('#', '').toUpperCase();

  const vSound = (331.3 + 0.606 * params.ambientTempC).toFixed(1);
  const resGiroA =
    params.slotsGiroN && params.crownDiameterMm && params.pinionDiameterMm
      ? `${(
          360 /
          (2 * params.slotsGiroN * (params.crownDiameterMm / params.pinionDiameterMm))
        ).toFixed(2)}^\\circ/\\text{pulso}`
      : 'POR CONFIRMAR';
  const resGiroB =
    params.slotsGiroN && params.gearRatioGiroI
      ? `${(360 / (2 * params.slotsGiroN * params.gearRatioGiroI)).toFixed(2)}^\\circ/\\text{pulso}`
      : 'POR CONFIRMAR';
  const resCarro =
    params.slotsCarroN && params.drumDiameterCarroCm
      ? ((Math.PI * params.drumDiameterCarroCm * 10) / (2 * params.slotsCarroN)).toFixed(2)
      : 'POR CONFIRMAR';
  const resGancho =
    params.slotsGanchoN && params.drumDiameterGanchoCm
      ? ((Math.PI * params.drumDiameterGanchoCm * 10) / (2 * params.slotsGanchoN)).toFixed(2)
      : 'POR CONFIRMAR';
  const maxMoment =
    params.activeLoads.length > 0
      ? Math.max(...params.activeLoads.map((l) => l.massG * l.rCm))
      : null;
  const dCp = params.counterweightDistDcpCm;
  const minCp =
    maxMoment !== null && dCp && dCp > 0
      ? `${((1.1 * maxMoment) / dCp).toFixed(1)}~g`
      : 'POR CONFIRMAR';
  const fillRatio = (
    ((Math.PI * Math.pow(params.harnessOuterDiameterMm / 2, 2)) /
      (params.mastInnerSideMm * params.mastInnerSideMm)) *
    100
  ).toFixed(1);
  const usefulHook =
    params.mastHeightCm !== null
      ? params.mastHeightCm - params.hookBlockHeightCm - params.hallMarginCm
      : null;

  const mainTex = `\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[spanish,es-tabla]{babel}
\\usepackage[margin=2.5cm]{geometry}
\\usepackage{graphicx}
\\usepackage{xcolor}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{amsmath}
\\usepackage{hyperref}
\\usepackage{fancyhdr}

\\definecolor{institucional}{HTML}{${accentHex}}
\\hypersetup{colorlinks=true, linkcolor=institucional, urlcolor=institucional}

\\pagestyle{fancy}
\\fancyhf{}
\\lhead{\\small Grúa Torre Automatizada}
\\rhead{\\small Bucaramanga, 14 de noviembre de 2026}
\\cfoot{\\small Página \\thepage}

\\begin{document}

\\begin{titlepage}
\\centering
\\vspace*{1cm}
{\\color{institucional}\\Large\\textbf{UNIVERSIDAD INDUSTRIAL DE SANTANDER}}\\\\[0.3cm]
{\\small ${escapeTex(params.academicProgram)}}\\\\[1.5cm]
{\\footnotesize [Espacio reservado para insertar logo oficial UIS: \\texttt{figuras/logo\\_uis.png}]}\\\\[2cm]
{\\LARGE\\textbf{Diseño, Integración Electrónica y Estrategia de Control de una Grúa Torre Automatizada con Modos Manual y Automático}}\\\\[0.8cm]
{\\color{institucional}\\rule{6cm}{1.2pt}}\\\\[1.5cm]
\\textbf{Presentado por:} ${escapeTex(params.studentName || 'José')}\\\\[0.3cm]
\\textbf{Asignatura:} ${escapeTex(params.academicCourse)}\\\\[0.3cm]
\\textbf{Docente:} ${escapeTex(params.academicProfessor)}\\\\[2cm]
\\vfill
Bucaramanga, Colombia\\\\
14 de noviembre de 2026
\\end{titlepage}

\\tableofcontents
\\listoffigures
\\listoftables
\\newpage

\\input{secciones/00_resumen}
\\input{secciones/01_introduccion}
\\input{secciones/02_objetivos}
\\input{secciones/03_marco_teorico}
\\input{secciones/04_metodologia}
\\input{secciones/05_diseno_mecanico}
\\input{secciones/06_diseno_electronico}
\\input{secciones/07_funcionamiento}
\\input{secciones/08_calculos}
\\input{secciones/09_pruebas}
\\input{secciones/10_seguridad}
\\input{secciones/11_conclusiones}
\\input{secciones/12_anexos}

\\section*{Referencias (APA 7.ª edición)}
\\addcontentsline{toc}{section}{Referencias}
\\begin{itemize}
${APA_REFERENCES.map((r) => `  \\item ${escapeTex(r.citation)}`).join('\n')}
\\end{itemize}

\\end{document}
`;

  const sec00 = `\\section*{Resumen}
\\addcontentsline{toc}{section}{Resumen}
Este documento consolida el diseño mecánico, eléctrico y de control de una grúa torre automatizada a escala con modo Manual (mando Bluetooth) y modo Automático (tablet WiFi en coordenadas cilíndricas $(r, \\theta, z)$). La electrónica se aloja íntegramente en una caja de control separada (Z1: ${params.controlBoxLengthCm}\\,${'\\ensuremath{\\times}'}\\,${params.controlBoxWidthCm}\\,${'\\ensuremath{\\times}'}\\,${params.controlBoxHeightCm}~cm), separando la línea de potencia de 12~V~2~A de la lógica de 5~V~3~A mediante un único punto de masa común (riel R1), cuatro divisores resistivos de 1~k$\\Omega$ hacia el ESP32 y un Arduino UNO con shield L293D.
`;

  const sec01 = `\\section{Introducción}
La automatización de una grúa torre a escala integra control de potencia DC, sensórica ultrasónica y óptica, y cálculo de equilibrio estático. Al limitar el giro entre 0$^\\circ$ y 360$^\\circ$ mediante topes físicos, la manguera de 22 conductores asciende por el interior del mástil hueco con un rizo flexible sin requerir anillo colector.
`;

  const sec02 = `\\section{Objetivos}
\\textbf{Objetivo general:} Diseñar, integrar y validar el sistema electrónico, sensorial y mecánico de una grúa torre automatizada con operación dual manual y automática.

\\textbf{Objetivos específicos:}
\\begin{itemize}
  \\item Separar estrictamente los dominios de 12~V (potencia, máx. 2 motores a la vez), 5~V (lógica) y 3,3~V (ESP32) con masa común única en R1.
  \\item Documentar la distribución física por zonas Z1--Z8, los parámetros de resolución ($N, D, i$) definidos por el constructor y el enrutamiento de la manguera pasante.
  \\item Definir las 8 etapas de operación automática y documentar las pruebas experimentales reales sin inventar mediciones.
\\end{itemize}
`;

  const sec03 = `\\section{Marco Teórico}
\\subsection{Ultrasonido por tiempo de vuelo}
Los módulos HC-SR04 (US-H y US-V) se disparan de forma alternada cada $\\ge 60$~ms tomando la mediana de 5 lecturas. La velocidad del sonido a $T = ${params.ambientTempC}^\\circ\\text{C}$ es $v = 331{,}3 + 0{,}606\\,T = ${vSound}$~m/s.

\\subsection{Encoders ópticos FC-33}
Un disco de $N$ ranuras genera $2N$ flancos por vuelta. Para tambores de diámetro $D$, la resolución lineal es $\\Delta s = \\pi D / (2N)$; para el giro con relación $i$, $\\Delta\\theta = 360^\\circ / (2Ni)$.

\\subsection{Divisores resistivos y equilibrio estático}
Cada señal de 5~V hacia el ESP32 usa 3 resistencias de 1~k$\\Omega$ ($V_{\\text{out}} = 5 \\times 2 / 3 = 3{,}33$~V). El contrapeso mínimo cumple $m_{\\text{cp}} = 1{,}1 \\times \\max(m_i r_i) / d_{\\text{cp}}$.
`;

  const sec04 = `\\section{Metodología}
El proyecto se ejecuta en fases secuenciales: verificación física y dimensiones reales, enrutamiento de manguera Tramo A/B, armado progresivo por etapas E0 a E12 en protoboards P1 y P2, validación de 0 errores y registro experimental de laboratorio. El protocolo UART ESP32$\\leftrightarrow$UNO, las tramas WebSocket y el firmware permanecen marcados como \\textbf{POR DEFINIR}.
`;

  const sec05 = `\\section{Diseño Mecánico y Distribución por Zonas}
\\subsection{Zonas físicas Z1–Z8}
\\begin{longtable}{p{3.5cm} p{4.8cm} p{6.2cm}}
\\toprule
\\textbf{Zona} & \\textbf{Descripción} & \\textbf{Componentes} \\\\
\\midrule
${ZONES.map((z) => `${escapeTex(z.name)} & ${escapeTex(z.description)} & ${escapeTex(z.componentsSummary)} \\\\`).join('\n')}
\\bottomrule
\\caption{Distribución física por zonas (Z1--Z8).}
\\end{longtable}

\\subsection{Verificación de medidas reales y cabida física}
\\begin{table}[h!]
\\centering
\\small
\\begin{tabular}{llcl}
\\toprule
\\textbf{Componente} & \\textbf{Dimensiones reales} & \\textbf{Cant.} & \\textbf{Ubicación} \\\\
\\midrule
${COMPONENT_DIMENSIONS_TABLE.map(
  (r) =>
    `${escapeTex(r.component)} & ${escapeTex(r.dimensions)} & ${r.qty} & ${escapeTex(r.mountLocation)} \\\\`
).join('\n')}
\\bottomrule
\\end{tabular}
\\caption{Dimensiones reales verificadas para diseño de caja Z1 y cabeza Z3.}
\\end{table}

\\noindent En la caja Z1 (${params.controlBoxLengthCm}\\,${'\\ensuremath{\\times}'}\\,${params.controlBoxWidthCm}\\,${'\\ensuremath{\\times}'}\\,${params.controlBoxHeightCm}~cm), los elementos de base (${CONTROL_BOX_FIT_ITEMS.filter((i) => i.zone === 'Base interior Z1').length} grupos) y tapa caben con holgura para jumpers. En Z3 (${params.headWidthMm}\\,${'\\ensuremath{\\times}'}\\,${params.headDepthMm}~mm), los ${HEAD_Z3_FIT_ITEMS.length} subconjuntos suman ${HEAD_Z3_FIT_ITEMS.reduce((a, b) => a + b.areaMm2, 0)}~mm$^2$ frente a ${params.headWidthMm * params.headDepthMm}~mm$^2$ disponibles. El mástil hueco (${params.mastInnerSideMm}\\,${'\\ensuremath{\\times}'}\\,${params.mastInnerSideMm}~mm) con haz de $\\varnothing\\,${params.harnessOuterDiameterMm}~mm presenta una ocupación de ${fillRatio}\\% ($\\le 70\\%$).
`;

  const figsTex = figures
    .map((f, idx) => {
      const figPath = `figuras/${f.filename}.${f.ext}`;
      return `\\begin{figure}[h!]
\\centering
${
  f.ext === 'png'
    ? `\\includegraphics[width=0.95\\textwidth]{${figPath}}`
    : `\\fbox{\\parbox{0.9\\textwidth}{\\centering Archivo SVG exportado en \\texttt{${figPath}}}}`
}
\\caption{${escapeTex(f.caption)}}
\\label{fig:lamina${idx + 1}}
\\end{figure}`;
    })
    .join('\n\n');

  const sec06 = `\\section{Diseño Electrónico y Esquemas}
Se emplean exactamente 13 resistencias de 1~k$\\Omega$: 4 divisores de tensión ($4 \\times 3 = 12$) para ECHO US-H (D23), ECHO US-V (D18), UNO A1 (D2) y Hall KY-003 (D33), más 1 pull-up externa para HOME en D39. D12 (PARO) usa exclusivamente pull-up interna.

${figsTex}

\\begin{longtable}{llllp{5cm}}
\\toprule
\\textbf{Ctrl} & \\textbf{Pin} & \\textbf{Señal / Componente} & \\textbf{Div.} & \\textbf{Observación} \\\\
\\midrule
${pinAssignments
  .map(
    (pa) =>
      `${escapeTex(pa.controller)} & ${escapeTex(pa.pin)} & ${escapeTex(pa.componentLabel)} & ${
        pa.usesDivider ? 'Sí' : 'No'
      } & ${escapeTex(pa.notes)} \\\\`
  )
  .join('\n')}
\\bottomrule
\\caption{Mapa definitivo de pines (ESP32 y Arduino UNO).}
\\end{longtable}
`;

  const sec07 = `\\section{Funcionamiento y Secuencia Automática}
El modo automático ejecuta 8 pasos tras registrar las cargas $(r_i, \\theta_i, z_i)$ en la tablet:
\\begin{enumerate}
  \\item Verificación obligatoria del contrapeso $m_{\\text{cp}}$ en la tablet (bloquea TRABAJAR si no está colocado).
  \\item Señalización previa: enciende bombillo de corona (M3, PWM $\\approx 40\\%$) y suena Buzzer 1 (D10).
  \\item Posicionamiento polar hasta $(\\theta_i, r_i)$ con giro limitado 0--360$^\\circ$ y carro en M1 (PWM $\\le 50\\%$).
  \\item Descenso controlado del cabrestante hasta $\\Delta h = d_V - 3{,}5~\\text{cm} \\le 1~\\text{cm}$ a velocidad reducida (Potenciómetro 2).
  \\item Activación del electroimán en M2 a 12~V y espera de 5~s sobre la arandela de acero ($\\ge 4$~cm).
  \\item Verificación de agarre subiendo 2~cm mientras US-V confirma $d_V \\approx 3{,}5$~cm (si sube sin carga, reintenta).
  \\item Ascenso hasta el tope magnético Hall KY-003 (D33) y traslado hacia la bodega Z7 ($r_{\\text{bodega}} = ${params.warehouseRadiusCm}$~cm).
  \\item Descenso controlado por encoder del gancho hasta $< 1$~cm del piso, espera de 5~s, pulso inverso $\\le 80$~ms en M2 para liberar y retorno.
\\end{enumerate}
`;

  const sec08 = `\\section{Cálculos de Ingeniería}
\\begin{table}[h!]
\\centering
\\small
\\begin{tabular}{lll}
\\toprule
\\textbf{Parámetro} & \\textbf{Fórmula} & \\textbf{Resultado} \\\\
\\midrule
Velocidad del sonido & $v = 331{,}3 + 0{,}606 \\cdot ${params.ambientTempC}$ & ${vSound}~m/s \\\\
Resolución giro (Opción A) & $\\Delta\\theta = 360 / (2 \\cdot N \\cdot i)$ & ${resGiroA} \\\\
Resolución giro (Opción B) & $\\Delta\\theta = 360 / (2 \\cdot N \\cdot i)$ & ${resGiroB} \\\\
Resolución carro / gancho & $\\Delta s = \\pi D / (2N)$ & ${resCarro} / ${resGancho}~mm/pulso \\\\
Contrapeso mínimo & $m_{\\text{cp}} = 1{,}1 \\times \\max(m_i r_i) / d_{\\text{cp}}$ & ${minCp} \\\\
Altura útil del gancho & $H_{\\text{mástil}} - H_{\\text{bloque}} - \\text{margen}$ & ${usefulHook !== null ? `${usefulHook}~cm` : 'POR CONFIRMAR'} \\\\
Ocupación de manguera en mástil & $A_{\\text{haz}} / A_{\\text{interior}}$ & ${fillRatio}\\% \\\\
\\bottomrule
\\end{tabular}
\\caption{Resumen de cálculos geométricos, de resolución y equilibrio.}
\\end{table}
`;

  const sec09 = `\\section{Pruebas y Resultados Experimentales}
\\begin{table}[h!]
\\centering
\\small
\\begin{tabular}{lllll}
\\toprule
\\textbf{Magnitud} & \\textbf{Instrumento} & \\textbf{Rango esperado} & \\textbf{Medido real} & \\textbf{Observaciones} \\\\
\\midrule
${realMeasurements
  .map(
    (m) =>
      `${escapeTex(m.magnitude)} & ${escapeTex(m.instrument)} & ${escapeTex(m.expectedRange)} & ${escapeTex(
        m.measuredValue || 'Por medir'
      )} & ${escapeTex(m.observations || '-')} \\\\`
  )
  .join('\n')}
\\bottomrule
\\end{tabular}
\\caption{Mediciones reales de laboratorio (Etapas E1--E12).}
\\end{table}
`;

  const sec10 = `\\section{Seguridad, Riesgos y Protecciones}
\\begin{itemize}
  \\item Paro físico por interruptor general en serie con +12~V y paro por software en D12 (solo pull-up interna).
  \\item Prohibido energizar el riel R2 (+5~V) y conectar el cable USB de programación simultáneamente.
  \\item Máximo 2 motores moviéndose a la vez para respetar el límite de 2~A de la fuente de 12~V.
\\end{itemize}
`;

  const sec11 = `\\section{Conclusiones y Trabajo Futuro}
La arquitectura dual ESP32 + Arduino UNO en caja separada Z1, el diseño paramétrico definido por el usuario y la separación estricta de dominios de 12~V, 5~V y 3,3~V con masa común en R1 garantizan una plataforma segura y reproducible. Queda como trabajo futuro la definición de firmware y tramas seriales/WebSocket (\\textbf{POR DEFINIR}) y el diligenciamiento experimental de la Tabla de mediciones reales.
`;

  const sec12 = `\\section{Anexos}
\\begin{longtable}{llllll}
\\toprule
\\textbf{\\#} & \\textbf{Tramo} & \\textbf{Etiqueta} & \\textbf{Color} & \\textbf{Origen} & \\textbf{Destino} \\\\
\\midrule
${HARNESS_CONDUCTORS.map(
  (h) =>
    `${h.index} & ${escapeTex(h.tramo)} & ${escapeTex(h.shortLabel)} & ${escapeTex(
      h.color
    )} & ${escapeTex(h.origin)} & ${escapeTex(h.destination)} \\\\`
).join('\n')}
\\bottomrule
\\caption{Conductores de manguera Tramo A (22 hilos) y Tramo B (9 hilos).}
\\end{longtable}

\\begin{longtable}{p{5.2cm}rrlp{2.8cm}}
\\toprule
\\textbf{Componente} & \\textbf{Disp.} & \\textbf{Usada} & \\textbf{Zona} & \\textbf{Estado} \\\\
\\midrule
${components
  .map(
    (c) =>
      `${escapeTex(c.name)} & ${c.availableQty} & ${c.usedQty} & ${escapeTex(c.zone)} & ${escapeTex(
        c.status
      )} \\\\`
  )
  .join('\n')}
\\bottomrule
\\caption{Inventario completo del proyecto.}
\\end{longtable}
`;

  const bibContent = `@manual{espressif2025esp32,
  author = {{Espressif Systems}},
  title = {ESP32 Series Datasheet (Version 5.3)},
  year = {2025},
  url = {https://www.espressif.com/sites/default/files/documentation/esp32_datasheet_en.pdf}
}
@manual{st2000l298,
  author = {{STMicroelectronics}},
  title = {L298 Dual Full-Bridge Driver (DS1773)},
  year = {2000},
  url = {https://www.st.com/resource/en/datasheet/l298.pdf}
}
@manual{ti_l293d_por_verificar,
  author = {{Texas Instruments}},
  title = {L293x Quadruple Half-H Drivers (SLRS008) -- POR VERIFICAR ANIO},
  url = {https://www.ti.com/lit/ds/symlink/l293.pdf}
}
@manual{ti2025lm393,
  author = {{Texas Instruments}},
  title = {LM393 Dual Comparators (SLCS005AH)},
  year = {2025},
  url = {https://www.ti.com/lit/ds/symlink/lm393.pdf}
}
@manual{allegro2002a3144,
  author = {{Allegro MicroSystems}},
  title = {3141 thru 3144 Sensitive Hall-Effect Switches},
  year = {2002},
  url = {https://www.allegromicro.com/-/media/files/datasheets/a3141-2-3-4-datasheet.pdf}
}
@manual{cytron2013hcsr04,
  author = {{Cytron Technologies}},
  title = {Product User's Manual -- HC-SR04 Ultrasonic Sensor},
  year = {2013},
  url = {https://docs.cytron.io/manual/hc-sr04}
}
@manual{arduino2026uno,
  author = {{Arduino}},
  title = {UNO R3 Documentation},
  year = {2026},
  url = {https://docs.arduino.cc/hardware/uno-rev3/}
}
@manual{bluepad32,
  author = {Quesada, Ricardo},
  title = {Bluepad32 Documentation},
  year = {2026},
  url = {https://bluepad32.readthedocs.io/}
}
@book{hibbeler2016estatica,
  author = {Hibbeler, Russell C.},
  title = {Ingeniería mecánica: Estática},
  edition = {14},
  year = {2016},
  publisher = {Pearson Educación}
}
@book{ogata2010control,
  author = {Ogata, Katsuhiko},
  title = {Ingeniería de control moderna},
  edition = {5},
  year = {2010},
  publisher = {Pearson Educación}
}
`;

  const zipEntries: ZipEntryInput[] = [
    { path: 'main.tex', data: mainTex },
    { path: 'referencias.bib', data: bibContent },
    { path: 'secciones/00_resumen.tex', data: sec00 },
    { path: 'secciones/01_introduccion.tex', data: sec01 },
    { path: 'secciones/02_objetivos.tex', data: sec02 },
    { path: 'secciones/03_marco_teorico.tex', data: sec03 },
    { path: 'secciones/04_metodologia.tex', data: sec04 },
    { path: 'secciones/05_diseno_mecanico.tex', data: sec05 },
    { path: 'secciones/06_diseno_electronico.tex', data: sec06 },
    { path: 'secciones/07_funcionamiento.tex', data: sec07 },
    { path: 'secciones/08_calculos.tex', data: sec08 },
    { path: 'secciones/09_pruebas.tex', data: sec09 },
    { path: 'secciones/10_seguridad.tex', data: sec10 },
    { path: 'secciones/11_conclusiones.tex', data: sec11 },
    { path: 'secciones/12_anexos.tex', data: sec12 },
    ...figures.map((f) => ({
      path: `figuras/${f.filename}.${f.ext}`,
      data: f.data,
    })),
  ];

  return buildZipBlob(zipEntries);
}
