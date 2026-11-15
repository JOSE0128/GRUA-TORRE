import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  Film,
  Layers,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DEFINITIVE_CONNECTIONS } from '../data/craneData';
import { WireConnection } from '../types/crane';

type WorkbenchMode = 'simulation' | 'static';
type SimulationGranularity = 'connection' | 'stage';

interface Point {
  x: number;
  y: number;
}

interface ModuleBox {
  id: string;
  label: string;
  zone: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const CANVAS_W = 1800;
const CANVAS_H = 1100;

const STAGE_META: { id: WireConnection['stage']; title: string; short: string }[] = [
  { id: 'E1', title: 'E1. Alimentación 12 V / 5 V / 3,3 V y Masa Común R1', short: 'E1 Potencia/R1' },
  { id: 'E2', title: 'E2. Driver L298N ↔ ESP32 (Cabrestante y Giro)', short: 'E2 L298N' },
  { id: 'E3', title: 'E3. Interfaz ESP32 (OLED A/B, Pot 1 y PARO)', short: 'E3 ESP32 UI' },
  { id: 'E4', title: 'E4. Interfaz Arduino UNO (LCD, Pot 2, Botones, Buzzers, Kit LED)', short: 'E4 UNO UI' },
  { id: 'E5', title: 'E5. Enlace UART ESP32 ↔ UNO (Divisor #3 + Jumper Desmontable)', short: 'E5 UART' },
  { id: 'E6', title: 'E6. Sensores Z3–Z6 (3×FC-33, US-H, US-V, Hall KY-003 y HOME)', short: 'E6 Sensores' },
  { id: 'E7', title: 'E7. Salidas de Potencia a Motores (Tramo A en Mástil Z2)', short: 'E7 Motores' },
  { id: 'E8', title: 'E8. Electroimán Z6 (Tramo B) y Bombillo Corona Z8', short: 'E8 Imán/Luz' },
];

const WIRE_COLOR_FILTERS = [
  { id: 'ALL', label: 'Todos los colores', hex: '#94a3b8' },
  { id: 'Rojo', label: 'Rojo (+5 V)', hex: '#ef4444' },
  { id: 'Naranja', label: 'Naranja (+3,3 V / +12 V)', hex: '#f97316' },
  { id: 'Negro', label: 'Negro (GND)', hex: '#1e293b' },
  { id: 'Azul', label: 'Azul (Señal)', hex: '#3b82f6' },
  { id: 'Verde', label: 'Verde (PWM / Potencia)', hex: '#22c55e' },
  { id: 'Amarillo', label: 'Amarillo (I2C / UART)', hex: '#eab308' },
] as const;

const MODULE_BOXES: ModuleBox[] = [
  { id: 'fuente-12v', label: 'Fuente 12 V 2 A', zone: 'Z1', x: 45, y: 42, w: 170, h: 102 },
  { id: 'interruptor-gral', label: 'Interruptor General', zone: 'Z1', x: 255, y: 50, w: 128, h: 86 },
  { id: 'fuente-5v', label: 'Fuente 5 V 3 A', zone: 'Z1', x: 45, y: 176, w: 170, h: 102 },
  { id: 'kit-led-sonido', label: 'Kit LED por Sonido', zone: 'Z1', x: 255, y: 182, w: 145, h: 90 },
  { id: 'protoboards', label: 'Protoboards P1 y P2 (830 pts)', zone: 'Z1', x: 52, y: 338, w: 696, h: 396 },
  { id: 'esp32', label: 'ESP32 DevKit V1 (30 pines)', zone: 'Z1', x: 830, y: 46, w: 252, h: 382 },
  { id: 'l298n', label: 'Puente H L298N', zone: 'Z1', x: 1128, y: 52, w: 220, h: 230 },
  { id: 'arduino-uno', label: 'Arduino UNO + Shield L293D', zone: 'Z1', x: 860, y: 492, w: 344, h: 298 },
  { id: 'shield-l293d', label: 'Shield L293D (sobre UNO)', zone: 'Z1', x: 860, y: 492, w: 344, h: 298 },
  { id: 'oled-a', label: 'OLED A (0x3C)', zone: 'Z1 Tapa', x: 52, y: 785, w: 142, h: 112 },
  { id: 'oled-b', label: 'OLED B (0x3C)', zone: 'Z1 Tapa', x: 214, y: 785, w: 142, h: 112 },
  { id: 'lcd-1602', label: 'LCD 1602 I2C', zone: 'Z1 Tapa', x: 376, y: 785, w: 226, h: 112 },
  { id: 'pot-1', label: 'Potenciómetro 1 (10 kΩ)', zone: 'Z1 Tapa', x: 620, y: 788, w: 96, h: 106 },
  { id: 'pot-2', label: 'Potenciómetro 2 (10 kΩ)', zone: 'Z1 Tapa', x: 734, y: 788, w: 96, h: 106 },
  { id: 'pulsadores', label: 'Pulsadores (PARO, A, B, HOME)', zone: 'Z1/Z3', x: 52, y: 942, w: 375, h: 98 },
  { id: 'buzzers', label: '3 × Buzzers KY-012', zone: 'Z1', x: 454, y: 942, w: 350, h: 98 },
  { id: 'motor-cabrestante', label: 'Motor Cabrestante (12 V)', zone: 'Z3', x: 1440, y: 42, w: 292, h: 104 },
  { id: 'motor-giro', label: 'Motor Giro GA25-370 (12 V)', zone: 'Z3', x: 1440, y: 170, w: 292, h: 100 },
  { id: 'motor-carro', label: 'Motor Carro JGB37-520', zone: 'Z3', x: 1440, y: 294, w: 292, h: 100 },
  { id: 'electroiman', label: 'Electroimán 12 V (POR COMPRAR)', zone: 'Z6', x: 1440, y: 418, w: 292, h: 96 },
  { id: 'bombillo-corona', label: 'Bombillo Corona Z8', zone: 'Z8', x: 1440, y: 538, w: 292, h: 92 },
  { id: 'fc33-giro', label: 'FC-33 #1 Giro', zone: 'Z3', x: 1440, y: 652, w: 292, h: 52 },
  { id: 'fc33-carro', label: 'FC-33 #2 Carro', zone: 'Z3', x: 1440, y: 708, w: 292, h: 52 },
  { id: 'fc33-gancho', label: 'FC-33 #3 Gancho', zone: 'Z3', x: 1440, y: 764, w: 292, h: 52 },
  { id: 'us-h', label: 'Ultrasónico US-H', zone: 'Z3', x: 1440, y: 840, w: 140, h: 106 },
  { id: 'us-v', label: 'Ultrasónico US-V', zone: 'Z6', x: 1592, y: 840, w: 140, h: 106 },
  { id: 'hall-ky003', label: 'Hall KY-003', zone: 'Z5', x: 1440, y: 968, w: 140, h: 94 },
];

function getWireHex(wireColor: string): { stroke: string; glow: string; label: string } {
  if (wireColor.startsWith('Rojo')) return { stroke: '#ef4444', glow: '#fca5a5', label: 'Rojo' };
  if (wireColor.startsWith('Naranja')) return { stroke: '#f97316', glow: '#fdba74', label: 'Naranja' };
  if (wireColor.startsWith('Negro')) return { stroke: '#1e293b', glow: '#94a3b8', label: 'Negro' };
  if (wireColor.startsWith('Azul')) return { stroke: '#3b82f6', glow: '#93c5fd', label: 'Azul' };
  if (wireColor.startsWith('Verde')) return { stroke: '#22c55e', glow: '#86efac', label: 'Verde' };
  if (wireColor.startsWith('Amarillo')) return { stroke: '#eab308', glow: '#fde047', label: 'Amarillo' };
  return { stroke: '#38bdf8', glow: '#bae6fd', label: 'Otro' };
}

function p2ColX(col: number): number {
  return 80 + (col - 1) * 10.2;
}

function p2RowY(row: 'a' | 'b' | 'c' | 'd' | 'e'): number {
  const idx = { a: 0, b: 1, c: 2, d: 3, e: 4 }[row];
  return 596 + idx * 11;
}

function resolveBreadboardCoord(coordPin: string): Point | null {
  const match = coordPin.match(/\((\d+),\s*([a-e])\)/i);
  if (!match) return null;
  const col = parseInt(match[1], 10);
  const row = match[2].toLowerCase() as 'a' | 'b' | 'c' | 'd' | 'e';
  return { x: p2ColX(col), y: p2RowY(row) };
}

function esp32LeftY(idx: number): number {
  return 100 + idx * 21;
}

function esp32RightY(idx: number): number {
  return 100 + idx * 21;
}

// Left pins 0..14: 3V3_NC(top? no, standard 30-pin: EN, VP(36), VN(39), 34, 35, 32, 33, 25, 26, 27, 14, 12, GND, 13, VIN)
const ESP32_LEFT_PINS = [
  'EN',
  'D36',
  'D39',
  'D34',
  'D35',
  'D32',
  'D33',
  'D25',
  'D26',
  'D27',
  'D14',
  'D12',
  'GND',
  'D13',
  'VIN',
];

// Right pins 0..14: 3V3, D15, D2, D4, D16, D17, D5, D18, D19, GND2, D21, RX0, TX0, D22, D23 (top->bottom mirrored or top D23->bottom 3V3)
const ESP32_RIGHT_PINS = [
  'D23',
  'D22',
  'TX0',
  'RX0',
  'D21',
  'GND2',
  'D19',
  'D18',
  'D5',
  'D17',
  'D16',
  'D4',
  'D2',
  'D15',
  '3V3',
];

function resolvePinPoint(
  compId: string,
  compName: string,
  pin: string,
  connId: string,
  role: 'from' | 'to'
): Point {
  const idxNum = parseInt(connId.replace(/\D/g, ''), 10) || 1;

  // Protoboards P1 & P2
  if (compId === 'protoboards') {
    const coord = resolveBreadboardCoord(pin);
    if (coord) return coord;

    const isP2 =
      compName.includes('P2') ||
      pin.includes('R3') ||
      connId === 'C12' ||
      connId === 'C13' ||
      connId === 'C22' ||
      connId === 'C23' ||
      connId === 'C26' ||
      connId === 'C27' ||
      connId === 'C30' ||
      connId === 'C32' ||
      connId === 'C34' ||
      connId === 'C55' ||
      connId === 'C60' ||
      connId === 'C61' ||
      connId === 'C62' ||
      connId === 'C64' ||
      connId === 'C65' ||
      connId === 'C67' ||
      connId === 'C68' ||
      connId === 'C75' ||
      connId === 'C81' ||
      connId === 'C86' ||
      connId === 'C87' ||
      connId === 'C90';

    // Spread rail tap X nicely based on connection index so multiple wires don't overlap on the exact same hole
    const spreadX = 95 + ((idxNum * 37) % 610);

    if (pin.includes('R3')) {
      if (connId === 'C13') return { x: 706, y: 716 };
      if (connId === 'C87') return { x: p2ColX(53), y: 716 };
      return { x: spreadX, y: 716 };
    }
    if (pin.includes('R2')) {
      if (connId === 'C05') return { x: 94, y: 486 };
      if (connId === 'C11') return { x: 694, y: 486 };
      if (connId === 'C14') return { x: 660, y: 486 };
      return { x: spreadX, y: 486 };
    }
    // R1 GND
    if (isP2) {
      if (connId === 'C07') return { x: 86, y: 562 };
      if (connId === 'C12') return { x: 714, y: 562 };
      if (connId === 'C75') return { x: p2ColX(14), y: 562 };
      if (connId === 'C81') return { x: p2ColX(26), y: 562 };
      if (connId === 'C60') return { x: p2ColX(38), y: 562 };
      if (connId === 'C86') return { x: p2ColX(50), y: 562 };
      return { x: spreadX, y: 562 };
    } else {
      if (connId === 'C07') return { x: 86, y: 356 };
      if (connId === 'C04' || connId === 'C06') return { x: 108 + (connId === 'C06' ? 22 : 0), y: 356 };
      return { x: spreadX, y: 356 };
    }
  }

  // Power & switch
  if (compId === 'fuente-12v') {
    return pin.includes('+') ? { x: 214, y: 76 } : { x: 214, y: 112 };
  }
  if (compId === 'interruptor-gral') {
    return pin.includes('1') ? { x: 256, y: 76 } : { x: 382, y: 92 };
  }
  if (compId === 'fuente-5v') {
    return pin.includes('+') ? { x: 214, y: 210 } : { x: 214, y: 246 };
  }
  if (compId === 'kit-led-sonido') {
    return pin.includes('+') ? { x: 398, y: 212 } : { x: 398, y: 244 };
  }

  // ESP32
  if (compId === 'esp32') {
    const clean = pin.replace(/\s*\(.*?\)/g, '').replace(/\s+(TX|RX)/gi, '').trim();
    const lIdx = ESP32_LEFT_PINS.indexOf(clean);
    if (lIdx >= 0) return { x: 838, y: esp32LeftY(lIdx) };
    const rIdx = ESP32_RIGHT_PINS.indexOf(clean);
    if (rIdx >= 0) return { x: 1074, y: esp32RightY(rIdx) };
    return { x: 956, y: 240 };
  }

  // L298N
  if (compId === 'l298n') {
    if (pin.includes('12V')) return { x: 1164, y: 266 };
    if (pin.includes('GND')) return { x: 1192, y: 266 };
    if (pin.includes('5V')) return { x: 1220, y: 266 };
    if (pin === 'ENA') return { x: 1248, y: 266 };
    if (pin === 'IN1') return { x: 1265, y: 266 };
    if (pin === 'IN2') return { x: 1282, y: 266 };
    if (pin === 'IN3') return { x: 1299, y: 266 };
    if (pin === 'IN4') return { x: 1316, y: 266 };
    if (pin === 'ENB') return { x: 1333, y: 266 };
    if (pin.includes('OUT1')) return { x: 1344, y: 104 };
    if (pin.includes('OUT3')) return { x: 1344, y: 184 };
    return { x: 1238, y: 165 };
  }

  // UNO + Shield
  if (compId === 'shield-l293d') {
    if (pin.includes('+M')) return { x: 876, y: 540 };
    if (pin.includes('GND')) return { x: 876, y: 568 };
    if (pin === 'M1') return { x: 1194, y: 554 };
    if (pin === 'M2') return { x: 1194, y: 614 };
    if (pin === 'M3') return { x: 1194, y: 674 };
    return { x: 1194, y: 734 };
  }

  if (compId === 'arduino-uno') {
    if (pin === '5V') return { x: 912, y: 774 };
    if (pin === 'GND') return { x: 934, y: 774 };
    if (pin.startsWith('A0')) return { x: 984, y: 774 };
    if (pin.startsWith('A1')) return { x: 1006, y: 774 };
    if (pin === 'A2') return { x: 1028, y: 774 };
    if (pin === 'A3') return { x: 1050, y: 774 };
    if (pin === 'A4') return { x: 1072, y: 774 };
    if (pin === 'A5') return { x: 1094, y: 774 };
    if (pin === 'D13') return { x: 996, y: 508 };
    if (pin === 'D10') return { x: 1044, y: 508 };
    if (pin === 'D9') return { x: 1068, y: 508 };
    if (pin === 'D2') return { x: 1152, y: 508 };
    return { x: 1030, y: 640 };
  }

  // Z1 UI
  if (compId === 'oled-a') {
    if (pin === 'GND') return { x: 80, y: 886 };
    if (pin === 'VCC') return { x: 104, y: 886 };
    if (pin === 'SCL') return { x: 128, y: 886 };
    return { x: 152, y: 886 }; // SDA
  }
  if (compId === 'oled-b') {
    if (pin === 'GND') return { x: 242, y: 886 };
    if (pin === 'VCC') return { x: 266, y: 886 };
    if (pin === 'SCL') return { x: 290, y: 886 };
    return { x: 314, y: 886 }; // SDA
  }
  if (compId === 'lcd-1602') {
    if (pin === 'GND') return { x: 386, y: 816 };
    if (pin === 'VCC') return { x: 386, y: 836 };
    if (pin === 'SDA') return { x: 386, y: 856 };
    return { x: 386, y: 876 }; // SCL
  }
  if (compId === 'pot-1') {
    if (pin === 'VCC') return { x: 642, y: 884 };
    if (pin === 'OUT') return { x: 668, y: 884 };
    return { x: 694, y: 884 };
  }
  if (compId === 'pot-2') {
    if (pin === 'VCC') return { x: 756, y: 884 };
    if (pin === 'OUT') return { x: 782, y: 884 };
    return { x: 808, y: 884 };
  }

  if (compId === 'pulsadores') {
    if (compName.includes('HOME')) {
      return pin.includes('1') ? { x: 1600, y: 996 } : { x: 1600, y: 1028 };
    }
    if (compName.includes('PARO')) {
      return pin.includes('1') ? { x: 82, y: 952 } : { x: 132, y: 952 };
    }
    if (compName.includes('A')) {
      return pin.includes('1') ? { x: 212, y: 952 } : { x: 262, y: 952 };
    }
    // Botón B
    return pin.includes('1') ? { x: 342, y: 952 } : { x: 392, y: 952 };
  }

  if (compId === 'buzzers') {
    const base = compName.includes('1') ? 478 : compName.includes('2') ? 598 : 718;
    if (pin === '+') return { x: base, y: 952 };
    if (pin === '-') return { x: base + 27, y: 952 };
    return { x: base + 54, y: 952 };
  }

  // Crane Z3-Z8 actuators & sensors
  if (compId === 'motor-cabrestante') return { x: 1446, y: 86 };
  if (compId === 'motor-giro') return { x: 1446, y: 212 };
  if (compId === 'motor-carro') return { x: 1446, y: 336 };
  if (compId === 'electroiman') return { x: 1446, y: 458 };
  if (compId === 'bombillo-corona') return { x: 1446, y: 576 };

  if (compId === 'fc33-giro') {
    if (pin === 'VCC') return { x: 1446, y: 666 };
    if (pin === 'GND') return { x: 1446, y: 678 };
    return { x: 1446, y: 690 };
  }
  if (compId === 'fc33-carro') {
    if (pin === 'VCC') return { x: 1446, y: 722 };
    if (pin === 'GND') return { x: 1446, y: 734 };
    return { x: 1446, y: 746 };
  }
  if (compId === 'fc33-gancho') {
    if (pin === 'VCC') return { x: 1446, y: 778 };
    if (pin === 'GND') return { x: 1446, y: 790 };
    return { x: 1446, y: 802 };
  }
  if (compId === 'us-h') {
    if (pin === 'VCC') return { x: 1460, y: 936 };
    if (pin === 'TRIG') return { x: 1492, y: 936 };
    if (pin === 'ECHO') return { x: 1524, y: 936 };
    return { x: 1556, y: 936 };
  }
  if (compId === 'us-v') {
    if (pin === 'VCC') return { x: 1612, y: 936 };
    if (pin === 'TRIG') return { x: 1644, y: 936 };
    if (pin === 'ECHO') return { x: 1676, y: 936 };
    return { x: 1708, y: 936 };
  }
  if (compId === 'hall-ky003') {
    if (pin === '+') return { x: 1460, y: 980 };
    if (pin === '-') return { x: 1498, y: 980 };
    return { x: 1536, y: 980 };
  }

  return role === 'from' ? { x: 400, y: 400 } : { x: 800, y: 400 };
}

function pointsToRoundedSvgPath(pts: Point[], radius = 9): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    if (len1 < 0.5 || len2 < 0.5) continue;
    const r = Math.min(radius, len1 / 2, len2 / 2);
    const p1x = curr.x - (v1x / len1) * r;
    const p1y = curr.y - (v1y / len1) * r;
    const p2x = curr.x + (v2x / len2) * r;
    const p2y = curr.y + (v2y / len2) * r;
    d += ` L ${p1x.toFixed(1)} ${p1y.toFixed(1)} Q ${curr.x} ${curr.y} ${p2x.toFixed(1)} ${p2y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function buildOrthogonalPath(
  from: Point,
  to: Point,
  conn: WireConnection,
  laneOffset: number
): string {
  const isMastWire =
    conn.toComponentId.startsWith('motor-') ||
    conn.toComponentId.startsWith('fc33-') ||
    conn.toComponentId.startsWith('us-') ||
    conn.toComponentId === 'electroiman' ||
    conn.toComponentId === 'bombillo-corona' ||
    conn.toComponentId === 'hall-ky003' ||
    conn.fromComponentId.startsWith('us-') ||
    conn.fromComponentId.startsWith('fc33-') ||
    conn.fromComponentId === 'hall-ky003' ||
    conn.toComponentName.includes('HOME') ||
    conn.fromComponentName.includes('HOME');

  // Mast harness spine channel (x ~ 1378..1416) so Tramo A looks cleanly bundled
  if (isMastWire) {
    const spineX = 1380 + ((laneOffset * 3) % 34);
    const midY = 456 + ((laneOffset * 7) % 30) - 15;
    // If both endpoints are in Z3..Z8 or one is on the left
    const pts: Point[] = [];
    if (from.x < 1380 && to.x > 1380) {
      // Goes left -> mast spine -> right
      const exitY = from.y > 750 ? from.y + 18 : from.y < 320 ? from.y - 12 : midY;
      if (Math.abs(from.y - exitY) > 3) {
        pts.push(from, { x: from.x, y: exitY }, { x: spineX, y: exitY }, { x: spineX, y: to.y }, to);
      } else {
        pts.push(from, { x: spineX, y: from.y }, { x: spineX, y: to.y }, to);
      }
      return pointsToRoundedSvgPath(pts);
    }
    if (from.x > 1380 && to.x < 1380) {
      const enterY = to.y > 750 ? to.y + 18 : midY;
      pts.push(from, { x: spineX, y: from.y }, { x: spineX, y: enterY }, { x: to.x, y: enterY }, to);
      return pointsToRoundedSvgPath(pts);
    }
  }

  // Standard Z1 orthogonal routing with lane offsets
  const corridorShift = ((laneOffset % 9) - 4) * 5;

  // ESP32 <-> L298N
  if (
    (conn.fromComponentId === 'esp32' && conn.toComponentId === 'l298n') ||
    (conn.fromComponentId === 'l298n' && conn.toComponentId === 'esp32')
  ) {
    const busY = 446 + (laneOffset % 6) * 6;
    return pointsToRoundedSvgPath([
      from,
      { x: from.x < 950 ? 804 + corridorShift : 1102 + corridorShift, y: from.y },
      { x: from.x < 950 ? 804 + corridorShift : 1102 + corridorShift, y: busY },
      { x: to.x, y: busY },
      to,
    ]);
  }

  // Direct horizontal or vertical with 1 or 2 clean elbows
  const dx = Math.abs(to.x - from.x);
  const dy = Math.abs(to.y - from.y);

  if (dx < 14) {
    return pointsToRoundedSvgPath([from, { x: from.x, y: to.y }, to]);
  }
  if (dy < 14) {
    return pointsToRoundedSvgPath([from, { x: to.x, y: from.y }, to]);
  }

  // Route through the horizontal channel between protoboards & Z1 UI (y ~ 754) or P1/P2 gap (y ~ 525)
  if (from.y > 760 || to.y > 760) {
    const channelY = from.y > 900 || to.y > 900 ? 918 + (laneOffset % 5) * 4 : 750 + (laneOffset % 6) * 5;
    if (from.x > 800 && to.x < 835) {
      const bridgeX = 816 + corridorShift;
      return pointsToRoundedSvgPath([
        from,
        { x: bridgeX, y: from.y },
        { x: bridgeX, y: channelY },
        { x: to.x, y: channelY },
        to,
      ]);
    }
    return pointsToRoundedSvgPath([
      from,
      { x: from.x, y: channelY },
      { x: to.x, y: channelY },
      to,
    ]);
  }

  // General clean orthogonal Z-bend
  const midX = Math.round((from.x + to.x) / 2) + corridorShift;
  return pointsToRoundedSvgPath([from, { x: midX, y: from.y }, { x: midX, y: to.y }, to]);
}

interface ResolvedWire {
  conn: WireConnection;
  from: Point;
  to: Point;
  pathD: string;
  secondaryPathD?: string; // Para pares de potencia de 2 hilos (M1, M2, M3, OUT1/2, OUT3/4)
  color: { stroke: string; glow: string; label: string };
}

export const WorkbenchWiringPlan: React.FC = () => {
  const [mode, setMode] = useState<WorkbenchMode>('simulation');
  const [granularity, setGranularity] = useState<SimulationGranularity>('connection');
  const [stepIndex, setStepIndex] = useState<number>(0); // 0..94 (connection) or 0..7 (stage)
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [autoCamera, setAutoCamera] = useState<boolean>(true);

  // Static mode & filters
  const [stageFilter, setStageFilter] = useState<'ALL' | WireConnection['stage']>('ALL');
  const [colorFilter, setColorFilter] = useState<string>('ALL');
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  // Manual Pan / Zoom (used in static mode or when autoCamera is off)
  const [manualZoom, setManualZoom] = useState<number>(1);
  const [manualPan, setManualPan] = useState<Point>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  const resolvedWires: ResolvedWire[] = useMemo(() => {
    return DEFINITIVE_CONNECTIONS.map((conn, idx) => {
      const from = resolvePinPoint(
        conn.fromComponentId,
        conn.fromComponentName,
        conn.fromPin,
        conn.id,
        'from'
      );
      const to = resolvePinPoint(
        conn.toComponentId,
        conn.toComponentName,
        conn.toPin,
        conn.id,
        'to'
      );
      const pathD = buildOrthogonalPath(from, to, conn, idx);

      // Pair second wire for twin power cables C91..C95
      const isTwinPower = ['C91', 'C92', 'C93', 'C94', 'C95'].includes(conn.id);
      const secondaryPathD = isTwinPower
        ? buildOrthogonalPath(
            { x: from.x, y: from.y + 14 },
            { x: to.x, y: to.y + 18 },
            conn,
            idx + 1
          )
        : undefined;

      return {
        conn,
        from,
        to,
        pathD,
        secondaryPathD,
        color: getWireHex(conn.wireColor),
      };
    });
  }, []);

  // Filtered connections when user filters by stage in simulation or static
  const activeStageSimItems = useMemo(() => {
    if (stageFilter === 'ALL') return resolvedWires;
    return resolvedWires.filter((w) => w.conn.stage === stageFilter);
  }, [resolvedWires, stageFilter]);

  const maxSimSteps =
    granularity === 'connection'
      ? Math.max(0, activeStageSimItems.length - 1)
      : STAGE_META.length - 1;

  // Clamp stepIndex when filter or granularity switches
  useEffect(() => {
    if (stepIndex > maxSimSteps) {
      setStepIndex(maxSimSteps);
    }
  }, [maxSimSteps, stepIndex]);

  // Playback timer
  useEffect(() => {
    if (mode !== 'simulation' || !isPlaying) return;
    const baseMs = granularity === 'connection' ? 1850 : 3200;
    const intervalMs = Math.round(baseMs / speed);
    const timer = window.setInterval(() => {
      setStepIndex((prev) => {
        if (prev >= maxSimSteps) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [mode, isPlaying, speed, granularity, maxSimSteps]);

  // Active simulation slice
  const activeConnectionWire: ResolvedWire | null = useMemo(() => {
    if (mode !== 'simulation') return null;
    if (granularity === 'connection') {
      return activeStageSimItems[stepIndex] || activeStageSimItems[0] || null;
    }
    const stageId = STAGE_META[stepIndex]?.id || 'E1';
    const stageWires = resolvedWires.filter((w) => w.conn.stage === stageId);
    return stageWires[0] || null;
  }, [mode, granularity, stepIndex, activeStageSimItems, resolvedWires]);

  const currentStageId =
    granularity === 'stage'
      ? STAGE_META[stepIndex]?.id || 'E1'
      : activeConnectionWire?.conn.stage || 'E1';

  // Camera transform calculation
  const cameraStyle = useMemo(() => {
    if (mode === 'simulation' && autoCamera) {
      let minX = 0;
      let maxX = CANVAS_W;
      let minY = 0;
      let maxY = CANVAS_H;

      if (granularity === 'connection' && activeConnectionWire) {
        minX = Math.min(activeConnectionWire.from.x, activeConnectionWire.to.x);
        maxX = Math.max(activeConnectionWire.from.x, activeConnectionWire.to.x);
        minY = Math.min(activeConnectionWire.from.y, activeConnectionWire.to.y);
        maxY = Math.max(activeConnectionWire.from.y, activeConnectionWire.to.y);
      } else {
        const stageWires = resolvedWires.filter((w) => w.conn.stage === currentStageId);
        if (stageWires.length > 0) {
          minX = Math.min(...stageWires.flatMap((w) => [w.from.x, w.to.x]));
          maxX = Math.max(...stageWires.flatMap((w) => [w.from.x, w.to.x]));
          minY = Math.min(...stageWires.flatMap((w) => [w.from.y, w.to.y]));
          maxY = Math.max(...stageWires.flatMap((w) => [w.from.y, w.to.y]));
        }
      }

      const padX = 240;
      const padY = 170;
      const boxW = Math.max(460, maxX - minX + padX * 2);
      const boxH = Math.max(300, maxY - minY + padY * 2);
      const scale = Math.min(2.25, Math.max(1.0, Math.min(CANVAS_W / boxW, CANVAS_H / boxH)));

      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      // Percent translate from center (50%, 50%) -> keep clamped within canvas bounds
      const rawTxPct = ((CANVAS_W / 2 - cx) / CANVAS_W) * 100;
      const rawTyPct = ((CANVAS_H / 2 - cy) / CANVAS_H) * 100;
      const maxOffsetPct = ((scale - 1) / (2 * scale)) * 100;
      const clampedTxPct = Math.max(-maxOffsetPct, Math.min(maxOffsetPct, rawTxPct));
      const clampedTyPct = Math.max(-maxOffsetPct, Math.min(maxOffsetPct, rawTyPct));

      return {
        transform: `scale(${scale.toFixed(3)}) translate(${clampedTxPct.toFixed(2)}%, ${clampedTyPct.toFixed(2)}%)`,
        transition: 'transform 680ms cubic-bezier(0.22, 1, 0.36, 1)',
      };
    }

    return {
      transform: `translate(${manualPan.x}px, ${manualPan.y}px) scale(${manualZoom})`,
      transition: isDragging ? 'none' : 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)',
    };
  }, [
    mode,
    autoCamera,
    granularity,
    activeConnectionWire,
    resolvedWires,
    currentStageId,
    manualPan,
    manualZoom,
    isDragging,
  ]);

  // Static mode filtered wires
  const staticVisibleWires = useMemo(() => {
    return resolvedWires.filter((w) => {
      if (stageFilter !== 'ALL' && w.conn.stage !== stageFilter) return false;
      if (colorFilter !== 'ALL' && w.color.label !== colorFilter) return false;
      return true;
    });
  }, [resolvedWires, stageFilter, colorFilter]);

  const inspectedModule = MODULE_BOXES.find((m) => m.id === selectedModuleId) || null;
  const inspectedWire = resolvedWires.find((w) => w.conn.id === selectedWireId) || null;
  const inspectedModuleConnections = useMemo(() => {
    if (!selectedModuleId) return [];
    return DEFINITIVE_CONNECTIONS.filter(
      (c) => c.fromComponentId === selectedModuleId || c.toComponentId === selectedModuleId
    );
  }, [selectedModuleId]);

  const handleRestartSim = () => {
    setStepIndex(0);
    setIsPlaying(true);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode === 'simulation' && autoCamera) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: manualPan.x,
      panY: manualPan.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current) return;
    setManualPan({
      x: dragStartRef.current.panX + (e.clientX - dragStartRef.current.x),
      y: dragStartRef.current.panY + (e.clientY - dragStartRef.current.y),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Which divider columns on P2 are highlighted by the active wire?
  const highlightedDivNum = useMemo(() => {
    const c = activeConnectionWire?.conn || inspectedWire?.conn;
    if (!c) return null;
    if (c.dividerId === 'DIV-1') return 1;
    if (c.dividerId === 'DIV-2') return 2;
    if (c.dividerId === 'DIV-3') return 3;
    if (c.dividerId === 'DIV-4') return 4;
    if (c.fromComponentName.includes('Pull-up') || c.toComponentName.includes('Pull-up')) return 5;
    return null;
  }, [activeConnectionWire, inspectedWire]);

  const handleSelectMode = (nextMode: WorkbenchMode) => {
    setMode(nextMode);
    if (nextMode === 'static') {
      setIsPlaying(false);
      setManualZoom(1);
      setManualPan({ x: 0, y: 0 });
    }
  };

  return (
    <div className="space-y-4">
      {/* Encabezado de control de modos */}
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Mesa de Cableado Real — Planos de Conexión Interactivos (C01–C95)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Vista superior realista de tus placas reales (ESP32, UNO + Shield L293D, L298N, P1/P2 y sensores Z3–Z8). Cambia entre la animación paso a paso y el plano completo conectado.
            </p>
          </div>

          {/* Selector principal de los 2 modos */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080E1A] border border-slate-800 shrink-0 self-start">
            <button
              onClick={() => handleSelectMode('simulation')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                mode === 'simulation'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Film className="w-4 h-4" />
              Modo Simulación / Vídeo
            </button>
            <button
              onClick={() => handleSelectMode('static')}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 transition ${
                mode === 'static'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              Modo Estático (Todo conectado)
            </button>
          </div>
        </div>

        {/* Barra de controles según el modo */}
        {mode === 'simulation' ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (stepIndex >= maxSimSteps && !isPlaying) setStepIndex(0);
                  setIsPlaying((p) => !p);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white whitespace-nowrap shrink-0 transition"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                {isPlaying ? 'Pausar' : 'Reproducir'}
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setStepIndex((i) => Math.max(0, i - 1));
                }}
                disabled={stepIndex <= 0}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#080E1A] border border-slate-700 text-slate-200 hover:border-slate-500 disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Anterior
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setStepIndex((i) => Math.min(maxSimSteps, i + 1));
                }}
                disabled={stepIndex >= maxSimSteps}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#080E1A] border border-slate-700 text-slate-200 hover:border-slate-500 disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                Siguiente
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleRestartSim}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#080E1A] border border-slate-700 text-slate-300 hover:text-white whitespace-nowrap shrink-0"
                title="Reiniciar animación"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reiniciar
              </button>

              {/* Paso por conexión vs por etapa */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#080E1A] border border-slate-800 ml-1">
                <button
                  onClick={() => {
                    setGranularity('connection');
                    setStepIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition ${
                    granularity === 'connection'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Por conexión
                </button>
                <button
                  onClick={() => {
                    setGranularity('stage');
                    setStageFilter('ALL');
                    setStepIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium whitespace-nowrap transition ${
                    granularity === 'stage'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Por etapa (E1–E8)
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro etapa en simulación por conexión */}
              {granularity === 'connection' && (
                <select
                  aria-label="Filtrar etapa en simulación"
                  value={stageFilter}
                  onChange={(e) => {
                    setStageFilter(e.target.value as 'ALL' | WireConnection['stage']);
                    setStepIndex(0);
                  }}
                  className="bg-[#080E1A] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">Todas las etapas (95 cables)</option>
                  {STAGE_META.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.short}
                    </option>
                  ))}
                </select>
              )}

              {/* Velocidad */}
              <div className="flex items-center gap-1 bg-[#080E1A] border border-slate-800 rounded-lg p-0.5">
                {([0.5, 1, 2] as const).map((sp) => (
                  <button
                    key={sp}
                    onClick={() => setSpeed(sp)}
                    className={`px-2 py-1 rounded text-[11px] font-mono tabular-nums transition ${
                      speed === sp ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {sp}×
                  </button>
                ))}
              </div>

              {/* Auto-cámara */}
              <button
                onClick={() => {
                  setAutoCamera((v) => !v);
                  setManualZoom(1);
                  setManualPan({ x: 0, y: 0 });
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border whitespace-nowrap shrink-0 transition ${
                  autoCamera
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                    : 'bg-[#080E1A] border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                {autoCamera ? 'Cámara: Sigue el cable' : 'Cámara: Vista completa'}
              </button>
            </div>

            {/* Scrubber de progreso */}
            <div className="w-full flex items-center gap-3 pt-1">
              <span className="text-[11px] font-mono tabular-nums text-slate-400 whitespace-nowrap">
                {granularity === 'connection'
                  ? `Conexión ${stepIndex + 1} / ${activeStageSimItems.length}`
                  : `Etapa ${stepIndex + 1} / ${STAGE_META.length}`}
              </span>
              <input
                type="range"
                min={0}
                max={maxSimSteps}
                value={stepIndex}
                onChange={(e) => {
                  setIsPlaying(false);
                  setStepIndex(Number(e.target.value));
                }}
                className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                aria-label="Línea de tiempo de conexiones"
              />
              <span className="text-[11px] font-mono text-emerald-300 tabular-nums whitespace-nowrap">
                {granularity === 'connection'
                  ? activeConnectionWire?.conn.id || 'C01'
                  : STAGE_META[stepIndex]?.id || 'E1'}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setStageFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border whitespace-nowrap transition ${
                  stageFilter === 'ALL'
                    ? 'bg-emerald-600 border-emerald-500 text-white'
                    : 'bg-[#080E1A] border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Todo conectado (95)
              </button>
              {STAGE_META.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStageFilter(st.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border whitespace-nowrap transition ${
                    stageFilter === st.id
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-[#080E1A] border-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  {st.short}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filtrar por color de cable"
                value={colorFilter}
                onChange={(e) => setColorFilter(e.target.value)}
                className="bg-[#080E1A] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {WIRE_COLOR_FILTERS.map((cf) => (
                  <option key={cf.id} value={cf.id}>
                    {cf.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 bg-[#080E1A] border border-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setManualZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)))}
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800"
                  title="Alejar"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-mono tabular-nums text-slate-300 px-1.5">
                  {Math.round(manualZoom * 100)}%
                </span>
                <button
                  onClick={() => setManualZoom((z) => Math.min(2.75, +(z + 0.25).toFixed(2)))}
                  className="p-1 rounded text-slate-300 hover:text-white hover:bg-slate-800"
                  title="Acercar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setManualZoom(1);
                    setManualPan({ x: 0, y: 0 });
                    setSelectedModuleId(null);
                    setSelectedWireId(null);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-300 hover:text-white hover:bg-slate-800"
                  title="Ajustar mesa completa"
                >
                  <Maximize2 className="w-3 h-3" />
                  Ajustar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lienzo principal sobre mesa de madera */}
      <div
        className={`relative rounded-xl border border-amber-900/50 bg-[#2b170b] overflow-hidden shadow-2xl select-none ${
          mode === 'static' || !autoCamera ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div style={cameraStyle} className="w-full origin-center will-change-transform">
          <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} className="w-full h-auto block">
            <defs>
              {/* Textura realista de mesa de madera con tablones horizontales */}
              <pattern id="woodPlanks" width="600" height="220" patternUnits="userSpaceOnUse">
                <rect width="600" height="220" fill="#7c4727" />
                <rect x="0" y="0" width="600" height="108" fill="#844d2b" />
                <rect x="0" y="110" width="600" height="108" fill="#734123" />
                <line x1="0" y1="109" x2="600" y2="109" stroke="#472410" strokeWidth="2.5" />
                <line x1="0" y1="219" x2="600" y2="219" stroke="#472410" strokeWidth="2.5" />
                <path
                  d="M0,18 Q150,12 300,20 T600,16 M0,44 Q180,52 360,42 T600,48 M0,78 Q120,70 280,82 T600,76 M0,136 Q160,144 330,132 T600,138 M0,172 Q210,164 400,176 T600,168 M0,202 Q140,208 320,198 T600,204"
                  fill="none"
                  stroke="#5d3218"
                  strokeOpacity="0.34"
                  strokeWidth="1.6"
                />
                <path
                  d="M0,29 Q220,34 420,25 T600,31 M0,92 Q140,98 310,88 T600,94 M0,154 Q200,149 380,159 T600,152"
                  fill="none"
                  stroke="#9b5f38"
                  strokeOpacity="0.22"
                  strokeWidth="1.3"
                />
              </pattern>

              {/* Sombra realista debajo de cada módulo electrónico */}
              <filter id="pcbShadow" x="-8%" y="-8%" width="118%" height="122%">
                <feDropShadow dx="4" dy="6" stdDeviation="5" floodColor="#180a02" floodOpacity="0.58" />
              </filter>

              <filter id="wireGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ffffff" floodOpacity="0.7" />
              </filter>

              <linearGradient id="metalShield" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#d1d5db" />
                <stop offset="50%" stopColor="#9ca3af" />
                <stop offset="100%" stopColor="#6b7280" />
              </linearGradient>

              <linearGradient id="heatsinkFin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="50%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
            </defs>

            {/* Fondo de madera */}
            <rect width={CANVAS_W} height={CANVAS_H} fill="url(#woodPlanks)" />

            {/* Rótulos sutiles grabados sobre la madera para separar Z1 Caja vs Z2–Z8 Grúa */}
            <rect
              x="26"
              y="22"
              width="1340"
              height="1052"
              rx="14"
              fill="none"
              stroke="#fcd34d"
              strokeOpacity="0.22"
              strokeWidth="1.8"
              strokeDasharray="10 6"
            />
            <text x="44" y="1064" fill="#fef3c7" fillOpacity="0.75" fontSize="13" fontWeight="700">
              Z1 · CAJA DE CONTROL Y TAPA (ESP32 + UNO/SHIELD + L298N + P1/P2 + INTERFAZ)
            </text>

            {/* Banda vertical Mástil Z2 + Rizo + Bornera Z3 */}
            <rect x="1376" y="34" width="46" height="1028" rx="10" fill="#1e1b4b" fillOpacity="0.45" stroke="#a78bfa" strokeOpacity="0.55" strokeWidth="1.5" />
            <text
              x="1399"
              y="548"
              textAnchor="middle"
              transform="rotate(-90 1399 548)"
              fill="#ddd6fe"
              fontSize="12"
              fontWeight="700"
              letterSpacing="1.5"
            >
              MÁSTIL Z2 (MANGUERA 22 HILOS + RIZO) → BORNERA Z3
            </text>

            <rect
              x="1428"
              y="22"
              width="342"
              height="1052"
              rx="14"
              fill="none"
              stroke="#c084fc"
              strokeOpacity="0.32"
              strokeWidth="1.8"
              strokeDasharray="10 6"
            />
            <text x="1600" y="1088" textAnchor="middle" fill="#f3e8ff" fillOpacity="0.85" fontSize="13" fontWeight="700">
              Z3 · Z5 · Z6 · Z8 — ACTUADORES Y SENSORES EN LA GRÚA
            </text>

            {/* ================= COMPONENTES ELECTRÓNICOS REALISTAS ================= */}

            {/* 1. FUENTE 12V 2A */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('fuente-12v');
              }}
            >
              <rect x="45" y="42" width="170" height="102" rx="8" fill="#18181b" stroke="#52525b" strokeWidth="2" />
              <rect x="55" y="52" width="115" height="82" rx="4" fill="#27272a" stroke="#3f3f46" />
              <text x="112" y="74" textAnchor="middle" fill="#fb923c" fontSize="13" fontWeight="800">FUENTE 12 V ⎓ 2 A</text>
              <text x="112" y="92" textAnchor="middle" fill="#e4e4e7" fontSize="9.5">APD WB-24J12FU</text>
              <text x="112" y="110" textAnchor="middle" fill="#a1a1aa" fontSize="8.5">Solo potencia motores</text>
              <circle cx="195" cy="76" r="10" fill="#16a34a" stroke="#052e16" strokeWidth="1.5" />
              <circle cx="212" cy="76" r="4.5" fill="#fb923c" stroke="#fff" strokeWidth="1" />
              <text x="195" y="80" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">+</text>
              <circle cx="195" cy="112" r="10" fill="#16a34a" stroke="#052e16" strokeWidth="1.5" />
              <circle cx="212" cy="112" r="4.5" fill="#18181b" stroke="#e2e8f0" strokeWidth="1" />
              <text x="195" y="116" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">−</text>
            </g>

            {/* 2. INTERRUPTOR GENERAL */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('interruptor-gral');
              }}
            >
              <rect x="255" y="50" width="128" height="86" rx="8" fill="#0f172a" stroke="#64748b" strokeWidth="2" />
              <rect x="275" y="64" width="88" height="44" rx="4" fill="#dc2626" stroke="#7f1d1d" strokeWidth="2" />
              <text x="296" y="91" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800">I</text>
              <text x="342" y="91" textAnchor="middle" fill="#fecaca" fontSize="13" fontWeight="800">O</text>
              <text x="319" y="126" textAnchor="middle" fill="#fde68a" fontSize="9.5" fontWeight="700">INTERRUPTOR 12V</text>
              <circle cx="256" cy="76" r="5" fill="#fbbf24" stroke="#1e293b" strokeWidth="1.5" />
              <circle cx="382" cy="92" r="5" fill="#fbbf24" stroke="#1e293b" strokeWidth="1.5" />
            </g>

            {/* 3. FUENTE 5V 3A */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('fuente-5v');
              }}
            >
              <rect x="45" y="176" width="170" height="102" rx="8" fill="#18181b" stroke="#52525b" strokeWidth="2" />
              <rect x="55" y="186" width="115" height="82" rx="4" fill="#27272a" stroke="#3f3f46" />
              <text x="112" y="208" textAnchor="middle" fill="#f87171" fontSize="13" fontWeight="800">FUENTE 5 V ⎓ 3 A</text>
              <text x="112" y="226" textAnchor="middle" fill="#e4e4e7" fontSize="9.5">Regulada DC</text>
              <text x="112" y="244" textAnchor="middle" fill="#a1a1aa" fontSize="8.5">Solo lógica (R2 + R1)</text>
              <circle cx="195" cy="210" r="10" fill="#16a34a" stroke="#052e16" strokeWidth="1.5" />
              <circle cx="212" cy="210" r="4.5" fill="#ef4444" stroke="#fff" strokeWidth="1" />
              <text x="195" y="214" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="700">+</text>
              <circle cx="195" cy="246" r="10" fill="#16a34a" stroke="#052e16" strokeWidth="1.5" />
              <circle cx="212" cy="246" r="4.5" fill="#18181b" stroke="#e2e8f0" strokeWidth="1" />
              <text x="195" y="250" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700">−</text>
            </g>

            {/* 4. KIT LED POR SONIDO */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('kit-led-sonido');
              }}
            >
              <rect x="255" y="182" width="145" height="90" rx="6" fill="#065f46" stroke="#34d399" strokeWidth="1.8" />
              <text x="320" y="202" textAnchor="middle" fill="#ecfdf5" fontSize="10.5" fontWeight="700">Kit LED Sonido (7 LEDs)</text>
              {['#ef4444', '#f97316', '#eab308', '#22c55e', '#38bdf8', '#6366f1', '#ec4899'].map((c, idx) => (
                <circle key={idx} cx={275 + idx * 14} cy="224" r="4.5" fill={c} stroke="#022c22" strokeWidth="1" />
              ))}
              <circle cx="285" cy="252" r="10" fill="url(#metalShield)" stroke="#334155" />
              <text x="334" y="256" textAnchor="middle" fill="#fde68a" fontSize="8.5" fontWeight="600">POR CONFIRMAR</text>
              <circle cx="398" cy="212" r="4" fill="#fbbf24" stroke="#022c22" />
              <circle cx="398" cy="244" r="4" fill="#cbd5e1" stroke="#022c22" />
              <text x="387" y="215" textAnchor="end" fill="#fff" fontSize="8.5" fontFamily="monospace">+</text>
              <text x="387" y="247" textAnchor="end" fill="#fff" fontSize="8.5" fontFamily="monospace">−</text>
            </g>

            {/* 5. PROTOBOARD P1 (830 PTS - 5V & GND) */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('protoboards');
              }}
            >
              <rect x="52" y="338" width="696" height="166" rx="8" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="2" />
              <text x="68" y="352" fill="#334155" fontSize="9.5" fontWeight="800">
                PROTOBOARD P1 (830 pts) · R1 = GND COMÚN (0 V)
              </text>
              {/* Riel superior R1 (-) */}
              <line x1="72" y1="357" x2="728" y2="357" stroke="#0f172a" strokeWidth="3.2" />
              <text x="733" y="361" fill="#0f172a" fontSize="10" fontWeight="800">R1−</text>
              {/* Puntos de agujeros en P1 */}
              {Array.from({ length: 32 }).map((_, cIdx) => {
                const hx = 80 + cIdx * 20.5;
                return (
                  <g key={cIdx}>
                    <rect x={hx - 2} y="366" width="4" height="4" rx="0.5" fill="#1e293b" />
                    <rect x={hx - 2} y="384" width="4" height="4" rx="0.5" fill="#334155" />
                    <rect x={hx - 2} y="396" width="4" height="4" rx="0.5" fill="#334155" />
                    <rect x={hx - 2} y="408" width="4" height="4" rx="0.5" fill="#334155" />
                    <rect x={hx - 2} y="436" width="4" height="4" rx="0.5" fill="#334155" />
                    <rect x={hx - 2} y="448" width="4" height="4" rx="0.5" fill="#334155" />
                    <rect x={hx - 2} y="460" width="4" height="4" rx="0.5" fill="#334155" />
                    <rect x={hx - 2} y="476" width="4" height="4" rx="0.5" fill="#1e293b" />
                  </g>
                );
              })}
              {/* Canal central P1 */}
              <rect x="64" y="420" width="672" height="9" fill="#cbd5e1" rx="2" />
              <text x="400" y="427" textAnchor="middle" fill="#475569" fontSize="8" fontWeight="700">
                P1 · Zona de empalmes 5 V / GND
              </text>
              {/* Riel inferior R2 (+5V) */}
              <line x1="72" y1="487" x2="728" y2="487" stroke="#dc2626" strokeWidth="3.2" />
              <text x="733" y="491" fill="#dc2626" fontSize="10" fontWeight="800">R2+</text>
              <text x="68" y="499" fill="#b91c1c" fontSize="9.5" fontWeight="800">
                R2 = +5 V SOLO LÓGICA (Desde Fuente 5 V 3 A)
              </text>
            </g>

            {/* 6. PROTOBOARD P2 (830 PTS - 3.3V, 4 DIVISORES + PULL-UP HOME) */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('protoboards');
              }}
            >
              <rect x="52" y="542" width="696" height="192" rx="8" fill="#f8fafc" stroke="#94a3b8" strokeWidth="2" />
              <text x="68" y="556" fill="#0f172a" fontSize="9.5" fontWeight="800">
                PROTOBOARD P2 (830 pts) · R1 = GND COMÚN · 4 DIVISORES (5 V → 3,33 V) + PULL-UP HOME
              </text>
              {/* Riel superior R1 (-) */}
              <line x1="72" y1="562" x2="728" y2="562" stroke="#0f172a" strokeWidth="3.2" />
              <text x="733" y="566" fill="#0f172a" fontSize="10" fontWeight="800">R1−</text>

              {/* Resaltados de los 4 divisores y pull-up */}
              {[
                { n: 1, col: 5, label: 'Div #1 (US-H)' },
                { n: 2, col: 17, label: 'Div #2 (US-V)' },
                { n: 3, col: 29, label: 'Div #3 (UART)' },
                { n: 4, col: 41, label: 'Div #4 (Hall)' },
              ].map((div) => {
                const dx = p2ColX(div.col) - 6;
                const dw = 10.2 * 9 + 12;
                const isHl = highlightedDivNum === div.n;
                return (
                  <g key={div.n}>
                    <rect
                      x={dx}
                      y="580"
                      width={dw}
                      height="76"
                      rx="5"
                      fill={isHl ? '#fef08a' : '#fef3c7'}
                      fillOpacity={isHl ? 0.9 : 0.45}
                      stroke={isHl ? '#d97706' : '#f59e0b'}
                      strokeWidth={isHl ? 2.4 : 1.2}
                    />
                    <text x={dx + dw / 2} y="590" textAnchor="middle" fill="#92400e" fontSize="8.5" fontWeight="800">
                      {div.label} (c={div.col})
                    </text>

                    {/* 3 Resistencias reales 1 kΩ (marrón-negro-rojo-dorado) */}
                    {[
                      { c1: div.col, c2: div.col + 3, row: 'b' as const },
                      { c1: div.col + 3, c2: div.col + 6, row: 'd' as const },
                      { c1: div.col + 6, c2: div.col + 9, row: 'b' as const },
                    ].map((res, rIdx) => {
                      const x1 = p2ColX(res.c1);
                      const x2 = p2ColX(res.c2);
                      const ry = p2RowY(res.row);
                      const mx = (x1 + x2) / 2;
                      return (
                        <g key={rIdx}>
                          <line x1={x1} y1={ry} x2={x2} y2={ry} stroke="#64748b" strokeWidth="1.6" />
                          <rect x={mx - 9} y={ry - 3.5} width="18" height="7" rx="2" fill="#e7cfa3" stroke="#78350f" strokeWidth="0.8" />
                          <rect x={mx - 6} y={ry - 3.5} width="2" height="7" fill="#78350f" />
                          <rect x={mx - 2} y={ry - 3.5} width="2" height="7" fill="#0f172a" />
                          <rect x={mx + 2} y={ry - 3.5} width="2" height="7" fill="#dc2626" />
                          <rect x={mx + 6} y={ry - 3.5} width="1.8" height="7" fill="#eab308" />
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* Pull-up HOME cols 53-55 */}
              <rect
                x={p2ColX(53) - 6}
                y="580"
                width={10.2 * 2 + 12}
                height="76"
                rx="5"
                fill={highlightedDivNum === 5 ? '#bbf7d0' : '#dcfce7'}
                stroke="#16a34a"
                strokeWidth={highlightedDivNum === 5 ? 2.2 : 1.2}
              />
              <text x={p2ColX(54)} y="590" textAnchor="middle" fill="#166534" fontSize="8" fontWeight="800">
                HOME 1kΩ
              </text>
              <line x1={p2ColX(53)} y1={p2RowY('b')} x2={p2ColX(55)} y2={p2RowY('b')} stroke="#64748b" strokeWidth="1.6" />
              <rect x={p2ColX(54) - 7} y={p2RowY('b') - 3} width="14" height="6" rx="1.5" fill="#e7cfa3" stroke="#78350f" strokeWidth="0.7" />

              {/* Canal central P2 */}
              <rect x="64" y="660" width="672" height="10" fill="#cbd5e1" rx="2" />
              <text x="400" y="668" textAnchor="middle" fill="#334155" fontSize="8" fontWeight="700">
                P2 · Columnas 1–63 (a–e arriba / f–j abajo) · 13 resistencias de 1 kΩ
              </text>

              {/* Filas f-j de P2 */}
              {Array.from({ length: 32 }).map((_, cIdx) => {
                const hx = 80 + cIdx * 20.5;
                return (
                  <g key={cIdx}>
                    <rect x={hx - 2} y="676" width="4" height="4" rx="0.5" fill="#475569" />
                    <rect x={hx - 2} y="688" width="4" height="4" rx="0.5" fill="#475569" />
                    <rect x={hx - 2} y="700" width="4" height="4" rx="0.5" fill="#475569" />
                  </g>
                );
              })}

              {/* Riel inferior R3 (+3.3V) */}
              <line x1="72" y1="716" x2="728" y2="716" stroke="#ea580c" strokeWidth="3.2" />
              <text x="733" y="720" fill="#ea580c" fontSize="10" fontWeight="800">R3+</text>
              <text x="68" y="729" fill="#c2410c" fontSize="9.5" fontWeight="800">
                R3 = +3,3 V (Desde ESP32 3V3 · NUNCA TOCAR R2)
              </text>
            </g>

            {/* 7. ESP32 DEVKIT V1 (30 PINES) */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('esp32');
              }}
            >
              <rect x="830" y="46" width="252" height="382" rx="10" fill="#111827" stroke="#374151" strokeWidth="2.5" />
              {/* Antena PCB superior */}
              <rect x="894" y="54" width="124" height="32" rx="3" fill="#1f2937" stroke="#4b5563" />
              <path d="M905,78 L905,62 L922,62 L922,78 L939,78 L939,62 L956,62 L956,78 L973,78 L973,62 L990,62 L990,78 L1006,78" fill="none" stroke="#d97706" strokeWidth="2" />
              {/* Blindaje metálico ESP-WROOM-32 */}
              <rect x="892" y="88" width="128" height="148" rx="4" fill="url(#metalShield)" stroke="#4b5563" strokeWidth="1.5" />
              <text x="956" y="148" textAnchor="middle" fill="#111827" fontSize="11.5" fontWeight="800">ESP-WROOM-32</text>
              <text x="956" y="166" textAnchor="middle" fill="#1f2937" fontSize="9.5" fontWeight="700">ESP32 DevKit (3,3 V)</text>
              <text x="956" y="185" textAnchor="middle" fill="#374151" fontSize="8.5">WiFi + Bluepad32</text>

              {/* Micro-USB y botones EN / BOOT */}
              <rect x="928" y="394" width="56" height="34" rx="3" fill="#9ca3af" stroke="#4b5563" strokeWidth="1.5" />
              <text x="956" y="415" textAnchor="middle" fill="#111827" fontSize="8.5" fontWeight="800">USB</text>
              <rect x="886" y="382" width="24" height="16" rx="2" fill="#e5e7eb" stroke="#6b7280" />
              <text x="898" y="376" textAnchor="middle" fill="#9ca3af" fontSize="7.5">EN</text>
              <rect x="1002" y="382" width="24" height="16" rx="2" fill="#e5e7eb" stroke="#6b7280" />
              <text x="1014" y="376" textAnchor="middle" fill="#9ca3af" fontSize="7.5">BOOT</text>

              {/* Regulador AMS1117 */}
              <rect x="938" y="292" width="36" height="44" rx="2" fill="#030712" stroke="#4b5563" />
              <text x="956" y="318" textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">1117</text>

              {/* Regleta izquierda (15 pines) */}
              {ESP32_LEFT_PINS.map((pName, idx) => {
                const py = esp32LeftY(idx);
                return (
                  <g key={pName}>
                    <rect x="833" y={py - 6} width="12" height="12" rx="2" fill="#1f2937" />
                    <circle cx="838" cy={py} r="4" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
                    <text x="850" y={py + 3} fill="#e5e7eb" fontSize="9" fontFamily="monospace" fontWeight="700">
                      {pName}
                    </text>
                  </g>
                );
              })}

              {/* Regleta derecha (15 pines) */}
              {ESP32_RIGHT_PINS.map((pName, idx) => {
                const py = esp32RightY(idx);
                return (
                  <g key={pName}>
                    <rect x="1067" y={py - 6} width="12" height="12" rx="2" fill="#1f2937" />
                    <circle cx="1074" cy={py} r="4" fill="#fbbf24" stroke="#78350f" strokeWidth="1" />
                    <text x="1062" y={py + 3} textAnchor="end" fill="#e5e7eb" fontSize="9" fontFamily="monospace" fontWeight="700">
                      {pName}
                    </text>
                  </g>
                );
              })}
            </g>

            {/* 8. MÓDULO PUENTE H L298N */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('l298n');
              }}
            >
              <rect x="1128" y="52" width="220" height="230" rx="8" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="2.5" />
              {/* Disipador aluminio negro */}
              <rect x="1166" y="72" width="120" height="84" rx="4" fill="url(#heatsinkFin)" stroke="#475569" strokeWidth="1.5" />
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <line key={i} x1={1178 + i * 19} y1="74" x2={1178 + i * 19} y2="154" stroke="#475569" strokeWidth="2" />
              ))}
              <text x="1226" y="182" textAnchor="middle" fill="#fff" fontSize="13" fontWeight="800">L298N PUENTE H</text>
              <rect x="1152" y="192" width="150" height="22" rx="4" fill="#450a0a" stroke="#f87171" />
              <text x="1227" y="206" textAnchor="middle" fill="#fecaca" fontSize="8.5" fontWeight="700">
                5V-EN / ENA / ENB RETIRADOS
              </text>

              {/* Bornera derecha OUT1/OUT2 y OUT3/OUT4 */}
              <rect x="1324" y="88" width="22" height="54" rx="3" fill="#2563eb" stroke="#1e3a8a" />
              <circle cx="1344" cy="104" r="4" fill="#cbd5e1" stroke="#0f172a" />
              <circle cx="1344" cy="126" r="4" fill="#cbd5e1" stroke="#0f172a" />
              <text x="1320" y="114" textAnchor="end" fill="#fff" fontSize="8.5" fontFamily="monospace">OUT1/2</text>

              <rect x="1324" y="168" width="22" height="54" rx="3" fill="#2563eb" stroke="#1e3a8a" />
              <circle cx="1344" cy="184" r="4" fill="#cbd5e1" stroke="#0f172a" />
              <circle cx="1344" cy="206" r="4" fill="#cbd5e1" stroke="#0f172a" />
              <text x="1320" y="194" textAnchor="end" fill="#fff" fontSize="8.5" fontFamily="monospace">OUT3/4</text>

              {/* Bornera inferior 12V / GND / 5V */}
              <rect x="1148" y="254" width="84" height="24" rx="3" fill="#2563eb" stroke="#1e3a8a" />
              {[
                { label: '12V', x: 1164 },
                { label: 'GND', x: 1192 },
                { label: '5V', x: 1220 },
              ].map((b) => (
                <g key={b.label}>
                  <circle cx={b.x} cy="266" r="4.5" fill="#e2e8f0" stroke="#0f172a" />
                  <text x={b.x} y="248" textAnchor="middle" fill="#fff" fontSize="8" fontFamily="monospace" fontWeight="700">
                    {b.label}
                  </text>
                </g>
              ))}

              {/* Regleta ENA IN1 IN2 IN3 IN4 ENB */}
              {[
                { label: 'ENA', x: 1248 },
                { label: 'IN1', x: 1265 },
                { label: 'IN2', x: 1282 },
                { label: 'IN3', x: 1299 },
                { label: 'IN4', x: 1316 },
                { label: 'ENB', x: 1333 },
              ].map((p) => (
                <g key={p.label}>
                  <circle cx={p.x} cy="266" r="3.8" fill="#fbbf24" stroke="#78350f" />
                  <text x={p.x} y="248" textAnchor="middle" fill="#fef08a" fontSize="7.5" fontFamily="monospace" fontWeight="700">
                    {p.label}
                  </text>
                </g>
              ))}
            </g>

            {/* 9. ARDUINO UNO + SHIELD L293D (1 SOLA PIEZA) */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('shield-l293d');
              }}
            >
              {/* Base UNO R3 azul */}
              <rect x="860" y="492" width="344" height="298" rx="10" fill="#0284c7" stroke="#0369a1" strokeWidth="2.5" />
              {/* Puerto USB-B y DC Jack */}
              <rect x="846" y="514" width="34" height="44" rx="3" fill="url(#metalShield)" stroke="#334155" />
              <rect x="846" y="694" width="38" height="42" rx="3" fill="#18181b" stroke="#3f3f46" />
              {/* Shield L293D montado encima */}
              <rect x="892" y="502" width="298" height="278" rx="6" fill="#0369a1" stroke="#38bdf8" strokeWidth="1.6" />
              <text x="1038" y="534" textAnchor="middle" fill="#f0f9ff" fontSize="13" fontWeight="800">
                UNO R3 + SHIELD L293D
              </text>
              <text x="1038" y="550" textAnchor="middle" fill="#bae6fd" fontSize="9.5" fontWeight="600">
                (1 sola pieza · Puente PWR RETIRADO)
              </text>

              {/* Dos chips L293D + 74HC595 */}
              <rect x="945" y="582" width="54" height="26" rx="2" fill="#0f172a" stroke="#475569" />
              <text x="972" y="598" textAnchor="middle" fill="#cbd5e1" fontSize="8" fontFamily="monospace">L293D #1</text>
              <rect x="945" y="620" width="54" height="26" rx="2" fill="#0f172a" stroke="#475569" />
              <text x="972" y="636" textAnchor="middle" fill="#cbd5e1" fontSize="8" fontFamily="monospace">L293D #2</text>
              <rect x="1014" y="602" width="44" height="22" rx="2" fill="#0f172a" stroke="#475569" />
              <text x="1036" y="616" textAnchor="middle" fill="#94a3b8" fontSize="7.5" fontFamily="monospace">595</text>

              {/* Advertencia pines reservados D3-D8, D11, D12 */}
              <rect x="928" y="664" width="166" height="40" rx="4" fill="#7f1d1d" fillOpacity="0.9" stroke="#f87171" />
              <text x="1011" y="681" textAnchor="middle" fill="#fecaca" fontSize="8.5" fontWeight="800">
                RESERVADOS SHIELD (NO USAR)
              </text>
              <text x="1011" y="695" textAnchor="middle" fill="#fee2e2" fontSize="8.5" fontFamily="monospace">
                D3–D8, D11, D12
              </text>

              {/* EXT_PWR izquierda */}
              <rect x="866" y="528" width="22" height="52" rx="3" fill="#2563eb" stroke="#1e3a8a" />
              <circle cx="876" cy="540" r="4.2" fill="#fb923c" stroke="#fff" />
              <circle cx="876" cy="568" r="4.2" fill="#18181b" stroke="#e2e8f0" />
              <text x="893" y="544" fill="#fed7aa" fontSize="8" fontWeight="700">+M</text>
              <text x="893" y="571" fill="#e2e8f0" fontSize="8" fontWeight="700">GND</text>

              {/* Regleta superior D13, D10, D9, D2 */}
              {[
                { label: 'D13', x: 996 },
                { label: 'D10', x: 1044 },
                { label: 'D9', x: 1068 },
                { label: 'D2', x: 1152 },
              ].map((p) => (
                <g key={p.label}>
                  <circle cx={p.x} cy="508" r="4" fill="#fbbf24" stroke="#0c4a6e" />
                  <text x={p.x} y="520" textAnchor="middle" fill="#e0f2fe" fontSize="8" fontFamily="monospace" fontWeight="700">
                    {p.label}
                  </text>
                </g>
              ))}

              {/* Regleta inferior 5V, GND, A0..A5 */}
              {[
                { label: '5V', x: 912 },
                { label: 'GND', x: 934 },
                { label: 'A0', x: 984 },
                { label: 'A1', x: 1006 },
                { label: 'A2', x: 1028 },
                { label: 'A3', x: 1050 },
                { label: 'A4', x: 1072 },
                { label: 'A5', x: 1094 },
              ].map((p) => (
                <g key={p.label}>
                  <circle cx={p.x} cy="774" r="4" fill="#fbbf24" stroke="#0c4a6e" />
                  <text x={p.x} y="764" textAnchor="middle" fill="#e0f2fe" fontSize="8" fontFamily="monospace" fontWeight="700">
                    {p.label}
                  </text>
                </g>
              ))}

              {/* Bornes M1, M2, M3, M4 derecha */}
              {[
                { label: 'M1 Carro', y: 554, color: '#22c55e' },
                { label: 'M2 Imán', y: 614, color: '#f59e0b' },
                { label: 'M3 Luz', y: 674, color: '#eab308' },
                { label: 'M4 Libre', y: 734, color: '#94a3b8' },
              ].map((m) => (
                <g key={m.label}>
                  <rect x="1176" y={m.y - 14} width="24" height="34" rx="3" fill="#2563eb" stroke="#1e3a8a" />
                  <circle cx="1194" cy={m.y} r="4.2" fill="#cbd5e1" stroke="#0f172a" />
                  <circle cx="1194" cy={m.y + 13} r="4.2" fill="#cbd5e1" stroke="#0f172a" />
                  <text x="1172" y={m.y + 5} textAnchor="end" fill={m.color} fontSize="8.5" fontWeight="800">
                    {m.label}
                  </text>
                </g>
              ))}
            </g>

            {/* 10. TAPA Z1: OLED A, OLED B, LCD 1602, POT 1 & POT 2 */}
            {/* OLED A */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('oled-a');
              }}
            >
              <rect x="52" y="785" width="142" height="112" rx="6" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2" />
              <rect x="64" y="802" width="118" height="68" rx="4" fill="#020617" stroke="#334155" />
              <text x="123" y="822" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontWeight="700">OLED A (0x3C)</text>
              <text x="123" y="838" textAnchor="middle" fill="#cbd5e1" fontSize="8">Carga #1 · 120 g</text>
              <text x="123" y="852" textAnchor="middle" fill="#34d399" fontSize="8">Contrapeso OK</text>
              {[
                { label: 'GND', x: 80 },
                { label: 'VCC', x: 104 },
                { label: 'SCL', x: 128 },
                { label: 'SDA', x: 152 },
              ].map((p) => (
                <g key={p.label}>
                  <circle cx={p.x} cy="886" r="3.5" fill="#fbbf24" />
                  <text x={p.x} y="879" textAnchor="middle" fill="#e2e8f0" fontSize="6.8" fontFamily="monospace">{p.label}</text>
                </g>
              ))}
            </g>

            {/* OLED B */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('oled-b');
              }}
            >
              <rect x="214" y="785" width="142" height="112" rx="6" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="2" />
              <rect x="226" y="802" width="118" height="68" rx="4" fill="#020617" stroke="#334155" />
              <text x="285" y="822" textAnchor="middle" fill="#38bdf8" fontSize="9.5" fontWeight="700">OLED B (0x3C)</text>
              <text x="285" y="838" textAnchor="middle" fill="#cbd5e1" fontSize="8">Δr ≤ 5mm · Δθ ≤ 2°</text>
              <text x="285" y="852" textAnchor="middle" fill="#fde047" fontSize="8">(r, θ, z) en vivo</text>
              {[
                { label: 'GND', x: 242 },
                { label: 'VCC', x: 266 },
                { label: 'SCL', x: 290 },
                { label: 'SDA', x: 314 },
              ].map((p) => (
                <g key={p.label}>
                  <circle cx={p.x} cy="886" r="3.5" fill="#fbbf24" />
                  <text x={p.x} y="879" textAnchor="middle" fill="#e2e8f0" fontSize="6.8" fontFamily="monospace">{p.label}</text>
                </g>
              ))}
            </g>

            {/* LCD 1602 I2C */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('lcd-1602');
              }}
            >
              <rect x="376" y="785" width="226" height="112" rx="6" fill="#14532d" stroke="#4ade80" strokeWidth="2" />
              <rect x="404" y="802" width="184" height="78" rx="4" fill="#1e293b" stroke="#0f172a" strokeWidth="2" />
              <rect x="414" y="810" width="164" height="62" rx="2" fill="#84cc16" />
              <text x="496" y="834" textAnchor="middle" fill="#1a2e05" fontSize="11.5" fontFamily="monospace" fontWeight="800">
                MODO: AUTOMATICO
              </text>
              <text x="496" y="856" textAnchor="middle" fill="#1a2e05" fontSize="10.5" fontFamily="monospace" fontWeight="700">
                CARGA 1/2 · LISTO
              </text>
              {[
                { label: 'GND', y: 816 },
                { label: 'VCC', y: 836 },
                { label: 'SDA', y: 856 },
                { label: 'SCL', y: 876 },
              ].map((p) => (
                <g key={p.label}>
                  <circle cx="386" cy={p.y} r="3.5" fill="#fbbf24" />
                  <text x="392" y={p.y + 3} fill="#dcfce7" fontSize="6.8" fontFamily="monospace">{p.label}</text>
                </g>
              ))}
            </g>

            {/* POT 1 y POT 2 */}
            {[
              { id: 'pot-1', title: 'POT 1 (3,3V)', x: 620, pinX: [642, 668, 694] },
              { id: 'pot-2', title: 'POT 2 (5V)', x: 734, pinX: [756, 782, 808] },
            ].map((pot) => (
              <g
                key={pot.id}
                filter="url(#pcbShadow)"
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedModuleId(pot.id);
                }}
              >
                <rect x={pot.x} y="788" width="96" height="106" rx="8" fill="#1e293b" stroke="#64748b" strokeWidth="1.8" />
                <circle cx={pot.x + 48} cy="832" r="24" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
                <circle cx={pot.x + 48} cy="832" r="16" fill="#0f172a" />
                <line x1={pot.x + 48} y1="832" x2={pot.x + 59} y2="821" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                <text x={pot.x + 48} y="802" textAnchor="middle" fill="#e2e8f0" fontSize="8.5" fontWeight="700">{pot.title}</text>
                {['VCC', 'OUT', 'GND'].map((lbl, idx) => (
                  <g key={lbl}>
                    <circle cx={pot.pinX[idx]} cy="884" r="3.5" fill="#fbbf24" />
                    <text x={pot.pinX[idx]} y="875" textAnchor="middle" fill="#cbd5e1" fontSize="6.5" fontFamily="monospace">{lbl}</text>
                  </g>
                ))}
              </g>
            ))}

            {/* 11. PULSADORES Z1 (PARO, BOT A, BOT B) */}
            {[
              { title: 'PARO (D12)', x: 52, capColor: '#dc2626', p1: 82, p2: 132 },
              { title: 'PESTAÑA A', x: 182, capColor: '#2563eb', p1: 212, p2: 262 },
              { title: 'PESTAÑA B', x: 312, capColor: '#16a34a', p1: 342, p2: 392 },
            ].map((btn) => (
              <g
                key={btn.title}
                filter="url(#pcbShadow)"
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedModuleId('pulsadores');
                }}
              >
                <rect x={btn.x} y="942" width="110" height="96" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="1.8" />
                <circle cx={btn.x + 55} cy="992" r="20" fill="#0f172a" stroke="#64748b" strokeWidth="1.5" />
                <circle cx={btn.x + 55} cy="992" r="13" fill={btn.capColor} />
                <text x={btn.x + 55} y="1028" textAnchor="middle" fill="#f8fafc" fontSize="8.5" fontWeight="700">{btn.title}</text>
                <circle cx={btn.p1} cy="952" r="4" fill="#fbbf24" />
                <circle cx={btn.p2} cy="952" r="4" fill="#cbd5e1" />
              </g>
            ))}

            {/* 12. 3 × BUZZERS KY-012 */}
            {[
              { title: 'BUZ 1 Mov', x: 454, base: 478 },
              { title: 'BUZ 2 Alarma', x: 574, base: 598 },
              { title: 'BUZ 3 Conf', x: 694, base: 718 },
            ].map((bz) => (
              <g
                key={bz.title}
                filter="url(#pcbShadow)"
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedModuleId('buzzers');
                }}
              >
                <rect x={bz.x} y="942" width="106" height="96" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="1.8" />
                <circle cx={bz.x + 53} cy="994" r="20" fill="#09090b" stroke="#52525b" strokeWidth="2" />
                <circle cx={bz.x + 53} cy="994" r="5" fill="#94a3b8" />
                <text x={bz.x + 53} y="1028" textAnchor="middle" fill="#e2e8f0" fontSize="8.5" fontWeight="700">{bz.title}</text>
                {['+', '-', 'S'].map((lbl, idx) => (
                  <g key={lbl}>
                    <circle cx={bz.base + idx * 27} cy="952" r="3.6" fill="#fbbf24" />
                    <text x={bz.base + idx * 27} y="966" textAnchor="middle" fill="#cbd5e1" fontSize="7" fontFamily="monospace">{lbl}</text>
                  </g>
                ))}
              </g>
            ))}

            {/* 13. MOTORES Y ACTUADORES EN LA GRÚA (Z3, Z6, Z8) */}
            {[
              { id: 'motor-cabrestante', title: 'MOTOR CABRESTANTE', sub: '12 V · 4 kg par · L298N OUT1/2', y: 42, h: 104, color: '#22c55e', status: 'POR CONFIRMAR' },
              { id: 'motor-giro', title: 'MOTOR GIRO GA25-370', sub: '12 V · 280 rpm · L298N OUT3/4', y: 170, h: 100, color: '#22c55e', status: 'POR CONFIRMAR' },
              { id: 'motor-carro', title: 'MOTOR CARRO JGB37-520', sub: '12 V PWM≤50% · Shield M1', y: 294, h: 100, color: '#22c55e', status: 'POR CONFIRMAR' },
            ].map((mot) => (
              <g
                key={mot.id}
                filter="url(#pcbShadow)"
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedModuleId(mot.id);
                }}
              >
                <rect x="1440" y={mot.y} width="292" height={mot.h} rx="8" fill="#0f172a" stroke={mot.color} strokeWidth="2" />
                {/* Silueta cilíndrica realista de motorreductor metálico */}
                <rect x="1464" y={mot.y + 18} width="108" height="36" rx="6" fill="url(#metalShield)" stroke="#475569" />
                <rect x="1572" y={mot.y + 22} width="32" height="28" rx="3" fill="#475569" />
                <rect x="1604" y={mot.y + 32} width="22" height="8" rx="1" fill="#e2e8f0" />
                <text x="1586" y={mot.y + 72} textAnchor="middle" fill="#f8fafc" fontSize="10.5" fontWeight="800">{mot.title}</text>
                <text x="1586" y={mot.y + 87} textAnchor="middle" fill="#94a3b8" fontSize="8.5">{mot.sub}</text>
                <circle cx="1446" cy={mot.y + 44} r="4.5" fill="#22c55e" stroke="#fff" />
                <circle cx="1446" cy={mot.y + 58} r="4.5" fill="#14532d" stroke="#86efac" />
              </g>
            ))}

            {/* Electroimán 12 V (POR COMPRAR) */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('electroiman');
              }}
            >
              <rect x="1440" y="418" width="292" height="96" rx="8" fill="#1e1b4b" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />
              <circle cx="1496" cy="466" r="24" fill="url(#metalShield)" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="1496" cy="466" r="12" fill="#475569" />
              <text x="1610" y="452" textAnchor="middle" fill="#fef3c7" fontSize="10.5" fontWeight="800">ELECTROIMÁN 12 V (Z6)</text>
              <text x="1610" y="468" textAnchor="middle" fill="#fcd34d" fontSize="8.5">POR COMPRAR · Shield M2</text>
              <text x="1610" y="484" textAnchor="middle" fill="#cbd5e1" fontSize="8">Pulso inverso ≤ 80 ms al soltar</text>
              <circle cx="1446" cy="458" r="4.5" fill="#22c55e" stroke="#fff" />
              <circle cx="1446" cy="472" r="4.5" fill="#14532d" stroke="#86efac" />
            </g>

            {/* Bombillo Corona Z8 */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('bombillo-corona');
              }}
            >
              <rect x="1440" y="538" width="292" height="92" rx="8" fill="#1e293b" stroke="#eab308" strokeWidth="2" />
              <circle cx="1496" cy="584" r="20" fill="#fef08a" stroke="#eab308" strokeWidth="2.5" />
              <circle cx="1496" cy="584" r="9" fill="#fde047" />
              <text x="1610" y="570" textAnchor="middle" fill="#fef08a" fontSize="10.5" fontWeight="800">BOMBILLO CORONA (Z8)</text>
              <text x="1610" y="586" textAnchor="middle" fill="#cbd5e1" fontSize="8.5">Shield M3 · PWM ≈ 40 % (4–5 V ef.)</text>
              <text x="1610" y="602" textAnchor="middle" fill="#fcd34d" fontSize="8">POR CONFIRMAR</text>
              <circle cx="1446" cy="576" r="4.5" fill="#22c55e" stroke="#fff" />
              <circle cx="1446" cy="590" r="4.5" fill="#14532d" stroke="#86efac" />
            </g>

            {/* 3 × FC-33 + discos N=12 */}
            {[
              { id: 'fc33-giro', title: 'FC-33 #1 GIRO (D34)', y: 652 },
              { id: 'fc33-carro', title: 'FC-33 #2 CARRO (D35)', y: 708 },
              { id: 'fc33-gancho', title: 'FC-33 #3 GANCHO (D32)', y: 764 },
            ].map((fc) => (
              <g
                key={fc.id}
                filter="url(#pcbShadow)"
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedModuleId(fc.id);
                }}
              >
                <rect x="1440" y={fc.y} width="292" height="50" rx="6" fill="#172554" stroke="#38bdf8" strokeWidth="1.6" />
                <text x="1552" y={fc.y + 22} textAnchor="middle" fill="#e0f2fe" fontSize="9.5" fontWeight="800">{fc.title}</text>
                <text x="1552" y={fc.y + 37} textAnchor="middle" fill="#fdba74" fontSize="8">VCC 3,3 V (R3) · GND · OUT directo</text>
                {/* Disco ranurado miniatura */}
                <circle cx="1696" cy={fc.y + 25} r="17" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" />
                <circle cx="1696" cy={fc.y + 25} r="4" fill="#e2e8f0" />
                <circle cx="1446" cy={fc.y + 14} r="3.5" fill="#fb923c" />
                <circle cx="1446" cy={fc.y + 26} r="3.5" fill="#18181b" stroke="#cbd5e1" />
                <circle cx="1446" cy={fc.y + 38} r="3.5" fill="#3b82f6" />
              </g>
            ))}

            {/* US-H y US-V (HC-SR04 realistas con malla plateada) */}
            {[
              { id: 'us-h', title: 'US-H (Z3)', x: 1440, sub: 'Div #1 → D23' },
              { id: 'us-v', title: 'US-V (Z6)', x: 1592, sub: 'Div #2 → D18' },
            ].map((us) => (
              <g
                key={us.id}
                filter="url(#pcbShadow)"
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedModuleId(us.id);
                }}
              >
                <rect x={us.x} y="840" width="140" height="106" rx="7" fill="#1d4ed8" stroke="#60a5fa" strokeWidth="2" />
                <circle cx={us.x + 40} cy="884" r="22" fill="url(#metalShield)" stroke="#1e293b" strokeWidth="2" />
                <circle cx={us.x + 40} cy="884" r="14" fill="#334155" stroke="#94a3b8" strokeDasharray="2 2" />
                <circle cx={us.x + 100} cy="884" r="22" fill="url(#metalShield)" stroke="#1e293b" strokeWidth="2" />
                <circle cx={us.x + 100} cy="884" r="14" fill="#334155" stroke="#94a3b8" strokeDasharray="2 2" />
                <text x={us.x + 70} y="857" textAnchor="middle" fill="#fff" fontSize="9.5" fontWeight="800">{us.title} · {us.sub}</text>
                {['VCC', 'TRG', 'ECH', 'GND'].map((lbl, idx) => (
                  <g key={lbl}>
                    <circle cx={us.x + 20 + idx * 32} cy="936" r="3.5" fill="#fbbf24" />
                    <text x={us.x + 20 + idx * 32} y="928" textAnchor="middle" fill="#dbeafe" fontSize="6.5" fontFamily="monospace">{lbl}</text>
                  </g>
                ))}
              </g>
            ))}

            {/* Hall KY-003 (Z5) */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('hall-ky003');
              }}
            >
              <rect x="1440" y="968" width="140" height="94" rx="7" fill="#18181b" stroke="#60a5fa" strokeWidth="1.8" />
              <text x="1510" y="1024" textAnchor="middle" fill="#93c5fd" fontSize="9.5" fontWeight="800">HALL KY-003 (Z5)</text>
              <text x="1510" y="1040" textAnchor="middle" fill="#cbd5e1" fontSize="8">5 V → Div #4 → D33</text>
              <circle cx="1460" cy="980" r="3.8" fill="#ef4444" />
              <circle cx="1498" cy="980" r="3.8" fill="#18181b" stroke="#e2e8f0" />
              <circle cx="1536" cy="980" r="3.8" fill="#3b82f6" />
              <text x="1460" y="995" textAnchor="middle" fill="#fca5a5" fontSize="7.5" fontFamily="monospace">+</text>
              <text x="1498" y="995" textAnchor="middle" fill="#cbd5e1" fontSize="7.5" fontFamily="monospace">-</text>
              <text x="1536" y="995" textAnchor="middle" fill="#93c5fd" fontSize="7.5" fontFamily="monospace">S</text>
            </g>

            {/* Pulsador HOME (Z3) */}
            <g
              filter="url(#pcbShadow)"
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedModuleId('pulsadores');
              }}
            >
              <rect x="1592" y="968" width="140" height="94" rx="7" fill="#0f172a" stroke="#34d399" strokeWidth="1.8" />
              <circle cx="1674" cy="1012" r="18" fill="#334155" stroke="#94a3b8" />
              <circle cx="1674" cy="1012" r="10" fill="#10b981" />
              <text x="1674" y="1049" textAnchor="middle" fill="#a7f3d0" fontSize="9" fontWeight="800">PULSADOR HOME (Z3)</text>
              <circle cx="1600" cy="996" r="4" fill="#3b82f6" stroke="#fff" />
              <circle cx="1600" cy="1028" r="4" fill="#18181b" stroke="#cbd5e1" />
            </g>

            {/* ================= CAPA DE CABLES ORTOGONALES ================= */}
            {mode === 'static' ? (
              <g>
                {staticVisibleWires.map((w) => {
                  const isMatchModule =
                    !selectedModuleId ||
                    w.conn.fromComponentId === selectedModuleId ||
                    w.conn.toComponentId === selectedModuleId;
                  const isMatchWire = !selectedWireId || w.conn.id === selectedWireId;
                  const isFocus =
                    (selectedWireId && w.conn.id === selectedWireId) ||
                    (selectedModuleId && isMatchModule);
                  const dim = (selectedModuleId && !isMatchModule) || (selectedWireId && !isMatchWire);

                  return (
                    <g
                      key={w.conn.id}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWireId(w.conn.id);
                      }}
                    >
                      {/* Borde oscuro para contraste sobre madera */}
                      <path
                        d={w.pathD}
                        fill="none"
                        stroke="#020617"
                        strokeWidth={isFocus ? 7.5 : 4.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity={dim ? 0.12 : 0.78}
                      />
                      <path
                        d={w.pathD}
                        fill="none"
                        stroke={w.color.stroke}
                        strokeWidth={isFocus ? 4.4 : 2.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeOpacity={dim ? 0.16 : 0.96}
                        filter={isFocus ? 'url(#wireGlow)' : undefined}
                      />
                      {w.secondaryPathD && (
                        <>
                          <path
                            d={w.secondaryPathD}
                            fill="none"
                            stroke="#020617"
                            strokeWidth={isFocus ? 7 : 4.4}
                            strokeLinecap="round"
                            strokeOpacity={dim ? 0.12 : 0.75}
                          />
                          <path
                            d={w.secondaryPathD}
                            fill="none"
                            stroke={w.color.stroke}
                            strokeWidth={isFocus ? 4 : 2.3}
                            strokeDasharray="8 4"
                            strokeLinecap="round"
                            strokeOpacity={dim ? 0.16 : 0.9}
                          />
                        </>
                      )}
                    </g>
                  );
                })}
              </g>
            ) : (
              /* MODO SIMULACIÓN / VÍDEO */
              <g>
                {activeStageSimItems.map((w, idx) => {
                  const stageIdx = STAGE_META.findIndex((s) => s.id === w.conn.stage);
                  const isCompleted =
                    granularity === 'connection' ? idx < stepIndex : stageIdx < stepIndex;
                  const isActive =
                    granularity === 'connection' ? idx === stepIndex : stageIdx === stepIndex;

                  if (!isCompleted && !isActive) return null;

                  if (isCompleted) {
                    return (
                      <g key={w.conn.id}>
                        <path
                          d={w.pathD}
                          fill="none"
                          stroke="#020617"
                          strokeWidth="4.4"
                          strokeLinecap="round"
                          strokeOpacity="0.65"
                        />
                        <path
                          d={w.pathD}
                          fill="none"
                          stroke={w.color.stroke}
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeOpacity="0.72"
                        />
                        {w.secondaryPathD && (
                          <path
                            d={w.secondaryPathD}
                            fill="none"
                            stroke={w.color.stroke}
                            strokeWidth="2"
                            strokeDasharray="8 4"
                            strokeOpacity="0.65"
                          />
                        )}
                      </g>
                    );
                  }

                  // Cable activo animado pin-a-pin
                  return (
                    <g key={`anim-${w.conn.id}-${stepIndex}`}>
                      <path
                        d={w.pathD}
                        fill="none"
                        stroke="#020617"
                        strokeWidth="8.5"
                        strokeLinecap="round"
                        pathLength={1}
                        className="workbench-wire-draw"
                      />
                      <path
                        d={w.pathD}
                        fill="none"
                        stroke={w.color.stroke}
                        strokeWidth="4.8"
                        strokeLinecap="round"
                        pathLength={1}
                        filter="url(#wireGlow)"
                        className="workbench-wire-draw"
                      />
                      {w.secondaryPathD && (
                        <path
                          d={w.secondaryPathD}
                          fill="none"
                          stroke={w.color.stroke}
                          strokeWidth="4"
                          strokeLinecap="round"
                          pathLength={1}
                          className="workbench-wire-draw"
                        />
                      )}

                      {/* Anillos luminosos de origen y destino */}
                      <circle cx={w.from.x} cy={w.from.y} r="9" fill="none" stroke={w.color.glow} strokeWidth="2.5" />
                      <circle cx={w.from.x} cy={w.from.y} r="4.5" fill="#ffffff" />

                      <circle cx={w.to.x} cy={w.to.y} r="10" fill="none" stroke="#fef08a" strokeWidth="2.8" />
                      <circle cx={w.to.x} cy={w.to.y} r="5" fill="#fde047" />
                    </g>
                  );
                })}
              </g>
            )}
          </svg>
        </div>

        {/* HUD flotante del cable activo en Modo Simulación */}
        {mode === 'simulation' && activeConnectionWire && (
          <div className="bg-[#0B1120]/95 border-t border-slate-800 px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono font-bold text-emerald-400 tabular-nums">
                  {activeConnectionWire.conn.id}
                </span>
                <span className="text-slate-500">·</span>
                <span className="font-semibold text-amber-300">
                  Etapa {activeConnectionWire.conn.stage}
                </span>
                <span className="text-slate-500">·</span>
                <span className="font-semibold text-white">
                  {activeConnectionWire.conn.fromComponentName}{' '}
                  <span className="font-mono text-sky-300">({activeConnectionWire.conn.fromPin})</span>
                  {' → '}
                  {activeConnectionWire.conn.toComponentName}{' '}
                  <span className="font-mono text-emerald-300">({activeConnectionWire.conn.toPin})</span>
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                <span>
                  Voltaje: <strong className="text-white">{activeConnectionWire.conn.voltage}</strong>
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-3 h-1.5 inline-block rounded-sm border border-white/30"
                    style={{ backgroundColor: activeConnectionWire.color.stroke }}
                  />
                  Color: <strong className="text-white">{activeConnectionWire.conn.wireColor}</strong>
                </span>
                <span>·</span>
                <span>
                  Tipo: <strong className="text-white">{activeConnectionWire.conn.jumperType}</strong>
                </span>
                {activeConnectionWire.conn.breadboardCoord && (
                  <>
                    <span>·</span>
                    <span className="font-mono text-amber-200">
                      Coord: {activeConnectionWire.conn.breadboardCoord}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="text-xs text-slate-200 bg-slate-900/90 border border-slate-700/80 rounded-lg px-3 py-2 shrink-0 max-w-md">
              <span className="text-slate-400">Nota: </span>
              {activeConnectionWire.conn.notes}
            </div>
          </div>
        )}
      </div>

      {/* Inspector interactivo debajo de la mesa en Modo Estático */}
      {mode === 'static' && (
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>
                Mostrando <strong className="text-white tabular-nums">{staticVisibleWires.length}</strong> de{' '}
                <strong className="text-white tabular-nums">{resolvedWires.length}</strong> conexiones reales.
                Haz clic en cualquier placa o cable sobre la madera para aislarlo e inspeccionar sus pines.
              </span>
            </div>
            {(selectedModuleId || selectedWireId) && (
              <button
                onClick={() => {
                  setSelectedModuleId(null);
                  setSelectedWireId(null);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 whitespace-nowrap"
              >
                Limpiar selección
              </button>
            )}
          </div>

          {inspectedWire && (
            <div className="rounded-lg bg-[#080E1A] border border-emerald-500/40 p-3 text-xs flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono font-bold text-emerald-400">{inspectedWire.conn.id}</span> ·{' '}
                <strong className="text-white">
                  {inspectedWire.conn.fromComponentName} ({inspectedWire.conn.fromPin}) →{' '}
                  {inspectedWire.conn.toComponentName} ({inspectedWire.conn.toPin})
                </strong>{' '}
                · <span className="text-sky-300">{inspectedWire.conn.voltage}</span> ·{' '}
                <span className="text-slate-300">{inspectedWire.conn.notes}</span>
              </div>
              <span className="font-mono text-[11px] text-amber-300">{inspectedWire.conn.jumperType}</span>
            </div>
          )}

          {inspectedModule && (
            <div className="space-y-2">
              <div className="text-xs font-bold text-white">
                Placa seleccionada: {inspectedModule.label} ({inspectedModule.zone}) —{' '}
                {inspectedModuleConnections.length} conexiones asociadas
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {inspectedModuleConnections.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedWireId(c.id)}
                    className={`text-left rounded-lg border px-3 py-2 text-[11px] transition ${
                      selectedWireId === c.id
                        ? 'bg-emerald-950/50 border-emerald-500 text-white'
                        : 'bg-[#080E1A] border-slate-800 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-mono font-bold text-emerald-400">
                      {c.id} · {c.stage} · {c.voltage}
                    </div>
                    <div className="text-slate-100 mt-0.5 truncate">
                      {c.fromComponentName} ({c.fromPin}) → {c.toComponentName} ({c.toPin})
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
