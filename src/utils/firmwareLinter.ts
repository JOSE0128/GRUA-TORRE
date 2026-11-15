import { SHIELD_RESERVED_UNO_PINS } from '../data/craneData';
import { CraneProjectJson, LinterFinding } from '../types/crane';

function parsePinNumeric(pinStr: string): number | null {
  const m = pinStr.trim().match(/^D?(\d+)$/i);
  return m ? Number(m[1]) : null;
}

export function lintSingleFirmwareFile(
  filePath: string,
  code: string,
  project: CraneProjectJson,
  targetHint?: 'ESP32' | 'UNO'
): LinterFinding[] {
  const findings: LinterFinding[] = [];
  const codeWithoutBlockComments = code.replace(/\/\*[\s\S]*?\*\//g, (match) =>
    match.replace(/[^\r\n]/g, ' ')
  );
  const lines = codeWithoutBlockComments.split(/\r?\n/);
  const isEsp32 =
    targetHint === 'ESP32' ||
    filePath.includes('esp32') ||
    codeWithoutBlockComments.includes('IRAM_ATTR') ||
    codeWithoutBlockComments.includes('WiFi.h') ||
    codeWithoutBlockComments.includes('WebServer.h');
  const isUno =
    targetHint === 'UNO' ||
    filePath.includes('uno') ||
    codeWithoutBlockComments.includes('AFMotor.h') ||
    codeWithoutBlockComments.includes('SoftwareSerial');

  // 1. Verificar ausencia de delay() bloqueante
  lines.forEach((line, idx) => {
    const clean = line.replace(/\/\/.*$/, '');
    if (/\bdelay\s*\(/.test(clean)) {
      findings.push({
        id: `${filePath}-DELAY-${idx + 1}`,
        file: filePath,
        line: idx + 1,
        severity: 'ERROR',
        ruleId: 'LINT-NO-DELAY',
        title: 'Llamada bloqueante delay() prohibida',
        detail: `Se encontró delay() en la línea ${idx + 1}. Bloquea el botón PARO, los encoders y el protocolo GT-1.0.`,
        fix: 'Reemplaza delay(ms) por un temporizador no bloqueante usando millis() - tiempoInicio >= ms.',
      });
    }
    const dUsMatch = clean.match(/\bdelayMicroseconds\s*\(\s*(\d+)\s*\)/);
    if (dUsMatch && Number(dUsMatch[1]) > 1000) {
      findings.push({
        id: `${filePath}-DELAYUS-${idx + 1}`,
        file: filePath,
        line: idx + 1,
        severity: 'ERROR',
        ruleId: 'LINT-BLOCKING-CALL',
        title: 'delayMicroseconds() superior a 1000 µs',
        detail: `Espera activa de ${dUsMatch[1]} µs detectada; solo se permite ≤ 20 µs para pulso TRIG ultrasonido.`,
        fix: 'Usa millis() para esperas mayores a 1 ms.',
      });
    }
    if (/\bpulseIn\s*\(([^)]+)\)/.test(clean)) {
      const m = clean.match(/\bpulseIn\s*\(([^)]+)\)/);
      const args = m ? m[1].split(',').map((s) => s.trim()) : [];
      if (args.length < 3 || Number(args[2]) > 35000) {
        findings.push({
          id: `${filePath}-PULSEIN-${idx + 1}`,
          file: filePath,
          line: idx + 1,
          severity: 'ERROR',
          ruleId: 'LINT-BLOCKING-CALL',
          title: 'pulseIn() sin timeout corto o bloqueante',
          detail: 'pulseIn() sin timeout máximo bloquea el microcontrolador hasta 1 segundo si falla el eco.',
          fix: 'Usa interrupción ECHO con micros() en ESP32 o timeout ≤ 25000 µs.',
        });
      }
    }
    if (/\bwhile\s*\(\s*(?:true|1)\s*\)/.test(clean)) {
      findings.push({
        id: `${filePath}-WHILE1-${idx + 1}`,
        file: filePath,
        line: idx + 1,
        severity: 'ADVERTENCIA',
        ruleId: 'LINT-BLOCKING-CALL',
        title: 'Bucle while(true) potencialmente bloqueante',
        detail: 'Un bucle infinito congela el watchdog del ESP32 y el paro de emergencia.',
        fix: 'Convierte la lógica en estados dentro de loop() gobernados por millis().',
      });
    }
  });

  // 2. Verificar IRAM_ATTR en todas las ISR de attachInterrupt en ESP32
  if (isEsp32) {
    lines.forEach((line, idx) => {
      const clean = line.replace(/\/\/.*$/, '');
      const m = clean.match(/attachInterrupt\s*\([^,]+,\s*([A-Za-z_][A-Za-z0-9_]*)\s*,/);
      if (m) {
        const fnName = m[1];
        const hasIramAttr = new RegExp(`(?:void\\s+IRAM_ATTR|IRAM_ATTR\\s+void)\\s+${fnName}\\s*\\(`).test(code);
        if (!hasIramAttr) {
          findings.push({
            id: `${filePath}-IRAM-${fnName}-${idx + 1}`,
            file: filePath,
            line: idx + 1,
            severity: 'ERROR',
            ruleId: 'LINT-ISR-IRAM',
            title: `ISR "${fnName}" sin atributo IRAM_ATTR`,
            detail: `En ESP32 todas las rutinas de interrupción deben llevar IRAM_ATTR para evitar Guru Meditation Error durante escritura Flash/WiFi.`,
            fix: `Declara la función como: void IRAM_ATTR ${fnName}() { ... }`,
          });
        }
      }
    });

    // Verificar D12 sin pull-up externa ni INPUT simple sin PULLUP
    lines.forEach((line, idx) => {
      const clean = line.replace(/\/\/.*$/, '');
      if (/pinMode\s*\(\s*(?:PIN_PARO|12)\s*,\s*INPUT\s*\)/.test(clean)) {
        findings.push({
          id: `${filePath}-D12-PULLUP-${idx + 1}`,
          file: filePath,
          line: idx + 1,
          severity: 'ERROR',
          ruleId: 'LINT-D12-EXTERNAL-R',
          title: 'Pin D12 (PARO) configurado como INPUT sin INPUT_PULLUP',
          detail: 'D12 no debe llevar resistencia externa de pull-up (bloquea el arranque del ESP32), por lo que requiere INPUT_PULLUP interno.',
          fix: 'Usa pinMode(PIN_PARO, INPUT_PULLUP); y confirma que no hay resistencia externa en D12.',
        });
      }
    });

    // Verificar tope de 2 motores simultáneos en config o código
    const maxMotMatch = code.match(/#define\s+MAX_MOTORES_SIMULTANEOS\s+(\d+)/);
    if (maxMotMatch && Number(maxMotMatch[1]) > 2) {
      findings.push({
        id: `${filePath}-MAXMOT`,
        file: filePath,
        line: 1,
        severity: 'ERROR',
        ruleId: 'LINT-MAX-2-MOTORS',
        title: 'Límite de motores simultáneos mayor a 2',
        detail: `MAX_MOTORES_SIMULTANEOS vale ${maxMotMatch[1]}, superando el presupuesto de 2 A de la fuente de 12 V.`,
        fix: 'Fija #define MAX_MOTORES_SIMULTANEOS 2.',
      });
    }

    // Verificar coincidencia de pines contra project.json cuando exista config.h / #define PIN_
    const pinDefineMap: Record<string, string> = {
      PIN_CAB_ENA: 'PA01',
      PIN_CAB_IN1: 'PA02',
      PIN_CAB_IN2: 'PA03',
      PIN_GIRO_ENB: 'PA04',
      PIN_GIRO_IN3: 'PA05',
      PIN_GIRO_IN4: 'PA06',
      PIN_ENC_GIRO: 'PA07',
      PIN_ENC_CARRO: 'PA08',
      PIN_ENC_GANCHO: 'PA09',
      PIN_HALL: 'PA10',
      PIN_HOME: 'PA11',
      PIN_POT1: 'PA12',
      PIN_PARO: 'PA13',
      PIN_USH_TRIG: 'PA14',
      PIN_USH_ECHO: 'PA15',
      PIN_USV_TRIG: 'PA16',
      PIN_USV_ECHO: 'PA17',
      PIN_UART_TX: 'PA20',
      PIN_UART_RX: 'PA21',
    };
    lines.forEach((line, idx) => {
      const m = line.match(/^\s*#define\s+(PIN_[A-Z0-9_]+)\s+(\d+)/);
      if (m && pinDefineMap[m[1]]) {
        const pa = project.pins.find((p) => p.id === pinDefineMap[m[1]]);
        const expectedNum = pa ? parsePinNumeric(pa.pin) : null;
        if (expectedNum !== null && Number(m[2]) !== expectedNum) {
          findings.push({
            id: `${filePath}-PINMISMATCH-${m[1]}-${idx + 1}`,
            file: filePath,
            line: idx + 1,
            severity: 'ERROR',
            ruleId: 'LINT-PIN-MISMATCH',
            title: `Pin ${m[1]} no coincide con project.json`,
            detail: `El código define ${m[1]} = ${m[2]}, pero project.json asigna ${pa?.pin} (${pa?.componentLabel}).`,
            fix: `Cambia #define ${m[1]} ${expectedNum} o actualiza el pin en project.json y regenera el código.`,
          });
        }
      }
    });
  }

  // 3. Verificar pines reservados del Shield L293D en UNO
  if (isUno) {
    lines.forEach((line, idx) => {
      const clean = line.replace(/\/\/.*$/, '');
      const defMatch = clean.match(/^\s*#define\s+PIN_[A-Z0-9_]+\s+(\d+)/);
      const callMatch = clean.match(/\b(?:pinMode|digitalWrite|digitalRead)\s*\(\s*(\d+)\b/);
      const matchedNum = defMatch?.[1] ?? callMatch?.[1];
      if (matchedNum) {
        const pinCode = `D${matchedNum}`;
        if (SHIELD_RESERVED_UNO_PINS.includes(pinCode)) {
          findings.push({
            id: `${filePath}-SHIELD-${pinCode}-${idx + 1}`,
            file: filePath,
            line: idx + 1,
            severity: 'ERROR',
            ruleId: 'LINT-UNO-SHIELD-RESERVED',
            title: `Pin ${pinCode} reservado por Shield L293D`,
            detail: `Los pines D3–D8, D11 y D12 pertenecen internamente al Shield L293D en el Arduino UNO.`,
            fix: 'Reasigna la señal a uno de los pines libres del UNO: A0–A5, D2, D9, D10 o D13.',
          });
        }
      }
    });
  }

  // 4. Reglas globales derivadas de project.json (5V sin divisor en ESP32 / R externa en D12 / Shield en project.json)
  if (filePath.endsWith('config.h') || targetHint) {
    for (const pa of project.pins) {
      if (pa.controller === 'ESP32' && pa.sourceVoltage === '5V' && !pa.usesDivider) {
        findings.push({
          id: `${filePath}-5VNODIV-${pa.id}`,
          file: filePath,
          line: 1,
          severity: 'ERROR',
          ruleId: 'LINT-5V-NO-DIVIDER',
          title: `Señal de 5 V sin divisor en ESP32 (${pa.pin})`,
          detail: `${pa.componentLabel} indica 5 V directos hacia ESP32 ${pa.pin} sin divisor 1 kΩ + 2 kΩ.`,
          fix: 'Activa el divisor de tensión en el Diseñador o usa un pin con divisor conectado.',
        });
      }
      if (pa.controller === 'ESP32' && pa.pin === 'D12' && pa.hasExternalResistor) {
        findings.push({
          id: `${filePath}-D12EXT-${pa.id}`,
          file: filePath,
          line: 1,
          severity: 'ERROR',
          ruleId: 'LINT-D12-EXTERNAL-R',
          title: 'Resistencia externa prohibida en ESP32 D12',
          detail: 'D12 (MTDI) es pin de arranque; colocar una resistencia externa hacia 3,3 V impide el booteo normal.',
          fix: 'Desmarca hasExternalResistor en PA13 y usa solo pull-up interna.',
        });
      }
      if (
        pa.controller === 'UNO' &&
        pa.pin
          .split('/')
          .map((s) => s.trim())
          .some((p) => SHIELD_RESERVED_UNO_PINS.includes(p))
      ) {
        findings.push({
          id: `${filePath}-UNOSH-${pa.id}`,
          file: filePath,
          line: 1,
          severity: 'ERROR',
          ruleId: 'LINT-UNO-SHIELD-RESERVED',
          title: `Pin UNO ${pa.pin} reservado por Shield L293D`,
          detail: `${pa.componentLabel} en project.json invade el rango D3–D8, D11 o D12 del Shield.`,
          fix: 'Reasigna a A0–A5, D2, D9, D10 o D13.',
        });
      }
    }
  }

  return findings;
}

export function lintFirmwareBundle(
  files: { path: string; content: string }[],
  project: CraneProjectJson
): LinterFinding[] {
  const all: LinterFinding[] = [];
  const seen = new Set<string>();
  for (const f of files) {
    if (!f.path.endsWith('.ino') && !f.path.endsWith('.h')) continue;
    if (f.path.endsWith('panel_web.h') || f.path.endsWith('errores.h')) continue;
    const found = lintSingleFirmwareFile(f.path, f.content, project);
    for (const item of found) {
      const key = `${item.ruleId}:${item.file}:${item.line}:${item.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        all.push(item);
      }
    }
  }
  return all;
}
