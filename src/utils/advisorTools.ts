import { ASSEMBLY_STAGES } from '../data/assemblyGuideData.ts';
import {
  DEFINITIVE_CONNECTIONS,
  INVENTORY_COMPONENTS,
  SHIELD_RESERVED_UNO_PINS,
  VOLTAGE_DIVIDERS,
} from '../data/craneData.ts';
import type { CraneProjectJson } from '../types/crane.ts';

export function toolConsultarPin(
  project: CraneProjectJson,
  placa: string,
  pin: string
) {
  const boardNorm = placa.trim().toUpperCase().includes('UNO') ? 'UNO' : 'ESP32';
  const pinNorm = pin.trim().toUpperCase().replace(/^GPIO/, 'D');

  const matches = project.pins.filter((p) => {
    if (p.controller !== boardNorm) return false;
    const parts = p.pin.toUpperCase().split('/').map((s) => s.trim());
    return (
      parts.includes(pinNorm) ||
      parts.includes(`D${pinNorm}`) ||
      p.pin.toUpperCase() === pinNorm
    );
  });

  if (boardNorm === 'UNO' && SHIELD_RESERVED_UNO_PINS.includes(pinNorm)) {
    return {
      encontrado: true,
      placa: boardNorm,
      pin: pinNorm,
      reservadoPorShield: true,
      detalle: `El pin ${pinNorm} en Arduino UNO está RESERVADO internamente por el Shield L293D (D3–D8, D11, D12). Nunca conectes sensores o botones aquí.`,
      fuente: 'Lámina 4 · Regla Shield L293D',
    };
  }

  if (matches.length === 0) {
    return {
      encontrado: false,
      placa: boardNorm,
      pin: pinNorm,
      detalle: `El pin ${pinNorm} en ${boardNorm} no aparece asignado en project.json.`,
      fuente: 'Tabla maestra de pines (project.json)',
    };
  }

  return {
    encontrado: true,
    placa: boardNorm,
    pin: pinNorm,
    asignaciones: matches.map((m) => ({
      id: m.id,
      componente: m.componentLabel,
      senal: m.signalName,
      voltajeOrigen: m.sourceVoltage,
      usaDivisor: m.usesDivider,
      resistenciaExterna: m.hasExternalResistor,
      notas: m.notes,
    })),
    fuente: 'Tabla maestra de pines (project.json) · Lámina 5 y Lámina 7',
  };
}

export function toolConexionesDe(project: CraneProjectJson, componente: string) {
  const q = componente.trim().toLowerCase();

  const matchedPins = project.pins.filter(
    (p) =>
      p.componentLabel.toLowerCase().includes(q) ||
      p.componentId.toLowerCase().includes(q) ||
      p.signalName.toLowerCase().includes(q) ||
      p.notes.toLowerCase().includes(q)
  );

  const matchedWires = DEFINITIVE_CONNECTIONS.filter(
    (w) =>
      w.fromComponentName.toLowerCase().includes(q) ||
      w.toComponentName.toLowerCase().includes(q) ||
      w.fromComponentId.toLowerCase().includes(q) ||
      w.toComponentId.toLowerCase().includes(q) ||
      w.notes.toLowerCase().includes(q)
  );

  const matchedDividers = VOLTAGE_DIVIDERS.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.signalLabel.toLowerCase().includes(q) ||
      d.sourcePin.toLowerCase().includes(q) ||
      d.esp32Pin.toLowerCase().includes(q)
  );

  const matchedComp = INVENTORY_COMPONENTS.find(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.shortCode.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q)
  );

  return {
    consulta: componente,
    componenteInventario: matchedComp
      ? {
          nombre: matchedComp.name,
          zona: matchedComp.zoneDetail,
          voltaje: matchedComp.operatingVoltage,
          pines: matchedComp.pins,
        }
      : null,
    pinesEnProjectJson: matchedPins,
    conexionesMaestras: matchedWires.map((w) => ({
      etapa: w.stage,
      origen: `${w.fromComponentName} (${w.fromPin})`,
      destino: `${w.toComponentName} (${w.toPin})`,
      voltaje: w.voltage,
      color: w.wireColor,
      jumper: w.jumperType,
      coordenadaProtoboard: w.breadboardCoord || 'Conexión directa fuera de protoboard',
      divisor: w.dividerId || 'No',
    })),
    divisoresRelacionados: matchedDividers,
    fuente: 'Biblioteca de Componentes · Tabla Maestra de Conexiones · Lámina 5',
  };
}

export function toolResolucion(N: number, D?: number | null, i?: number | null) {
  if (!N || N <= 0) {
    return {
      valido: false,
      mensaje: 'El número de ranuras N debe ser mayor que cero (POR CONFIRMAR contando las ranuras físicas del disco).',
      fuente: 'Sección de Calibración y encoders FC-33',
    };
  }
  const flancosPorVueltaDisco = 2 * N;
  const resultado: Record<string, unknown> = {
    valido: true,
    ranurasN: N,
    flancosPorVueltaEnChange: flancosPorVueltaDisco,
    fuente: 'Fórmulas de resolución FC-33 con interrupción CHANGE (Informe Académico Sección 5)',
  };

  if (i && i > 0) {
    const degPorPulso = 360 / (flancosPorVueltaDisco * i);
    resultado.relacionEngranajesI = i;
    resultado.resolucionAngularDegPorPulso = Number(degPorPulso.toFixed(2));
    resultado.formulaAngular = `360 / (2 * ${N} * ${i}) = ${degPorPulso.toFixed(2)} °/pulso`;
  }

  if (D && D > 0) {
    const mmPorPulso = (Math.PI * D * 10) / flancosPorVueltaDisco;
    resultado.diametroTamborCm = D;
    resultado.resolucionLinealMmPorPulso = Number(mmPorPulso.toFixed(2));
    resultado.formulaLineal = `(π * ${D} cm * 10) / (2 * ${N}) = ${mmPorPulso.toFixed(2)} mm/pulso`;
  }

  return resultado;
}

export function toolContrapeso(masas: number[], radios: number[], d_cp: number) {
  if (!d_cp || d_cp <= 0) {
    return {
      valido: false,
      mensaje: 'La distancia d_cp de la contrapluma debe ser > 0 cm (POR CONFIRMAR midiendo con regla desde el centro del mástil).',
      fuente: 'Sección Mecánica de Contrapeso',
    };
  }
  if (!masas.length || masas.length !== radios.length) {
    return {
      valido: false,
      mensaje: 'Las listas de masas (g) y radios (cm) deben tener la misma cantidad de elementos.',
      fuente: 'Cálculo de contrapeso',
    };
  }
  const momentos = masas.map((m, idx) => ({
    carga: idx + 1,
    masaG: m,
    radioCm: radios[idx],
    momentoGCm: Number((m * radios[idx]).toFixed(1)),
  }));
  const maxMoment = Math.max(...momentos.map((x) => x.momentoGCm));
  const minCpG = (1.1 * maxMoment) / d_cp;

  return {
    valido: true,
    formula: 'm_cp = 1,1 × máx(m_i × r_i) / d_cp',
    factorSeguridad: 1.1,
    dCpCm: d_cp,
    momentoMaximoGCm: maxMoment,
    contrapesoMinimoG: Number(minCpG.toFixed(1)),
    detalleCargas: momentos,
    fuente: 'Informe Académico (Estática de momentos) · Lámina de Contrapeso Z4',
  };
}

export function toolCompatibilidadVoltaje(origen: string, destino: string) {
  const o = origen.toLowerCase();
  const d = destino.toLowerCase();
  const origin5V = o.includes('5v') || o.includes('5 v') || o.includes('uno') || o.includes('hc-sr04') || o.includes('us-v') || o.includes('us-h') || o.includes('hall') || o.includes('ky-003');
  const origin12V = o.includes('12v') || o.includes('12 v');
  const destEsp32 = d.includes('esp32') || d.includes('gpio') || /^d\d+/.test(d.trim());

  if (origin12V && (destEsp32 || d.includes('uno') || d.includes('5v') || d.includes('r2') || d.includes('r3'))) {
    return {
      compatibleDirecto: false,
      peligro: 'CRÍTICO',
      conclusion: 'PROHIBIDO conectar 12 V a ningún pin lógico de ESP32 (3,3 V), Arduino UNO (5 V) ni rieles R2/R3.',
      solucion: 'Los 12 V solo van por el interruptor general hacia +12V del L298N y +M EXT_PWR del Shield L293D (con puente PWR retirado).',
      fuente: 'Lámina 2 · Potencia y Masas',
    };
  }

  if (origin5V && destEsp32) {
    return {
      compatibleDirecto: false,
      peligro: 'ALTO (daña el GPIO del ESP32)',
      conclusion: 'Requiere obligatoriamente un divisor de tensión de 3 resistencias de 1 kΩ (1 kΩ en serie + 2 kΩ a GND R1) para bajar de 5 V a 3,33 V.',
      voltajeResultante: '3,33 V (= 5 V × 2 kΩ / 3 kΩ)',
      fuente: 'Lámina 5 y Lámina 7 · Protección 3,3 V del ESP32',
    };
  }

  if (d.includes('d12')) {
    return {
      compatibleDirecto: true,
      peligro: 'CUIDADO CON ARRANQUE (Pin D12)',
      conclusion: 'ESP32 D12 acepta 3,3 V pero tiene PROHIBIDA cualquier resistencia externa pull-up (bloquea el arranque). Usa solo pull-up interna hacia GND.',
      fuente: 'Lámina 5 · Regla de pin de arranque D12',
    };
  }

  return {
    compatibleDirecto: true,
    peligro: 'NINGUNO (respetando masa común R1)',
    conclusion: `Conexión compatible entre ${origen} y ${destino}, siempre compartiendo masa común en el riel R1.`,
    fuente: 'Lámina 2 y Tabla Maestra de Pines',
  };
}

export function toolBuscarPaso(texto: string) {
  const q = texto.trim().toLowerCase();
  const hits: {
    etapa: string;
    paso: string;
    titulo: string;
    energia: string;
    origen: string;
    destino: string;
    coordProtoboard: string;
    color: string;
    pruebaMultimetro: string;
  }[] = [];

  for (const stage of ASSEMBLY_STAGES) {
    for (const step of stage.steps) {
      const hay = `${stage.code} ${stage.title} ${step.id} ${step.title} ${step.actionSentence} ${step.origin} ${step.destination} ${step.breadboardCoord ?? ''}`.toLowerCase();
      if (hay.includes(q)) {
        hits.push({
          etapa: `${stage.code} — ${stage.title}`,
          paso: `Paso ${stage.code}.${step.stepNumber} (${step.id})`,
          titulo: step.title,
          energia: step.powerState,
          origen: step.origin,
          destino: step.destination,
          coordProtoboard: step.breadboardCoord || 'Fuera de protoboard',
          color: step.wireColor,
          pruebaMultimetro: `${step.multimeterTest.probes} en ${step.multimeterTest.scale} -> Esperado: ${step.multimeterTest.expected}`,
        });
      }
    }
  }

  return {
    consulta: texto,
    totalEncontrados: hits.length,
    resultados: hits.slice(0, 6),
    fuente: 'Guía de Montaje E0–E12',
  };
}
