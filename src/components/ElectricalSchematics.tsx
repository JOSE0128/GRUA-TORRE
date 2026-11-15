import React, { useState } from 'react';
import {
  BREADBOARD_LAYOUT,
  DEFAULT_PIN_ASSIGNMENTS,
  VOLTAGE_DIVIDERS,
} from '../data/craneData';
import { PinAssignment } from '../types/crane';
import { StatusChip } from './StatusChip';
import { WorkbenchWiringPlan } from './WorkbenchWiringPlan';

export interface SchematicPlateSpec {
  id: number;
  title: string;
  description: string;
  operation: string;
}

export const SCHEMATIC_PLATES: SchematicPlateSpec[] = [
  {
    id: 1,
    title: 'Lámina 1. Diagrama de Bloques del Sistema',
    description:
      'Muestra la arquitectura completa dividida en dominio lógico de 5 V / 3,3 V (fuente 5 V 3 A, ESP32, Arduino UNO) y dominio de potencia de 12 V (fuente 12 V 2 A, interruptor general en serie, L298N y Shield L293D) unidos por un único punto de masa común.',
    operation:
      'La tablet (WiFi) y el mando (Bluetooth) envían órdenes al ESP32; este lee sensores de 3,3 V y sensores de 5 V (vía divisores), gobierna el L298N (cabrestante y giro) y coordina por UART con el UNO para mover el carro (M1), electroimán (M2), bombillo (M3), LCD y buzzers.',
  },
  {
    id: 2,
    title: 'Lámina 2. Potencia y Masas (5 V, 12 V, R1/R2/R3 e Interruptor)',
    description:
      'Detalla el cableado eléctrico de alimentación en Z1: adaptador 12 V 2 A → interruptor general → L298N (+12V) y Shield (+M EXT_PWR con puente PWR retirado); fuente 5 V 3 A → riel R2 de P1 → ESP32 VIN, UNO 5V y L298N 5V (puente 5V-EN retirado).',
    operation:
      'El pin 3V3 del ESP32 alimenta el riel R3 (+3,3 V) de P2 sin tocar jamás R2 (+5 V). Ambos negativos (5 V y 12 V) convergen al riel R1 de P1, unido con 1 jumper negro a R1 de P2 como único nodo de masa común. Para subir código por USB se desconectan los cables de R2 hacia VIN y 5V.',
  },
  {
    id: 3,
    title: 'Lámina 3. ESP32 + Puente H L298N + Motores de Cabrestante y Giro',
    description:
      'Presenta el bloque de potencia de alto par gobernado por el ESP32: pines D25 (ENA), D26 (IN1) y D27 (IN2) hacia el Canal A (OUT1/OUT2 → cabrestante); pines D14 (ENB), D13 (IN3) y D4 (IN4) hacia el Canal B (OUT3/OUT4 → motor de giro GA25-370).',
    operation:
      'Con los puentes ENA y ENB retirados del L298N, el ESP32 regula la velocidad mediante PWM de 3,3 V (compatible con las entradas TTL del L298N, que reconocen HIGH desde 2,3 V) e invierte el sentido alternando IN1/IN2 o IN3/IN4 sin sobrepasar 2 A por canal.',
  },
  {
    id: 4,
    title: 'Lámina 4. Arduino UNO + Shield L293D (M1, M2, M3 y Pines Reservados)',
    description:
      'Dibuja el conjunto acoplado Arduino UNO + Shield DK Electronics v1.0 como una sola pieza. Señala en rojo los pines reservados por el shield (D3–D8, D11, D12) que nunca deben usarse y muestra los bornes M1 (carro), M2 (electroimán), M3 (bombillo) y M4 (libre).',
    operation:
      'El shield aísla sus 12 V por EXT_PWR (puente PWR retirado). M1 limita el carro a PWM ≤ 50 % (< 0,6 A); M2 acciona el electroimán y aplica un pulso inverso ≤ 80 ms al soltar para desmagnetizarlo; M3 alimenta el bombillo con PWM ≈ 40 % para entregar 4–5 V efectivos.',
  },
  {
    id: 5,
    title: 'Lámina 5. Sensores y Divisores de Tensión (3 × FC-33, US-H, US-V, Hall y HOME)',
    description:
      'Representa todos los sensores con su tensión real: los tres FC-33 alimentados a 3,3 V (R3) conectan directo a D34, D35 y D32; US-H, US-V y Hall KY-003 alimentados a 5 V (R2) pasan por los divisores #1 (c=5), #2 (c=17) y #4 (c=41) hacia D23, D18 y D33; HOME usa pull-up externo de 1 kΩ en D39.',
    operation:
      'Cada divisor usa tres resistencias de 1 kΩ en P2 (Vout = 5 × 2 ÷ 3 = 3,33 V) protegiendo las entradas de 3,3 V del ESP32. El pulsador PARO va directo de D12 a GND usando únicamente pull-up interna (prohibida resistencia externa en pin de arranque D12).',
  },
  {
    id: 6,
    title: 'Lámina 6. Pantallas (LCD, OLED A y B), Botones, Potenciómetros, Buzzers y Kit LED',
    description:
      'Agrupa la interfaz de usuario en la tapa de la caja Z1: OLED A en D21/D22 (R3), OLED B en D16/D17 (R3), LCD 1602 en A4/A5 del UNO (R2), Pot 1 en D36, Pot 2 en A2, botones Pestaña A/B en D2/D9 del UNO, 3 buzzers KY-012 en D10/D13/A3 y el kit LED por sonido.',
    operation:
      'Las dos OLED comparten dirección I2C 0x3C pero conviven sin conflicto gracias a los dos buses hardware independientes del ESP32. Los botones A y B informan al UNO para cambiar las pestañas de OLED A (3 vistas) y OLED B (2 vistas) mediante el enlace serial.',
  },
  {
    id: 7,
    title: 'Lámina 7. Enlace Serial UART ESP32 ↔ Arduino UNO (Divisor #3 + Jumper Desmontable)',
    description:
      'Esquematiza la comunicación bidireccional asíncrona entre el ESP32 (3,3 V) y el Arduino UNO (5 V): línea directa desde ESP32 D15 (TX) hacia UNO A0 (RX), y línea de retorno desde UNO A1 (TX, 5 V) pasando por el Divisor #3 (cols 29–38 de P2) hacia ESP32 D2 (RX).',
    operation:
      'El UNO acepta 3,3 V como nivel lógico alto sin adaptador en A0. En el sentido inverso, el Divisor #3 reduce los 5 V de A1 a 3,33 V en el nodo (32, c) antes de entrar a D2; su cable incluye un jumper desmontable para desconectar D2 (pin de arranque) al cargar firmware por USB.',
  },
  {
    id: 8,
    title: 'Lámina 8. Manguera del Mástil (22 Hilos), Bornera Z3, Rizo y Tramo B (9 Hilos)',
    description:
      'Detalla la transición física desde la caja fija Z1, subiendo por el interior del mástil hueco Z2 hasta la cabeza giratoria Z3 (rizo de ≥ 1,5 vueltas, Ø 6–8 cm, reserva ≥ 40 cm + 15 cm por extremo) y la bornera que deriva los 9 hilos del Tramo B al carro Z5 y gancho Z6.',
    operation:
      'Agrupa los 22 hilos en 10 de potencia (verde), 9 de señal (azul) y 3 comunes (GND negro, +3,3 V naranja, +5 V rojo). Al girar entre topes mecánicos de 0° a 360°, el rizo absorbe una vuelta completa sin fatigar el cobre ni superar el radio mínimo de curvatura (≥ 5× diámetro).',
  },
];

export const WireLegend: React.FC<{ light?: boolean }> = ({ light = false }) => (
  <div
    className={`flex flex-wrap items-center gap-4 text-[11px] px-3 py-2 rounded-lg border ${
      light
        ? 'bg-slate-50 border-slate-300 text-slate-800'
        : 'bg-[#080E1A] border-slate-800 text-slate-300'
    }`}
  >
    <span className="font-semibold">Leyenda de cables:</span>
    <span className="inline-flex items-center gap-1.5">
      <span className="w-4 h-1 bg-red-500 inline-block" /> Rojo (+5 V)
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="w-4 h-1 bg-orange-500 inline-block" /> Naranja (+3,3 V o +12 V rotulado)
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="w-4 h-1 bg-slate-950 border border-slate-500 inline-block" /> Negro (GND común)
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="w-4 h-1 bg-blue-500 inline-block" /> Azul (Señal)
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="w-4 h-1 bg-emerald-500 inline-block" /> Verde (PWM / Potencia motores)
    </span>
    <span className="inline-flex items-center gap-1.5">
      <span className="w-4 h-1 bg-amber-400 inline-block" /> Amarillo (I2C / UART)
    </span>
  </div>
);

export const SchematicSvg: React.FC<{ plateId: number; lightTheme?: boolean }> = ({
  plateId,
  lightTheme = false,
}) => {
  const bg = lightTheme ? '#ffffff' : '#080e1a';
  const boxFill = lightTheme ? '#f8fafc' : '#0f172a';
  const boxStroke = lightTheme ? '#334155' : '#475569';
  const textMain = lightTheme ? '#0f172a' : '#f8fafc';
  const textSub = lightTheme ? '#475569' : '#94a3b8';
  const gndStroke = lightTheme ? '#0f172a' : '#e2e8f0';

  if (plateId === 1) {
    return (
      <svg viewBox="0 0 860 360" className="w-full h-auto">
        <rect x="0" y="0" width="860" height="360" fill={bg} rx="6" />
        {/* Tablet + Mando */}
        <rect x="25" y="30" width="145" height="68" rx="6" fill={boxFill} stroke="#3b82f6" strokeWidth="1.8" />
        <text x="97" y="57" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">Tablet (WiFi)</text>
        <text x="97" y="74" textAnchor="middle" fill={textSub} fontSize="9.5">Modo Automático (r, θ, z)</text>
        <rect x="25" y="120" width="145" height="68" rx="6" fill={boxFill} stroke="#3b82f6" strokeWidth="1.8" />
        <text x="97" y="147" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">Mando Bluetooth</text>
        <text x="97" y="164" textAnchor="middle" fill={textSub} fontSize="9.5">Modo Manual (Bluepad32)</text>

        {/* Orthogonal links to ESP32 */}
        <path d="M170,64 L230,64 L230,105 L270,105" fill="none" stroke="#eab308" strokeWidth="2.2" strokeDasharray="5 3" />
        <path d="M170,154 L230,154 L230,130 L270,130" fill="none" stroke="#eab308" strokeWidth="2.2" strokeDasharray="5 3" />

        {/* ESP32 Cerebro */}
        <rect x="270" y="55" width="185" height="145" rx="6" fill={boxFill} stroke="#f97316" strokeWidth="2" />
        <text x="362" y="80" textAnchor="middle" fill={textMain} fontSize="12" fontWeight="700">ESP32 DevKit (3,3 V)</text>
        <text x="362" y="98" textAnchor="middle" fill={textSub} fontSize="9.5">3×FC-33 · US-H/V · Hall · HOME</text>
        <text x="362" y="114" textAnchor="middle" fill={textSub} fontSize="9.5">OLED A (D21/22) · OLED B (D16/17)</text>
        <text x="362" y="130" textAnchor="middle" fill={textSub} fontSize="9.5">Pot 1 (D36) · PARO (D12)</text>
        <text x="362" y="148" textAnchor="middle" fill="#f97316" fontSize="9.5" fontWeight="600">4 Divisores 1kΩ en P2</text>
        <text x="362" y="182" textAnchor="middle" fill={textSub} fontSize="9">D15 TX / D2 RX (Div #3)</text>

        {/* UART to UNO */}
        <path d="M362,200 L362,238" fill="none" stroke="#eab308" strokeWidth="2.5" />
        <text x="372" y="224" fill="#eab308" fontSize="9" fontWeight="600">UART (POR DEFINIR)</text>

        {/* UNO + Shield */}
        <rect x="270" y="238" width="185" height="96" rx="6" fill={boxFill} stroke="#ef4444" strokeWidth="2" />
        <text x="362" y="260" textAnchor="middle" fill={textMain} fontSize="11.5" fontWeight="700">UNO + Shield L293D (5 V)</text>
        <text x="362" y="278" textAnchor="middle" fill={textSub} fontSize="9.5">LCD 1602 (A4/A5) · Pot 2 (A2)</text>
        <text x="362" y="294" textAnchor="middle" fill={textSub} fontSize="9.5">Botones A/B (D2/D9) · 3 Buzzers</text>
        <text x="362" y="314" textAnchor="middle" fill="#22c55e" fontSize="9.5" fontWeight="600">M1 Carro · M2 Imán · M3 Bombillo</text>

        {/* L298N */}
        <rect x="530" y="65" width="150" height="100" rx="6" fill={boxFill} stroke="#22c55e" strokeWidth="2" />
        <text x="605" y="90" textAnchor="middle" fill={textMain} fontSize="11.5" fontWeight="700">Puente H L298N</text>
        <text x="605" y="108" textAnchor="middle" fill={textSub} fontSize="9.5">Canal A: Cabrestante</text>
        <text x="605" y="124" textAnchor="middle" fill={textSub} fontSize="9.5">Canal B: Motor Giro</text>
        <text x="605" y="144" textAnchor="middle" fill="#f97316" fontSize="9">Potencia 12 V / Lógica 5 V</text>
        <path d="M455,112 L530,112" fill="none" stroke="#22c55e" strokeWidth="2.4" />

        {/* Fuentes */}
        <rect x="530" y="215" width="150" height="52" rx="6" fill={boxFill} stroke="#f97316" strokeWidth="1.8" />
        <text x="605" y="238" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">Fuente 12 V 2 A</text>
        <text x="605" y="254" textAnchor="middle" fill={textSub} fontSize="9">Interruptor gral → Motores</text>
        <path d="M605,215 L605,165" fill="none" stroke="#f97316" strokeWidth="2.2" />
        <path d="M530,245 L495,245 L495,295 L455,295" fill="none" stroke="#f97316" strokeWidth="2.2" />

        <rect x="530" y="282" width="150" height="52" rx="6" fill={boxFill} stroke="#ef4444" strokeWidth="1.8" />
        <text x="605" y="305" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">Fuente 5 V 3 A</text>
        <text x="605" y="321" textAnchor="middle" fill={textSub} fontSize="9">Solo lógica (R2) + Masa R1</text>
        <path d="M530,308 L455,308" fill="none" stroke="#ef4444" strokeWidth="2" />

        {/* Actuadores Z3..Z8 */}
        <rect x="720" y="65" width="118" height="265" rx="6" fill={boxFill} stroke={boxStroke} strokeWidth="1.8" />
        <text x="779" y="90" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">Grúa (Z2–Z8)</text>
        <text x="779" y="116" textAnchor="middle" fill="#22c55e" fontSize="9.5">Cabrestante</text>
        <text x="779" y="138" textAnchor="middle" fill="#22c55e" fontSize="9.5">Motor Giro</text>
        <text x="779" y="195" textAnchor="middle" fill="#22c55e" fontSize="9.5">Motor Carro (M1)</text>
        <text x="779" y="220" textAnchor="middle" fill="#22c55e" fontSize="9.5">Electroimán (M2)</text>
        <text x="779" y="245" textAnchor="middle" fill="#22c55e" fontSize="9.5">Bombillo Z8 (M3)</text>
        <text x="779" y="285" textAnchor="middle" fill="#eab308" fontSize="9">Bodega Z7 PIR</text>
        <text x="779" y="300" textAnchor="middle" fill={textSub} fontSize="8.5">(Autónoma c/ litio)</text>
        <path d="M680,115 L720,115" fill="none" stroke="#22c55e" strokeWidth="2.4" />
        <path d="M455,270 L505,270 L505,195 L720,195" fill="none" stroke="#22c55e" strokeWidth="2.2" />
      </svg>
    );
  }

  if (plateId === 2) {
    return (
      <svg viewBox="0 0 860 360" className="w-full h-auto">
        <rect x="0" y="0" width="860" height="360" fill={bg} rx="6" />
        {/* Fuente 12V + Interruptor */}
        <rect x="25" y="30" width="145" height="65" rx="5" fill={boxFill} stroke="#f97316" strokeWidth="2" />
        <text x="97" y="54" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">Fuente 12 V 2 A</text>
        <text x="97" y="72" textAnchor="middle" fill="#f97316" fontSize="9.5">+12 V (centro) / − GND</text>

        <rect x="220" y="30" width="135" height="52" rx="5" fill={boxFill} stroke="#f97316" strokeWidth="2" />
        <text x="287" y="53" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">Interruptor General</text>
        <text x="287" y="69" textAnchor="middle" fill={textSub} fontSize="9">En serie (+12 V)</text>
        <path d="M170,48 L220,48" fill="none" stroke="#f97316" strokeWidth="2.5" />

        {/* Línea 12V a L298N y Shield */}
        <path d="M355,48 L460,48 L460,55" fill="none" stroke="#f97316" strokeWidth="2.5" />
        <path d="M415,48 L415,155 L460,155" fill="none" stroke="#f97316" strokeWidth="2.5" />

        {/* Fuente 5V */}
        <rect x="25" y="130" width="145" height="65" rx="5" fill={boxFill} stroke="#ef4444" strokeWidth="2" />
        <text x="97" y="155" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">Fuente 5 V 3 A</text>
        <text x="97" y="173" textAnchor="middle" fill="#ef4444" fontSize="9.5">+5 V / − GND</text>

        {/* Protoboard P1 (R1 GND, R2 +5V) */}
        <rect x="25" y="235" width="320" height="95" rx="5" fill={boxFill} stroke={boxStroke} strokeWidth="1.8" />
        <text x="185" y="255" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">Protoboard P1 (830 pts)</text>
        <line x1="40" y1="274" x2="330" y2="274" stroke={gndStroke} strokeWidth="3.5" />
        <text x="45" y="269" fill={textSub} fontSize="9.5">Riel R1 (−) = GND COMÚN (0 V)</text>
        <line x1="40" y1="306" x2="330" y2="306" stroke="#ef4444" strokeWidth="3.5" />
        <text x="45" y="300" fill="#ef4444" fontSize="9.5">Riel R2 (+) = +5 V SOLO LÓGICA</text>

        {/* Negativos 12V y 5V a R1 */}
        <path d="M170,78 L195,78 L195,274 L185,274" fill="none" stroke={gndStroke} strokeWidth="2.2" />
        <path d="M170,175 L185,175 L185,274" fill="none" stroke={gndStroke} strokeWidth="2.2" />
        {/* +5V a R2 */}
        <path d="M170,150 L210,150 L210,306" fill="none" stroke="#ef4444" strokeWidth="2.4" />

        {/* Protoboard P2 (R1 GND, R3 +3.3V) */}
        <rect x="460" y="235" width="370" height="95" rx="5" fill={boxFill} stroke={boxStroke} strokeWidth="1.8" />
        <text x="645" y="255" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">Protoboard P2 (830 pts)</text>
        <line x1="475" y1="274" x2="815" y2="274" stroke={gndStroke} strokeWidth="3.5" />
        <text x="480" y="269" fill={textSub} fontSize="9.5">Riel R1 (−) = GND COMÚN</text>
        <line x1="475" y1="306" x2="815" y2="306" stroke="#f97316" strokeWidth="3.5" />
        <text x="480" y="300" fill="#f97316" fontSize="9.5">Riel R3 (+) = +3,3 V (desde ESP32 3V3 — NUNCA TOCA R2)</text>

        {/* Puente único R1 P1 <-> R1 P2 */}
        <path d="M330,274 L475,274" fill="none" stroke={gndStroke} strokeWidth="3" />
        <text x="402" y="267" textAnchor="middle" fill={textMain} fontSize="9" fontWeight="700">1 Jumper GND</text>

        {/* L298N, Shield, ESP32, UNO */}
        <rect x="460" y="30" width="170" height="72" rx="5" fill={boxFill} stroke={boxStroke} strokeWidth="1.8" />
        <text x="545" y="52" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">L298N (5V-EN RETIRADO)</text>
        <text x="545" y="70" textAnchor="middle" fill={textSub} fontSize="9">Bornes: 12V | GND | 5V (entrada)</text>
        <text x="545" y="86" textAnchor="middle" fill="#ef4444" fontSize="8.5">R2 → 5V · R1 → GND</text>

        <rect x="460" y="128" width="170" height="72" rx="5" fill={boxFill} stroke={boxStroke} strokeWidth="1.8" />
        <text x="545" y="150" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">UNO + Shield (PWR RETIRADO)</text>
        <text x="545" y="168" textAnchor="middle" fill={textSub} fontSize="9">+M EXT_PWR (12V) | GND</text>
        <text x="545" y="184" textAnchor="middle" fill="#ef4444" fontSize="8.5">UNO pin 5V ← R2 (quitar con USB)</text>

        <rect x="665" y="80" width="165" height="90" rx="5" fill={boxFill} stroke="#f97316" strokeWidth="1.8" />
        <text x="747" y="103" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">ESP32 (30 pines)</text>
        <text x="747" y="121" textAnchor="middle" fill="#ef4444" fontSize="9">VIN ← R2 (quitar con USB)</text>
        <text x="747" y="137" textAnchor="middle" fill="#f97316" fontSize="9">Pin 3V3 → Riel R3</text>
        <text x="747" y="153" textAnchor="middle" fill={textSub} fontSize="9">GND → Riel R1</text>
        <path d="M747,170 L747,306" fill="none" stroke="#f97316" strokeWidth="2.2" />
      </svg>
    );
  }

  if (plateId === 3) {
    return (
      <svg viewBox="0 0 860 340" className="w-full h-auto">
        <rect x="0" y="0" width="860" height="340" fill={bg} rx="6" />
        {/* ESP32 */}
        <rect x="40" y="45" width="200" height="250" rx="6" fill={boxFill} stroke="#38bdf8" strokeWidth="2" />
        <text x="140" y="70" textAnchor="middle" fill={textMain} fontSize="12" fontWeight="700">ESP32 DevKit (3,3 V)</text>
        <text x="225" y="104" textAnchor="end" fill="#22c55e" fontSize="10" fontFamily="monospace">D25 (ENA)</text>
        <text x="225" y="128" textAnchor="end" fill="#3b82f6" fontSize="10" fontFamily="monospace">D26 (IN1)</text>
        <text x="225" y="152" textAnchor="end" fill="#3b82f6" fontSize="10" fontFamily="monospace">D27 (IN2)</text>
        <text x="225" y="196" textAnchor="end" fill="#22c55e" fontSize="10" fontFamily="monospace">D14 (ENB)</text>
        <text x="225" y="220" textAnchor="end" fill="#3b82f6" fontSize="10" fontFamily="monospace">D13 (IN3)</text>
        <text x="225" y="244" textAnchor="end" fill="#3b82f6" fontSize="10" fontFamily="monospace">D4  (IN4)</text>
        <text x="225" y="274" textAnchor="end" fill={textSub} fontSize="9.5" fontFamily="monospace">GND → R1</text>

        {/* Canales ortogonales */}
        <path d="M240,100 L350,100" fill="none" stroke="#22c55e" strokeWidth="2.4" />
        <path d="M240,124 L350,124" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d="M240,148 L350,148" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d="M240,192 L350,192" fill="none" stroke="#22c55e" strokeWidth="2.4" />
        <path d="M240,216 L350,216" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d="M240,240 L350,240" fill="none" stroke="#3b82f6" strokeWidth="2" />

        {/* L298N */}
        <rect x="350" y="45" width="230" height="250" rx="6" fill={boxFill} stroke="#ef4444" strokeWidth="2" />
        <text x="465" y="70" textAnchor="middle" fill={textMain} fontSize="12" fontWeight="700">L298N (Puentes ENA/ENB/5V-EN quitados)</text>
        <text x="362" y="104" fill="#22c55e" fontSize="10" fontFamily="monospace">ENA</text>
        <text x="362" y="128" fill="#3b82f6" fontSize="10" fontFamily="monospace">IN1</text>
        <text x="362" y="152" fill="#3b82f6" fontSize="10" fontFamily="monospace">IN2</text>
        <text x="362" y="196" fill="#22c55e" fontSize="10" fontFamily="monospace">ENB</text>
        <text x="362" y="220" fill="#3b82f6" fontSize="10" fontFamily="monospace">IN3</text>
        <text x="362" y="244" fill="#3b82f6" fontSize="10" fontFamily="monospace">IN4</text>

        <text x="568" y="112" textAnchor="end" fill="#22c55e" fontSize="10" fontFamily="monospace">OUT1 / OUT2 (Canal A)</text>
        <text x="568" y="212" textAnchor="end" fill="#22c55e" fontSize="10" fontFamily="monospace">OUT3 / OUT4 (Canal B)</text>
        <text x="465" y="276" textAnchor="middle" fill="#f97316" fontSize="9.5">Bornes: 12V (Int.) · GND (R1) · 5V (R2)</text>

        {/* Motores */}
        <path d="M580,104 L665,104" fill="none" stroke="#22c55e" strokeWidth="2.5" />
        <path d="M580,120 L665,120" fill="none" stroke="#22c55e" strokeWidth="2.5" />
        <rect x="665" y="75" width="165" height="72" rx="6" fill={boxFill} stroke="#22c55e" strokeWidth="2" />
        <text x="747" y="102" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">Motor Cabrestante</text>
        <text x="747" y="120" textAnchor="middle" fill={textSub} fontSize="9.5">12 V · 4 kg par · Z3</text>
        <text x="747" y="135" textAnchor="middle" fill="#22c55e" fontSize="9">Tramo A (2 hilos)</text>

        <path d="M580,204 L665,204" fill="none" stroke="#22c55e" strokeWidth="2.5" />
        <path d="M580,220 L665,220" fill="none" stroke="#22c55e" strokeWidth="2.5" />
        <rect x="665" y="175" width="165" height="72" rx="6" fill={boxFill} stroke="#22c55e" strokeWidth="2" />
        <text x="747" y="202" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">Motor Giro GA25-370</text>
        <text x="747" y="220" textAnchor="middle" fill={textSub} fontSize="9.5">12 V · 280 rpm · Z3</text>
        <text x="747" y="235" textAnchor="middle" fill="#22c55e" fontSize="9">Tramo A (2 hilos)</text>
      </svg>
    );
  }

  if (plateId === 4) {
    return (
      <svg viewBox="0 0 860 350" className="w-full h-auto">
        <rect x="0" y="0" width="860" height="350" fill={bg} rx="6" />
        <rect x="40" y="35" width="380" height="280" rx="6" fill={boxFill} stroke="#3b82f6" strokeWidth="2" />
        <text x="230" y="60" textAnchor="middle" fill={textMain} fontSize="12" fontWeight="700">
          Arduino UNO + Shield L293D (una sola pieza)
        </text>
        <text x="230" y="78" textAnchor="middle" fill="#f97316" fontSize="9.5" fontWeight="600">
          Jumper PWR RETIRADO · +M EXT_PWR ← 12 V Interruptor
        </text>

        {/* Pines reservados en rojo */}
        <rect x="58" y="95" width="160" height="100" rx="4" fill="#450a0a" stroke="#ef4444" strokeWidth="1.5" />
        <text x="138" y="115" textAnchor="middle" fill="#fca5a5" fontSize="10" fontWeight="700">
          PINES PROHIBIDOS (SHIELD)
        </text>
        <text x="138" y="136" textAnchor="middle" fill="#fecaca" fontSize="10" fontFamily="monospace">
          D3, D4, D5, D6
        </text>
        <text x="138" y="154" textAnchor="middle" fill="#fecaca" fontSize="10" fontFamily="monospace">
          D7, D8, D11, D12
        </text>
        <text x="138" y="178" textAnchor="middle" fill="#fca5a5" fontSize="8.5">
          Uso interno L293D / 74HC595
        </text>

        {/* Pines libres */}
        <rect x="58" y="208" width="160" height="90" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="1.5" />
        <text x="138" y="228" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontWeight="700">
          PINES LIBRES USADOS
        </text>
        <text x="138" y="248" textAnchor="middle" fill="#d1fae5" fontSize="9.5" fontFamily="monospace">
          A0(RX), A1(TX), A2(Pot2)
        </text>
        <text x="138" y="265" textAnchor="middle" fill="#d1fae5" fontSize="9.5" fontFamily="monospace">
          A3(Buz3), A4/A5(LCD)
        </text>
        <text x="138" y="282" textAnchor="middle" fill="#d1fae5" fontSize="9.5" fontFamily="monospace">
          D2, D9, D10, D13
        </text>

        {/* Bornes M1..M4 */}
        <text x="405" y="102" textAnchor="end" fill="#22c55e" fontSize="10.5" fontFamily="monospace" fontWeight="700">Borne M1 →</text>
        <text x="405" y="172" textAnchor="end" fill="#22c55e" fontSize="10.5" fontFamily="monospace" fontWeight="700">Borne M2 →</text>
        <text x="405" y="242" textAnchor="end" fill="#22c55e" fontSize="10.5" fontFamily="monospace" fontWeight="700">Borne M3 →</text>
        <text x="405" y="294" textAnchor="end" fill={textSub} fontSize="10.5" fontFamily="monospace">Borne M4 (LIBRE)</text>

        {/* Actuadores */}
        <path d="M420,98 L540,98" fill="none" stroke="#22c55e" strokeWidth="2.5" />
        <rect x="540" y="65" width="275" height="58" rx="5" fill={boxFill} stroke="#22c55e" strokeWidth="1.8" />
        <text x="677" y="88" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">M1: Motor Carro JGB37-520 (Z3)</text>
        <text x="677" y="106" textAnchor="middle" fill={textSub} fontSize="9.5">12 V PWM ≤ 50 % (L293D máx. 0,6 A continuos)</text>

        <path d="M420,168 L540,168" fill="none" stroke="#22c55e" strokeWidth="2.5" />
        <rect x="540" y="138" width="275" height="58" rx="5" fill={boxFill} stroke="#f59e0b" strokeWidth="1.8" />
        <text x="677" y="161" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">M2: Electroimán 12 V (Z6 — POR COMPRAR)</text>
        <text x="677" y="179" textAnchor="middle" fill={textSub} fontSize="9.5">Al soltar: pulso inverso ≤ 80 ms para desmagnetizar</text>

        <path d="M420,238 L540,238" fill="none" stroke="#22c55e" strokeWidth="2.5" />
        <rect x="540" y="210" width="275" height="58" rx="5" fill={boxFill} stroke="#eab308" strokeWidth="1.8" />
        <text x="677" y="233" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">M3: Bombillo con Plafón (Corona Z8)</text>
        <text x="677" y="251" textAnchor="middle" fill={textSub} fontSize="9.5">PWM ≈ 40 % → medir 4–5 V efectivos</text>
      </svg>
    );
  }

  if (plateId === 5) {
    return (
      <svg viewBox="0 0 860 360" className="w-full h-auto">
        <rect x="0" y="0" width="860" height="360" fill={bg} rx="6" />
        {/* Sensores 3.3V sin divisor */}
        <rect x="25" y="25" width="230" height="110" rx="5" fill={boxFill} stroke="#f97316" strokeWidth="1.8" />
        <text x="140" y="47" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">3 × FC-33 (a 3,3 V Riel R3)</text>
        <text x="140" y="67" textAnchor="middle" fill="#3b82f6" fontSize="9.5">FC-33 Giro OUT → Directo D34</text>
        <text x="140" y="85" textAnchor="middle" fill="#3b82f6" fontSize="9.5">FC-33 Carro OUT → Directo D35</text>
        <text x="140" y="103" textAnchor="middle" fill="#3b82f6" fontSize="9.5">FC-33 Gancho OUT → Directo D32</text>
        <text x="140" y="122" textAnchor="middle" fill={textSub} fontSize="8.5">Sin divisor por usar R3 (+3,3 V)</text>

        {/* Sensores 5V con divisor */}
        <rect x="25" y="155" width="230" height="175" rx="5" fill={boxFill} stroke="#ef4444" strokeWidth="1.8" />
        <text x="140" y="177" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">Sensores 5 V (Riel R2)</text>
        <text x="140" y="200" textAnchor="middle" fill="#3b82f6" fontSize="9.5">US-H TRIG ← D19 | ECHO → Div #1</text>
        <text x="140" y="226" textAnchor="middle" fill="#3b82f6" fontSize="9.5">US-V TRIG ← D5  | ECHO → Div #2</text>
        <text x="140" y="252" textAnchor="middle" fill="#3b82f6" fontSize="9.5">Hall KY-003 S → Div #4</text>
        <text x="140" y="286" textAnchor="middle" fill="#f97316" fontSize="9.5">HOME (Z3) → Pull-up 1kΩ (53-55)</text>
        <text x="140" y="308" textAnchor="middle" fill={textSub} fontSize="9.5">PARO (Z1) → D12 a GND (pull-up INT)</text>

        {/* Bloque Divisores P2 */}
        <rect x="330" y="145" width="215" height="185" rx="5" fill={boxFill} stroke="#f59e0b" strokeWidth="1.8" />
        <text x="437" y="168" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">Protoboard P2 (Divisores 1 kΩ)</text>
        <text x="437" y="192" textAnchor="middle" fill="#fbbf24" fontSize="9.5" fontFamily="monospace">Div #1 (c=5): 5V → 3,33V (D23)</text>
        <text x="437" y="218" textAnchor="middle" fill="#fbbf24" fontSize="9.5" fontFamily="monospace">Div #2 (c=17): 5V → 3,33V (D18)</text>
        <text x="437" y="244" textAnchor="middle" fill="#fbbf24" fontSize="9.5" fontFamily="monospace">Div #4 (c=41): 5V → 3,33V (D33)</text>
        <text x="437" y="278" textAnchor="middle" fill="#f97316" fontSize="9.5" fontFamily="monospace">Pull-up HOME (53-55): 1kΩ → D39</text>
        <text x="437" y="308" textAnchor="middle" fill="#ef4444" fontSize="9">PROHIBIDO pull-up externo en D12</text>

        {/* Conexiones */}
        <path d="M255,75 L615,75" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d="M255,198 L330,198" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d="M255,224 L330,224" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d="M255,250 L330,250" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d="M255,282 L330,282" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d="M255,310 L585,310 L585,290 L615,290" fill="none" stroke="#3b82f6" strokeWidth="2" />

        <path d="M545,198 L615,198" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d="M545,224 L615,224" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d="M545,250 L615,250" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d="M545,275 L615,275" fill="none" stroke="#3b82f6" strokeWidth="2" />

        {/* ESP32 derecha */}
        <rect x="615" y="35" width="215" height="295" rx="6" fill={boxFill} stroke="#38bdf8" strokeWidth="2" />
        <text x="722" y="60" textAnchor="middle" fill={textMain} fontSize="11.5" fontWeight="700">ESP32 Entradas Seguras (3,3 V)</text>
        <text x="630" y="86" fill="#3b82f6" fontSize="10" fontFamily="monospace">D34, D35, D32 ← 3×FC-33</text>
        <text x="630" y="135" fill="#3b82f6" fontSize="10" fontFamily="monospace">D19 → US-H TRIG</text>
        <text x="630" y="155" fill="#3b82f6" fontSize="10" fontFamily="monospace">D5  → US-V TRIG</text>
        <text x="630" y="202" fill="#3b82f6" fontSize="10" fontFamily="monospace">D23 ← ECHO US-H (3,33 V)</text>
        <text x="630" y="228" fill="#3b82f6" fontSize="10" fontFamily="monospace">D18 ← ECHO US-V (3,33 V)</text>
        <text x="630" y="254" fill="#3b82f6" fontSize="10" fontFamily="monospace">D33 ← Hall S (3,33 V)</text>
        <text x="630" y="278" fill="#3b82f6" fontSize="10" fontFamily="monospace">D39 ← HOME (pull-up 1kΩ)</text>
        <text x="630" y="302" fill="#3b82f6" fontSize="10" fontFamily="monospace">D12 ← PARO (pull-up int.)</text>
      </svg>
    );
  }

  if (plateId === 6) {
    return (
      <svg viewBox="0 0 860 350" className="w-full h-auto">
        <rect x="0" y="0" width="860" height="350" fill={bg} rx="6" />
        {/* ESP32 arriba izquierda */}
        <rect x="35" y="30" width="210" height="135" rx="5" fill={boxFill} stroke="#f97316" strokeWidth="2" />
        <text x="140" y="54" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">ESP32 (Tapa Z1 · 3,3 V)</text>
        <text x="235" y="80" textAnchor="end" fill="#eab308" fontSize="9.5" fontFamily="monospace">D21/D22 (Bus I2C #1)</text>
        <text x="235" y="106" textAnchor="end" fill="#eab308" fontSize="9.5" fontFamily="monospace">D16/D17 (Bus I2C #2)</text>
        <text x="235" y="136" textAnchor="end" fill="#3b82f6" fontSize="9.5" fontFamily="monospace">D36 (VP Analógico)</text>

        <path d="M245,76 L325,76" fill="none" stroke="#eab308" strokeWidth="2.2" />
        <path d="M245,102 L565,102 L565,76 L585,76" fill="none" stroke="#eab308" strokeWidth="2.2" />
        <path d="M245,132 L325,132" fill="none" stroke="#3b82f6" strokeWidth="2" />

        <rect x="325" y="38" width="205" height="54" rx="5" fill={boxFill} stroke="#eab308" strokeWidth="1.6" />
        <text x="427" y="60" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">OLED A (0x3C · R3 3,3 V)</text>
        <text x="427" y="78" textAnchor="middle" fill={textSub} fontSize="9">3 pestañas: Carga / Cola / Totales</text>

        <rect x="585" y="38" width="235" height="54" rx="5" fill={boxFill} stroke="#eab308" strokeWidth="1.6" />
        <text x="702" y="60" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">OLED B (0x3C · R3 3,3 V)</text>
        <text x="702" y="78" textAnchor="middle" fill={textSub} fontSize="9">2 pestañas: Errores Δ / Posición (r,θ,z)</text>

        <rect x="325" y="110" width="205" height="44" rx="5" fill={boxFill} stroke="#3b82f6" strokeWidth="1.6" />
        <text x="427" y="130" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">Potenciómetro 1 (10 kΩ)</text>
        <text x="427" y="145" textAnchor="middle" fill={textSub} fontSize="9">Extremos a R3 y R1</text>

        {/* UNO abajo izquierda */}
        <rect x="35" y="190" width="210" height="135" rx="5" fill={boxFill} stroke="#ef4444" strokeWidth="2" />
        <text x="140" y="214" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">Arduino UNO (Tapa Z1 · 5 V)</text>
        <text x="235" y="238" textAnchor="end" fill="#eab308" fontSize="9.5" fontFamily="monospace">A4/A5 (I2C LCD)</text>
        <text x="235" y="262" textAnchor="end" fill="#3b82f6" fontSize="9.5" fontFamily="monospace">A2 (Pot 2) · D2/D9 (Bot. A/B)</text>
        <text x="235" y="288" textAnchor="end" fill="#3b82f6" fontSize="9.5" fontFamily="monospace">D10, D13, A3 (Buzzers 1–3)</text>

        <path d="M245,234 L325,234" fill="none" stroke="#eab308" strokeWidth="2.2" />
        <path d="M245,258 L325,258" fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d="M245,284 L325,284" fill="none" stroke="#3b82f6" strokeWidth="2" />

        <rect x="325" y="205" width="235" height="42" rx="5" fill={boxFill} stroke="#eab308" strokeWidth="1.6" />
        <text x="442" y="224" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">LCD 1602 I2C (5 V R2 · 0x27/0x3F)</text>
        <text x="442" y="239" textAnchor="middle" fill={textSub} fontSize="9">L1: Modo+Estado · L2: Progreso n/N</text>

        <rect x="325" y="254" width="235" height="30" rx="5" fill={boxFill} stroke="#3b82f6" strokeWidth="1.6" />
        <text x="442" y="273" textAnchor="middle" fill={textMain} fontSize="9.5">Pot 2 (R2/R1) + Botones Pestaña A/B (GND)</text>

        <rect x="325" y="292" width="235" height="34" rx="5" fill={boxFill} stroke="#3b82f6" strokeWidth="1.6" />
        <text x="442" y="313" textAnchor="middle" fill={textMain} fontSize="9.5">3 Buzzers KY-012 (+ a R2, − a R1)</text>

        <rect x="585" y="205" width="235" height="120" rx="5" fill={boxFill} stroke="#f59e0b" strokeWidth="1.6" />
        <text x="702" y="232" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">Kit LED por Sonido (7 LEDs)</text>
        <text x="702" y="254" textAnchor="middle" fill="#fbbf24" fontSize="9.5">Estado: POR CONFIRMAR</text>
        <text x="702" y="274" textAnchor="middle" fill={textSub} fontSize="9">1. Probar a 3,3 V (Riel R3)</text>
        <text x="702" y="290" textAnchor="middle" fill={textSub} fontSize="9">2. Si no enciende, pasar a 5 V (R2)</text>
        <text x="702" y="308" textAnchor="middle" fill={textSub} fontSize="9">Negativo (−) al Riel R1 (GND)</text>
      </svg>
    );
  }

  if (plateId === 7) {
    return (
      <svg viewBox="0 0 860 280" className="w-full h-auto">
        <rect x="0" y="0" width="860" height="280" fill={bg} rx="6" />
        <rect x="40" y="45" width="200" height="185" rx="6" fill={boxFill} stroke="#38bdf8" strokeWidth="2" />
        <text x="140" y="75" textAnchor="middle" fill={textMain} fontSize="12" fontWeight="700">ESP32 (3,3 V)</text>
        <text x="225" y="115" textAnchor="end" fill="#eab308" fontSize="10.5" fontFamily="monospace">D15 (TX)</text>
        <text x="225" y="180" textAnchor="end" fill="#eab308" fontSize="10.5" fontFamily="monospace">D2  (RX)</text>
        <text x="140" y="212" textAnchor="middle" fill={textSub} fontSize="9">GND → R1 (común con UNO)</text>

        {/* Línea directa D15 -> A0 */}
        <path d="M240,111 L615,111" fill="none" stroke="#eab308" strokeWidth="2.5" />
        <text x="427" y="102" textAnchor="middle" fill="#eab308" fontSize="10" fontWeight="600">
          Señal 3,3 V directa (UNO lee HIGH sin adaptador)
        </text>

        {/* Línea retorno UNO A1 -> Divisor #3 -> D2 */}
        <path d="M615,176 L510,176" fill="none" stroke="#ef4444" strokeWidth="2.5" />
        <rect x="340" y="142" width="170" height="72" rx="5" fill={boxFill} stroke="#f59e0b" strokeWidth="2" />
        <text x="425" y="164" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="700">Divisor #3 (P2 cols 29–38)</text>
        <text x="425" y="181" textAnchor="middle" fill={textSub} fontSize="9">3 × 1 kΩ → 5 V baja a 3,33 V</text>
        <text x="425" y="198" textAnchor="middle" fill={textSub} fontSize="9">Col 29 ent · Col 32 nodo · Col 38 GND</text>

        <path d="M340,176 L240,176" fill="none" stroke="#eab308" strokeWidth="2.5" strokeDasharray="7 4" />
        <rect x="255" y="158" width="70" height="14" rx="2" fill="#7c2d12" stroke="#f97316" />
        <text x="290" y="168" textAnchor="middle" fill="#fed7aa" fontSize="8" fontWeight="700">Jumper quit.</text>

        <rect x="615" y="45" width="200" height="185" rx="6" fill={boxFill} stroke="#ef4444" strokeWidth="2" />
        <text x="715" y="75" textAnchor="middle" fill={textMain} fontSize="12" fontWeight="700">Arduino UNO (5 V)</text>
        <text x="630" y="115" fill="#eab308" fontSize="10.5" fontFamily="monospace">A0 (RX)</text>
        <text x="630" y="180" fill="#ef4444" fontSize="10.5" fontFamily="monospace">A1 (TX 5V)</text>
        <text x="715" y="212" textAnchor="middle" fill={textSub} fontSize="9">Protocolo: POR DEFINIR</text>
      </svg>
    );
  }

  // Plate 8: Manguera y rizo
  return (
    <svg viewBox="0 0 860 320" className="w-full h-auto">
      <rect x="0" y="0" width="860" height="320" fill={bg} rx="6" />
      <rect x="25" y="55" width="185" height="210" rx="5" fill={boxFill} stroke={boxStroke} strokeWidth="1.8" />
      <text x="117" y="80" textAnchor="middle" fill={textMain} fontSize="11" fontWeight="700">Caja de Control (Z1)</text>
      <text x="117" y="112" textAnchor="middle" fill="#22c55e" fontSize="9.5">10 Potencia (L298N + M1..M3)</text>
      <text x="117" y="142" textAnchor="middle" fill="#3b82f6" fontSize="9.5">9 Señal (FC-33, US, Hall, HOME)</text>
      <text x="117" y="172" textAnchor="middle" fill="#ef4444" fontSize="9.5">3 Comunes (GND, +3,3V, +5V)</text>
      <text x="117" y="235" textAnchor="middle" fill={textSub} fontSize="9">+15 cm alivio tensión</text>

      {/* Mástil hueco + Rizo */}
      <rect x="255" y="120" width="150" height="80" rx="4" fill={boxFill} stroke="#64748b" strokeWidth="1.8" />
      <text x="330" y="152" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">Tramo A (22 hilos)</text>
      <text x="330" y="170" textAnchor="middle" fill={textSub} fontSize="9">Por dentro del mástil Z2</text>
      <path d="M210,160 L255,160" fill="none" stroke="#22c55e" strokeWidth="5" />
      <path d="M405,160 L455,160" fill="none" stroke="#22c55e" strokeWidth="5" />

      {/* Rizo */}
      <ellipse cx="495" cy="160" rx="34" ry="42" fill="none" stroke="#f59e0b" strokeWidth="3.5" />
      <ellipse cx="495" cy="160" rx="24" ry="30" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
      <text x="495" y="95" textAnchor="middle" fill="#fbbf24" fontSize="10" fontWeight="700">Rizo (≥ 1,5 vueltas)</text>
      <text x="495" y="222" textAnchor="middle" fill="#fbbf24" fontSize="9">Ø 6–8 cm · ≥ 40 cm · Eje ~15 mm</text>
      <text x="495" y="237" textAnchor="middle" fill={textSub} fontSize="8.5">Topes 0° y 360° · R_curva ≥ 5×Ø</text>

      {/* Bornera Z3 */}
      <path d="M530,160 L575,160" fill="none" stroke="#22c55e" strokeWidth="4" />
      <rect x="575" y="65" width="110" height="190" rx="5" fill={boxFill} stroke="#a855f7" strokeWidth="2" />
      <text x="630" y="92" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">Cabeza Z3</text>
      <text x="630" y="114" textAnchor="middle" fill={textSub} fontSize="9">3 motores</text>
      <text x="630" y="130" textAnchor="middle" fill={textSub} fontSize="9">3 FC-33 + HOME</text>
      <text x="630" y="146" textAnchor="middle" fill={textSub} fontSize="9">US-H + Bombillo Z8</text>
      <rect x="588" y="168" width="84" height="65" rx="3" fill="#3b0764" stroke="#c084fc" />
      <text x="630" y="195" textAnchor="middle" fill="#e9d5ff" fontSize="9.5" fontWeight="700">Bornera de paso</text>
      <text x="630" y="212" textAnchor="middle" fill="#e9d5ff" fontSize="8.5">Une A → Tramo B</text>

      {/* Tramo B */}
      <path d="M685,195 L725,195" fill="none" stroke="#a855f7" strokeWidth="3.5" />
      <rect x="725" y="130" width="115" height="130" rx="5" fill={boxFill} stroke="#a855f7" strokeWidth="1.8" />
      <text x="782" y="155" textAnchor="middle" fill={textMain} fontSize="10.5" fontWeight="700">Tramo B (9 hilos)</text>
      <text x="782" y="178" textAnchor="middle" fill={textSub} fontSize="9">Hall Z5 (3 hilos)</text>
      <text x="782" y="198" textAnchor="middle" fill={textSub} fontSize="9">Electroimán Z6 (2)</text>
      <text x="782" y="218" textAnchor="middle" fill={textSub} fontSize="9">US-V Z6 (4 hilos)</text>
    </svg>
  );
};

export const ElectricalSchematics: React.FC<{ pinAssignments?: PinAssignment[] }> = ({
  pinAssignments = DEFAULT_PIN_ASSIGNMENTS,
}) => {
  const [activePlate, setActivePlate] = useState<number>(1);
  const [activeSubTab, setActiveSubTab] = useState<'workbench' | 'plates' | 'dividers' | 'protoboards'>('workbench');

  const plate = SCHEMATIC_PLATES.find((p) => Number(p.id) === activePlate) || SCHEMATIC_PLATES[0];
  const platePinIds: Record<number, string[]> = {
    1: ['PA01', 'PA04', 'PA14', 'PA15', 'PA16', 'PA17', 'PA20', 'PA21'],
    2: ['PA13', 'PA20', 'PA21'],
    3: ['PA01', 'PA02', 'PA03', 'PA04', 'PA05', 'PA06'],
    4: ['PA22', 'PA23', 'PA26'],
    5: ['PA07', 'PA08', 'PA09', 'PA10', 'PA11', 'PA13', 'PA14', 'PA15', 'PA16', 'PA17'],
    6: ['PA12', 'PA18', 'PA19', 'PA24', 'PA25', 'PA26', 'PA27', 'PA28', 'PA29', 'PA30'],
    7: ['PA20', 'PA21', 'PA22', 'PA23'],
    8: ['PA07', 'PA08', 'PA09', 'PA10', 'PA11', 'PA14', 'PA15', 'PA16', 'PA17'],
  };
  const livePlatePins = pinAssignments.filter((pa) =>
    (platePinIds[activePlate] || []).includes(pa.id)
  );

  return (
    <div className="space-y-6">
      {/* Cabecera y selector de sub-sección */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl bg-[#0F172A] border border-slate-800 p-5">
        <div>
          <h2 className="text-xl font-bold text-white">
            Planos de Conexión, Láminas Eléctricas, Divisores y Protoboards P1/P2
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Mesa interactiva con modo simulación paso a paso y modo estático completo, además de las 8
            láminas técnicas ortogonales, divisores 1 kΩ y mapa de P1/P2.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#0B1120] border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveSubTab('workbench')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
              activeSubTab === 'workbench' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Plano Real (Simulación / Estático)
          </button>
          <button
            onClick={() => setActiveSubTab('plates')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
              activeSubTab === 'plates' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            8 Láminas Eléctricas
          </button>
          <button
            onClick={() => setActiveSubTab('dividers')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
              activeSubTab === 'dividers' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Divisores (5V → 3,33V)
          </button>
          <button
            onClick={() => setActiveSubTab('protoboards')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
              activeSubTab === 'protoboards' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            Protoboards P1 y P2
          </button>
        </div>
      </div>

      {activeSubTab === 'workbench' && <WorkbenchWiringPlan />}

      {activeSubTab === 'plates' && (
        <div className="space-y-5">
          {/* Selector de láminas 1..8 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {SCHEMATIC_PLATES.map((p, idx) => {
              const num = idx + 1;
              return (
                <button
                  key={num}
                  onClick={() => setActivePlate(num)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border text-left transition ${
                    activePlate === num
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200 font-semibold'
                      : 'bg-[#0F172A] border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  <div className="font-mono text-[10px] text-slate-400">Lámina {num}</div>
                  <div className="truncate">{p.title.replace(/^Lámina \d+\.\s*/, '')}</div>
                </button>
              );
            })}
          </div>

          {/* Lámina activa con las 3 partes: Imagen, Descripción, Funcionamiento */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-white">{plate.title}</h3>
              <StatusChip status="CONFIRMADO" />
            </div>

            <WireLegend />

            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2">1. Imagen esquemática</div>
              <div className="rounded-lg border border-slate-800 overflow-hidden bg-[#080E1A] p-2">
                <SchematicSvg plateId={activePlate} />
              </div>
              {livePlatePins.length > 0 && (
                <div className="mt-3 rounded-lg bg-[#0B1120] border border-slate-800 p-3">
                  <div className="text-[11px] font-semibold text-emerald-300 mb-2">
                    Pines vigentes en esta lámina (actualizados desde project.json):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {livePlatePins.map((pa) => {
                      const changed = pa.pin !== pa.defaultPin;
                      return (
                        <span
                          key={pa.id}
                          className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                            changed
                              ? 'bg-amber-950/60 border-amber-500/60 text-amber-200'
                              : 'bg-slate-900 border-slate-700 text-slate-200'
                          }`}
                        >
                          {pa.componentLabel}: <strong>{pa.controller} {pa.pin}</strong>
                          {changed ? ` (antes ${pa.defaultPin})` : ''}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
              <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-4 space-y-1.5">
                <div className="font-semibold text-sky-300">2. Descripción</div>
                <p className="text-slate-200">{plate.description}</p>
              </div>
              <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-4 space-y-1.5">
                <div className="font-semibold text-emerald-300">3. Funcionamiento</div>
                <p className="text-slate-200">{plate.operation}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'dividers' && (
        <div className="space-y-6">
          {/* Explicación + Dibujo + Fórmula (Sección 6) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 rounded-xl bg-[#0F172A] border border-slate-800 p-6">
            <div className="space-y-3 text-xs leading-relaxed">
              <h3 className="text-base font-bold text-white">
                ¿Qué hace un divisor de tensión y qué es un «nodo»?
              </h3>
              <p className="text-slate-200">
                1) El divisor baja una señal de <strong>5 V</strong> a <strong>3,33 V</strong> para
                no dañar los pines de 3,3 V del ESP32.
              </p>
              <p className="text-slate-200">
                2) Fórmula: <code className="text-amber-300 font-mono">Vout = Vin × R2 ÷ (R1 + R2) = 5 × 2 ÷ 3 = 3,33 V</code> (R1 = 1 kΩ, R2 = 1 kΩ + 1 kΩ en serie = 2 kΩ).
              </p>
              <p className="text-slate-200">
                3) Un <strong>«nodo»</strong> es simplemente la columna de la protoboard (por ejemplo
                la columna <code className="font-mono text-emerald-300">c+3</code>) donde se tocan las
                resistencias A y B junto con el cable que va hacia el pin del ESP32.
              </p>
              <div className="rounded-lg bg-[#0B1120] border border-slate-800 p-3 text-slate-300">
                <strong>Piezas por divisor:</strong> 3 resistencias de 1 kΩ (colores{' '}
                <em>marrón-negro-rojo-dorado</em>). Total: 4 divisores × 3 = 12 resistencias + 1
                pull-up de HOME = <strong>13 resistencias de 1 kΩ</strong>.
              </div>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-amber-200">
                <strong>Prueba obligatoria antes de conectar el ESP32:</strong> con el ESP32
                desconectado, aplica 5 V en <code>(c, a)</code> y mide con multímetro entre la
                columna <code>c+3</code> y GND: debe dar <strong>3,3 V ± 0,1 V</strong>.
              </div>
            </div>

            <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-3 flex items-center justify-center">
              <svg viewBox="0 0 420 230" className="w-full h-auto">
                <text x="210" y="20" textAnchor="middle" fill="#f8fafc" fontSize="11" fontWeight="700">
                  Plantilla única sobre Protoboard P2 (inicio en columna c)
                </text>
                {/* Column markers */}
                <rect x="45" y="45" width="330" height="115" rx="6" fill="#0f172a" stroke="#475569" />
                {[0, 3, 6, 9].map((offset, i) => {
                  const x = 80 + offset * 28;
                  return (
                    <g key={offset}>
                      <line x1={x} y1="55" x2={x} y2="150" stroke="#334155" strokeWidth="1" strokeDasharray="3 2" />
                      <text x={x} y="40" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="monospace">
                        c{offset > 0 ? `+${offset}` : ''}
                      </text>
                      {['a', 'b', 'c', 'd', 'e'].map((row, rIdx) => (
                        <circle key={row} cx={x} cy={65 + rIdx * 20} r="4" fill="#1e293b" stroke="#64748b" />
                      ))}
                    </g>
                  );
                })}
                {/* Señal 5V en (c, a) */}
                <line x1="20" y1="65" x2="80" y2="65" stroke="#ef4444" strokeWidth="2.5" />
                <text x="15" y="56" fill="#fca5a5" fontSize="9">5 V → (c,a)</text>

                {/* Res A: (c,b) a (c+3,b) */}
                <rect x="92" y="79" width="60" height="12" rx="2" fill="#d97706" stroke="#fde68a" />
                <line x1="80" y1="85" x2="92" y2="85" stroke="#cbd5e1" strokeWidth="2" />
                <line x1="152" y1="85" x2="164" y2="85" stroke="#cbd5e1" strokeWidth="2" />
                <text x="122" y="75" textAnchor="middle" fill="#fde68a" fontSize="8.5">R_A 1kΩ</text>

                {/* Nodo en c+3 -> cable ESP32 */}
                <circle cx="164" cy="105" r="5.5" fill="#3b82f6" />
                <path d="M164,105 L164,185 L235,185" fill="none" stroke="#3b82f6" strokeWidth="2.5" />
                <text x="242" y="189" fill="#93c5fd" fontSize="10" fontWeight="700">
                  NODO (c+3, c) = 3,33 V → Pin ESP32
                </text>

                {/* Res B: (c+3,d) a (c+6,d) */}
                <rect x="176" y="119" width="60" height="12" rx="2" fill="#d97706" stroke="#fde68a" />
                <line x1="164" y1="125" x2="176" y2="125" stroke="#cbd5e1" strokeWidth="2" />
                <line x1="236" y1="125" x2="248" y2="125" stroke="#cbd5e1" strokeWidth="2" />
                <text x="206" y="143" textAnchor="middle" fill="#fde68a" fontSize="8.5">R_B 1kΩ</text>

                {/* Res C: (c+6,b) a (c+9,b) */}
                <rect x="260" y="79" width="60" height="12" rx="2" fill="#d97706" stroke="#fde68a" />
                <line x1="248" y1="85" x2="260" y2="85" stroke="#cbd5e1" strokeWidth="2" />
                <line x1="320" y1="85" x2="332" y2="85" stroke="#cbd5e1" strokeWidth="2" />
                <text x="290" y="75" textAnchor="middle" fill="#fde68a" fontSize="8.5">R_C 1kΩ</text>

                {/* GND en (c+9, a) */}
                <path d="M332,65 L395,65 L395,212" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
                <text x="360" y="56" fill="#e2e8f0" fontSize="9">(c+9,a) → R1 GND</text>
              </svg>
            </div>
          </div>

          {/* Los 4 divisores + Pull-up HOME */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {VOLTAGE_DIVIDERS.map((d) => (
              <div key={d.id} className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white">{d.name}</h4>
                  <span className="font-mono text-xs text-amber-300">Inicio c = {d.startColumn}</span>
                </div>
                <div className="text-xs text-slate-400">
                  Origen: <strong className="text-slate-200">{d.sourcePin}</strong> → Destino:{' '}
                  <strong className="text-sky-300">{d.esp32Pin}</strong>
                  {d.hasDetachableJumper && ' (con jumper desmontable para USB)'}
                </div>
                <ol className="space-y-1.5 text-xs">
                  {d.steps.map((s) => (
                    <li
                      key={s.stepNumber}
                      className="rounded bg-[#0B1120] border border-slate-800 px-3 py-1.5 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-200">
                        <strong className="text-emerald-400">{s.stepNumber}.</strong> {s.part}
                      </span>
                      <span className="font-mono text-sky-300 shrink-0">
                        {s.fromCoord} → {s.toCoord}
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="text-[11px] text-emerald-300 font-mono">
                  Prueba multímetro: {d.expectedTestVoltage}
                </div>
              </div>
            ))}
          </div>

          {/* Pull-up HOME */}
          <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-2 text-xs">
            <h4 className="text-sm font-bold text-white">
              Pull-up externo de HOME en P2 (columnas 53–55 — NO es divisor)
            </h4>
            <p className="text-slate-300 leading-relaxed">
              1 resistencia de 1 kΩ de <code className="font-mono text-amber-300">(53, b)</code> a{' '}
              <code className="font-mono text-amber-300">(55, b)</code>; cable naranja de{' '}
              <code className="font-mono text-amber-300">(53, a)</code> al riel R3 (+3,3 V); cable
              azul de <code className="font-mono text-sky-300">(55, a)</code> al pin{' '}
              <strong>D39 (VN)</strong>; cable azul de{' '}
              <code className="font-mono text-sky-300">(55, c)</code> a una pata del pulsador HOME;
              la otra pata del pulsador HOME al riel R1 (GND).
            </p>
          </div>
        </div>
      )}

      {activeSubTab === 'protoboards' && (
        <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-white">
                Mapa de Columnas de las Protoboards P1 y P2 (63 columnas · filas a–e y f–j)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                En cada columna las 5 filas a–e están conectadas entre sí, y lo mismo f–j. R1 de P1
                y R1 de P2 se unen con 1 jumper. R2 (+5 V) y R3 (+3,3 V) jamás se tocan.
              </p>
            </div>
            <StatusChip status="CONFIRMADO" />
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#0B1120] text-slate-400">
                <tr>
                  <th className="py-2 px-3">Protoboard</th>
                  <th className="py-2 px-3">Columnas / Riel</th>
                  <th className="py-2 px-3">Sección</th>
                  <th className="py-2 px-3">Red / Voltaje</th>
                  <th className="py-2 px-3">Qué hay conectado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-200">
                {BREADBOARD_LAYOUT.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/60">
                    <td className="py-2 px-3 font-mono font-bold text-sky-300">{row.board}</td>
                    <td className="py-2 px-3 font-mono">{row.columnRange}</td>
                    <td className="py-2 px-3 text-slate-400">{row.section}</td>
                    <td className="py-2 px-3 font-mono text-emerald-300">{row.netName}</td>
                    <td className="py-2 px-3">{row.occupiedBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
