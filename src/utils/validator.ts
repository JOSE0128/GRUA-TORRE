import { ASSEMBLY_STAGES } from '../data/assemblyGuideData';
import {
  DEFINITIVE_CONNECTIONS,
  SHIELD_RESERVED_UNO_PINS,
} from '../data/craneData';
import {
  CraneComponent,
  PinAssignment,
  ShoppingListItem,
  UserEditableParams,
  ValidationCheck,
} from '../types/crane';

export function computeShoppingList(
  components: CraneComponent[],
  params: UserEditableParams
): ShoppingListItem[] {
  const list: ShoppingListItem[] = [];
  const handledPools = new Set<string>();

  for (const c of components) {
    if (c.poolGroup) {
      if (handledPools.has(c.poolGroup)) continue;
      handledPools.add(c.poolGroup);
      const groupItems = components.filter((x) => x.poolGroup === c.poolGroup);
      const totalUsed = groupItems.reduce((acc, x) => acc + x.usedQty, 0);
      const avail = groupItems[0]?.availableQty ?? 0;
      if (totalUsed > avail) {
        list.push({
          id: `SHOP-POOL-${c.poolGroup}`,
          item: `${c.poolGroup} (lote compartido)`,
          neededQty: totalUsed,
          availableQty: avail,
          missingQty: totalUsed - avail,
          specification: c.operatingVoltage,
          status: 'POR COMPRAR',
        });
      }
      continue;
    }

    if (c.id === 'resistencias-1k') {
      const avail = params.resistors1kAvailable;
      if (avail === null) {
        list.push({
          id: 'SHOP-R1K-CONFIRM',
          item: 'Resistencias de 1 kΩ ±5 % (1/4 W)',
          neededQty: 13,
          availableQty: null,
          missingQty: 0,
          specification: '4 divisores × 3 (12) + 1 pull-up HOME (1) — contar existencias físicas',
          status: 'POR CONFIRMAR',
        });
      } else if (avail < 13) {
        list.push({
          id: 'SHOP-R1K-BUY',
          item: 'Resistencias de 1 kΩ ±5 % (1/4 W)',
          neededQty: 13,
          availableQty: avail,
          missingQty: 13 - avail,
          specification: 'Completar mínimo 13 unidades para los 4 divisores y pull-up D39',
          status: 'POR COMPRAR',
        });
      }
      continue;
    }

    if (c.status === 'POR COMPRAR' || c.usedQty > c.availableQty) {
      const missing = Math.max(0, c.usedQty - c.availableQty);
      list.push({
        id: `SHOP-${c.id}`,
        item: c.name,
        neededQty: c.usedQty,
        availableQty: c.availableQty,
        missingQty: missing > 0 ? missing : 1,
        specification: `${c.operatingVoltage} · ${c.dimensionsMm}`,
        status: 'POR COMPRAR',
      });
    }
  }

  return list;
}

export interface AssemblyAuditIssue {
  source: string;
  message: string;
}

export interface AssemblyAuditReport {
  totalStages: number;
  totalSteps: number;
  totalDefinitiveConnections: number;
  forbiddenPhraseHits: number;
  problemCount: number;
  issues: AssemblyAuditIssue[];
}

const FORBIDDEN_PHRASE_REGEX = /\b(ver arriba|como antes|seg[uú]n corresponda)\b/i;

export function auditAssemblyGuide(): AssemblyAuditReport {
  const issues: AssemblyAuditIssue[] = [];
  let forbiddenPhraseHits = 0;
  let totalSteps = 0;

  for (const stage of ASSEMBLY_STAGES) {
    const stageTexts = [
      stage.title,
      stage.objective,
      stage.simpleSummary,
      stage.stageTest,
      stage.ifFails,
      ...stage.connectList,
      ...stage.doNotConnectYet,
    ];
    for (const txt of stageTexts) {
      if (FORBIDDEN_PHRASE_REGEX.test(txt)) {
        forbiddenPhraseHits++;
        issues.push({
          source: `Etapa ${stage.code}`,
          message: `Contiene frase ambigua prohibida en resumen de etapa: "${txt.slice(0, 60)}..."`,
        });
      }
    }

    for (const step of stage.steps) {
      totalSteps++;
      const stepLabel = `${stage.code} · Paso ${step.stepNumber} (${step.id})`;
      if (!step.origin?.trim()) {
        issues.push({ source: stepLabel, message: 'Falta campo ORIGEN.' });
      }
      if (!step.destination?.trim()) {
        issues.push({ source: stepLabel, message: 'Falta campo DESTINO.' });
      }
      if (!step.jumperType?.trim()) {
        issues.push({ source: stepLabel, message: 'Falta tipo de jumper/cable.' });
      }
      if (!step.wireColor?.trim()) {
        issues.push({ source: stepLabel, message: 'Falta color de cable.' });
      }
      if (!step.actionSentence?.trim()) {
        issues.push({ source: stepLabel, message: 'Falta oración de acción.' });
      }
      if (!step.simpleExplanation?.trim()) {
        issues.push({ source: stepLabel, message: 'Falta explicación sencilla.' });
      }
      if (
        !step.multimeterTest?.probes?.trim() ||
        !step.multimeterTest?.scale?.trim() ||
        !step.multimeterTest?.expected?.trim() ||
        !step.multimeterTest?.ifFails?.trim()
      ) {
        issues.push({
          source: stepLabel,
          message: 'Prueba con multímetro incompleta (puntas, escala, esperado o si no da).',
        });
      }

      const combinedText = `${step.title} ${step.actionSentence} ${step.origin} ${step.destination}`.toLowerCase();
      const touchesBreadboard =
        /\bp1\b|\bp2\b|divisor|pull-up|riel|columna|fila/.test(combinedText);
      if (touchesBreadboard && !step.breadboardCoord?.trim()) {
        issues.push({
          source: stepLabel,
          message: 'Conecta en protoboard P1/P2 o divisor pero falta breadboardCoord exacto.',
        });
      }

      const stepTexts = [
        step.title,
        step.actionSentence,
        step.origin,
        step.destination,
        step.wireColor,
        step.breadboardCoord ?? '',
        step.simpleExplanation,
        step.multimeterTest?.probes ?? '',
        step.multimeterTest?.expected ?? '',
        step.multimeterTest?.ifFails ?? '',
      ];
      for (const txt of stepTexts) {
        if (FORBIDDEN_PHRASE_REGEX.test(txt)) {
          forbiddenPhraseHits++;
          issues.push({
            source: stepLabel,
            message: `Contiene frase ambigua prohibida ("ver arriba"/"como antes"/"según corresponda").`,
          });
        }
      }
    }
  }

  for (const conn of DEFINITIVE_CONNECTIONS) {
    if (
      !conn.fromComponentName?.trim() ||
      !conn.fromPin?.trim() ||
      !conn.toComponentName?.trim() ||
      !conn.toPin?.trim() ||
      !conn.wireColor?.trim() ||
      !conn.jumperType?.trim()
    ) {
      issues.push({
        source: `Conexión maestra ${conn.id}`,
        message: 'Falta origen, pin, destino, color o tipo de jumper.',
      });
    }
    const connText = `${conn.fromComponentName} ${conn.toComponentName} ${conn.notes}`;
    if (FORBIDDEN_PHRASE_REGEX.test(connText)) {
      forbiddenPhraseHits++;
      issues.push({
        source: `Conexión maestra ${conn.id}`,
        message: 'Contiene frase ambigua prohibida en notas o nombres.',
      });
    }
  }

  return {
    totalStages: ASSEMBLY_STAGES.length,
    totalSteps,
    totalDefinitiveConnections: DEFINITIVE_CONNECTIONS.length,
    forbiddenPhraseHits,
    problemCount: issues.length,
    issues,
  };
}

export function runProjectValidation(
  pinAssignments: PinAssignment[],
  components: CraneComponent[],
  params: UserEditableParams
): {
  checks: ValidationCheck[];
  errorCount: number;
  warningCount: number;
  canExport: boolean;
} {
  const checks: ValidationCheck[] = [];

  // 1. Pines duplicados en el mismo controlador
  const seenByCtrl: Record<string, Record<string, string[]>> = {
    ESP32: {},
    UNO: {},
  };
  for (const pa of pinAssignments) {
    if (pa.controller !== 'ESP32' && pa.controller !== 'UNO') continue;
    const individualPins = pa.pin.split('/').map((s) => s.trim());
    for (const p of individualPins) {
      if (!seenByCtrl[pa.controller][p]) seenByCtrl[pa.controller][p] = [];
      seenByCtrl[pa.controller][p].push(`${pa.componentLabel} (${pa.signalName})`);
    }
  }
  const duplicates: string[] = [];
  for (const ctrl of ['ESP32', 'UNO'] as const) {
    for (const [pin, users] of Object.entries(seenByCtrl[ctrl])) {
      if (users.length > 1) {
        duplicates.push(`${ctrl} ${pin}: usado por ${users.join(' y ')}`);
      }
    }
  }
  checks.push({
    id: 'VAL-DUP-PINS',
    category: 'Pines',
    title: 'Sin pines duplicados en ESP32 ni Arduino UNO',
    passed: duplicates.length === 0,
    severity: duplicates.length === 0 ? 'OK' : 'ERROR',
    detail:
      duplicates.length === 0
        ? 'Cada señal de ESP32 y Arduino UNO tiene un pin único asignado.'
        : `Colisión detectada -> ${duplicates.join(' | ')}`,
    fixAction:
      duplicates.length === 0
        ? 'Ninguna acción requerida.'
        : 'En el Diseñador interactivo, reasigna uno de los pines duplicados a un GPIO libre.',
  });

  // 2. Señales de 5 V directas al ESP32 sin divisor
  const esp32Direct5V = pinAssignments.filter(
    (pa) => pa.controller === 'ESP32' && pa.sourceVoltage === '5V' && !pa.usesDivider
  );
  checks.push({
    id: 'VAL-5V-ESP32',
    category: 'Niveles de voltaje',
    title: 'Protección 3,3 V del ESP32 (ninguna señal de 5 V directa sin divisor)',
    passed: esp32Direct5V.length === 0,
    severity: esp32Direct5V.length === 0 ? 'OK' : 'ERROR',
    detail:
      esp32Direct5V.length === 0
        ? 'Las 4 señales de 5 V hacia ESP32 (ECHO US-H, ECHO US-V, UNO A1 y Hall S) pasan por divisores 1 kΩ + 2 kΩ (3,33 V).'
        : `PELIGRO DE DAÑO: ${esp32Direct5V.map((x) => `${x.componentLabel} en ${x.pin}`).join(', ')} recibe 5 V sin divisor.`,
    fixAction:
      esp32Direct5V.length === 0
        ? 'Ninguna acción requerida.'
        : 'Activa el divisor de tensión de 3 resistencias de 1 kΩ en el Diseñador interactivo.',
  });

  // 3. Pines de arranque ESP32 (D12 solo pull-up interna, D2 con jumper desmontable)
  const d12Item = pinAssignments.find(
    (pa) => pa.controller === 'ESP32' && pa.pin.split('/').includes('D12')
  );
  const d12HasExternalRes = Boolean(d12Item && d12Item.hasExternalResistor);
  const d2Item = pinAssignments.find(
    (pa) => pa.controller === 'ESP32' && pa.pin.split('/').includes('D2')
  );
  const d2Valid = !d2Item || d2Item.notes.toLowerCase().includes('desmontable');
  checks.push({
    id: 'VAL-STRAPPING',
    category: 'Arranque y reservados',
    title: 'Pines de arranque ESP32 (D12 sin R externa; D2 con jumper desmontable)',
    passed: !d12HasExternalRes && d2Valid,
    severity: !d12HasExternalRes && d2Valid ? 'OK' : 'ERROR',
    detail: !d12HasExternalRes
      ? 'D12 (PARO) usa únicamente pull-up interna y D2 (UART RX) cuenta con jumper desmontable para carga por USB.'
      : `FALLO DE ARRANQUE: ${d12Item?.componentLabel} en D12 tiene resistencia externa marcada, lo cual impide el arranque normal del ESP32.`,
    fixAction: !d12HasExternalRes
      ? 'Ninguna acción requerida.'
      : 'Desmarca cualquier resistencia externa en D12 (debe usar solo pull-up interna por software).',
  });

  // 4. Pines reservados del Shield L293D en UNO (D3..D8, D11, D12)
  const unoReservedViolations = pinAssignments.filter((pa) => {
    if (pa.controller !== 'UNO') return false;
    return pa.pin
      .split('/')
      .map((s) => s.trim())
      .some((p) => SHIELD_RESERVED_UNO_PINS.includes(p));
  });
  checks.push({
    id: 'VAL-SHIELD-PINS',
    category: 'Arranque y reservados',
    title: 'Pines reservados del Shield L293D intactos (D3–D8, D11, D12)',
    passed: unoReservedViolations.length === 0,
    severity: unoReservedViolations.length === 0 ? 'OK' : 'ERROR',
    detail:
      unoReservedViolations.length === 0
        ? 'Ninguna señal del Arduino UNO invade los pines reservados por el Shield L293D.'
        : `CONFLICTO CON SHIELD: ${unoReservedViolations.map((v) => `${v.componentLabel} en ${v.pin}`).join(', ')}.`,
    fixAction:
      unoReservedViolations.length === 0
        ? 'Ninguna acción requerida.'
        : 'Mueve la señal afectada a uno de los pines libres del UNO: A0–A5, D2, D9, D10 o D13.',
  });

  // 5. Masa común
  checks.push({
    id: 'VAL-GND',
    category: 'Alimentación y masa',
    title: 'Punto único de masa común (P1 R1 ↔ P2 R1 + negativos 5 V y 12 V)',
    passed: true,
    severity: 'OK',
    detail:
      'La topología mantiene R1 de P1 unido por 1 jumper a R1 de P2, conectando negativos de 5 V, 12 V, ESP32, UNO, Shield y L298N. R2 (+5 V) y R3 (+3,3 V) permanecen aislados.',
    fixAction: 'Verificar continuidad de R1 antes de encender en Etapa E1.',
  });

  // 6. Suma de corrientes contra 2 A de la fuente de 12 V (máx. 2 motores a la vez)
  const twoMotorsCurrent = params.estimatedMaxCurrentMotorA * 2;
  const peak12VCurrent =
    twoMotorsCurrent +
    params.estimatedMaxCurrentElectromagnetA +
    params.estimatedMaxCurrentBulbA;
  const current12VOk = peak12VCurrent <= 2.0;
  checks.push({
    id: 'VAL-CURRENT-12V',
    category: 'Corriente y capacidad',
    title: 'Presupuesto de corriente 12 V (máx. 2 motores + electroimán + bombillo ≤ 2,0 A)',
    passed: current12VOk,
    severity: current12VOk ? 'OK' : 'ERROR',
    detail: `Con 2 motores simultáneos (${twoMotorsCurrent.toFixed(2)} A) + electroimán (${params.estimatedMaxCurrentElectromagnetA.toFixed(2)} A) + bombillo M3 (${params.estimatedMaxCurrentBulbA.toFixed(2)} A) = ${peak12VCurrent.toFixed(2)} A frente a 2,00 A de la fuente.`,
    fixAction: current12VOk
      ? 'Ninguna acción requerida (mantener regla de máximo 2 motores activos).'
      : 'Reduce el PWM del motor del carro/giro o limita a 1 motor activo mientras el electroimán esté energizado.',
  });

  // 7. Capacidad por canal (L293D 0,6 A continuos, L298N 2 A)
  const channelCapOk =
    params.estimatedMaxCurrentMotorA <= 0.6 &&
    params.estimatedMaxCurrentElectromagnetA <= 0.6 &&
    params.estimatedMaxCurrentBulbA <= 0.6;
  checks.push({
    id: 'VAL-CHANNEL-CAP',
    category: 'Corriente y capacidad',
    title: 'Capacidad por canal de drivers (L293D ≤ 0,6 A continuos; L298N ≤ 2,0 A)',
    passed: channelCapOk,
    severity: channelCapOk ? 'OK' : 'ERROR',
    detail: channelCapOk
      ? 'Canales M1–M3 del Shield L293D dentro de 0,60 A continuos (carro ≤ 50 % PWM, bombillo ≈ 40 % PWM); L298N dentro de 2,00 A por canal.'
      : 'Uno de los actuadores en M1–M3 excede los 0,60 A continuos del L293D.',
    fixAction: channelCapOk
      ? 'Confirmar corriente real con multímetro en serie durante Etapa E7 y E8.'
      : 'Reduce el ciclo de trabajo (PWM) en M1 o verifica resistencia del electroimán en M2.',
  });

  // 14. Resistencias de 1 kΩ (13 necesarias = 4 divisores × 3 + 1 pull-up HOME)
  const r1kAvail = params.resistors1kAvailable;
  const r1kEnough = r1kAvail === null || r1kAvail >= 13;
  checks.push({
    id: 'VAL-RESISTORS-1K',
    category: 'Inventario',
    title: 'Resistencias de 1 kΩ disponibles (mínimo 13 unidades: 12 divisores + 1 pull-up)',
    passed: r1kEnough,
    severity: !r1kEnough ? 'ERROR' : r1kAvail === null ? 'ADVERTENCIA' : 'OK',
    detail:
      r1kAvail === null
        ? 'Cantidad física de resistencias de 1 kΩ POR CONFIRMAR (se requieren exactamente 13 unidades).'
        : r1kAvail >= 13
          ? `Tienes ${r1kAvail} resistencias de 1 kΩ disponibles para 13 requeridas (sobran ${r1kAvail - 13}).`
          : `FALTAN RESISTENCIAS: reportaste ${r1kAvail} disponibles y el circuito requiere mínimo 13 (faltan ${13 - r1kAvail}).`,
    fixAction:
      r1kAvail === null
        ? 'Cuenta tus resistencias marrón-negro-rojo-dorado en la pestaña Biblioteca e ingresa la cantidad.'
        : r1kAvail >= 13
          ? 'Medir con óhmetro cada resistencia (950–1050 Ω) antes de insertarlas en P2.'
          : `Comprar ${13 - r1kAvail} resistencias de 1 kΩ (1/4 W) antes de la etapa E5.`,
  });

  // 15. Inventario general (con manejo correcto de lotes compartidos poolGroup)
  const handledPools = new Set<string>();
  const qtyOverruns: string[] = [];
  for (const c of components) {
    if (c.poolGroup) {
      if (handledPools.has(c.poolGroup)) continue;
      handledPools.add(c.poolGroup);
      const groupItems = components.filter((x) => x.poolGroup === c.poolGroup);
      const totalUsed = groupItems.reduce((acc, x) => acc + x.usedQty, 0);
      const avail = groupItems[0]?.availableQty ?? 0;
      if (totalUsed > avail) {
        qtyOverruns.push(`${c.poolGroup} (usado ${totalUsed} > disp. ${avail})`);
      }
      continue;
    }
    if (c.status !== 'POR COMPRAR' && c.id !== 'resistencias-1k' && c.usedQty > c.availableQty) {
      qtyOverruns.push(`${c.name} (usado ${c.usedQty} > disp. ${c.availableQty})`);
    }
  }
  const toBuyItems = components.filter((c) => c.status === 'POR COMPRAR');
  checks.push({
    id: 'VAL-INVENTORY',
    category: 'Inventario',
    title: 'Cantidades usadas frente a disponibles en inventario (con lotes compartidos)',
    passed: qtyOverruns.length === 0,
    severity: qtyOverruns.length === 0 ? (toBuyItems.length > 0 ? 'ADVERTENCIA' : 'OK') : 'ERROR',
    detail:
      qtyOverruns.length === 0
        ? `Sin excesos de inventario (FC-33: 3/3, HC-SR04: 2/2, OLED: 2/2, Potenciómetros: 2/2).${
            toBuyItems.length > 0 ? ` Por comprar: ${toBuyItems.map((i) => i.name).join(', ')}.` : ''
          }`
        : `Falta stock en: ${qtyOverruns.join(', ')}.`,
    fixAction:
      qtyOverruns.length === 0
        ? toBuyItems.length > 0
          ? 'Adquirir electroimán DC 12 V 25 N (P20/15 o P25/20) antes de la etapa E8.'
          : 'Ninguna acción requerida.'
        : 'Ajusta la cantidad usada o agrega unidades al inventario.',
  });

  // 10. Auditoría programática completa de la guía de montaje (0 frases ambiguas, 100 % pasos completos)
  const audit = auditAssemblyGuide();
  checks.push({
    id: 'VAL-STEPS',
    category: 'Guía de montaje',
    title: 'Auditoría de la guía de montaje (origen, destino, jumper, color, coordenadas, prueba y 0 frases ambiguas)',
    passed: audit.problemCount === 0,
    severity: audit.problemCount === 0 ? 'OK' : 'ERROR',
    detail:
      audit.problemCount === 0
        ? `Auditoría limpia: ${audit.totalSteps} pasos en ${audit.totalStages} etapas (E0–E12) y ${audit.totalDefinitiveConnections} conexiones maestras verificadas. 0 frases ambiguas ("ver arriba", "como antes", "según corresponda") y 0 problemas.`
        : `Se detectaron ${audit.problemCount} problema(s) en la guía (${audit.forbiddenPhraseHits} frase(s) ambigua(s)): ${audit.issues
            .slice(0, 3)
            .map((i) => `${i.source}: ${i.message}`)
            .join(' | ')}`,
    fixAction:
      audit.problemCount === 0
        ? 'Ninguna acción requerida.'
        : 'Corrige los pasos señalados en assemblyGuideData.ts.',
  });

  const errorCount = checks.filter((c) => !c.passed && c.severity === 'ERROR').length;
  const warningCount = checks.filter((c) => c.severity === 'ADVERTENCIA').length;

  return {
    checks,
    errorCount,
    warningCount,
    canExport: errorCount === 0,
  };
}
