import React, { useState } from 'react';
import { BookOpen, Code2, Cpu, Lightbulb, Plus, Printer, Trash2 } from 'lucide-react';
import { REUSABLE_ENGINEERING_MODULES } from '../data/reusableModulesData';
import {
  LessonLearnedItem,
  NotebookLogRow,
  PinAssignment,
  UserEditableParams,
} from '../types/crane';

interface EngineeringNotebookProps {
  logRows: NotebookLogRow[];
  lessonsLearned: LessonLearnedItem[];
  pinAssignments: PinAssignment[];
  params: UserEditableParams;
  onAddLogRow: () => void;
  onUpdateLogRow: (id: string, patch: Partial<NotebookLogRow>) => void;
  onDeleteLogRow: (id: string) => void;
  onAddLesson: () => void;
  onUpdateLesson: (id: string, patch: Partial<LessonLearnedItem>) => void;
  onDeleteLesson: (id: string) => void;
}

const ModuleSchematicSvg: React.FC<{ moduleId: string }> = ({ moduleId }) => {
  switch (moduleId) {
    case 'MOD-01':
      return (
        <svg viewBox="0 0 360 135" className="w-full h-auto bg-slate-50 border border-slate-300 rounded">
          <text x="12" y="18" fontSize="10" fontWeight="700" fill="#0f172a">
            Divisor 5 V → 3,33 V (3 × 1 kΩ)
          </text>
          <circle cx="38" cy="56" r="5" fill="#2563eb" />
          <text x="12" y="44" fontSize="9" fontWeight="700" fill="#1d4ed8">Señal 5 V</text>
          <line x1="43" y1="56" x2="78" y2="56" stroke="#2563eb" strokeWidth="2" />
          <rect x="78" y="47" width="46" height="18" rx="2" fill="#fef3c7" stroke="#92400e" strokeWidth="1.5" />
          <text x="101" y="59" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#78350f">R1 1 kΩ</text>
          <line x1="124" y1="56" x2="178" y2="56" stroke="#0f172a" strokeWidth="2" />
          <circle cx="178" cy="56" r="4.5" fill="#16a34a" />
          <text x="184" y="45" fontSize="9" fontWeight="700" fill="#15803d">NODO = 3,33 V</text>
          <line x1="182" y1="56" x2="295" y2="56" stroke="#16a34a" strokeWidth="2" />
          <rect x="295" y="42" width="56" height="28" rx="4" fill="#dcfce7" stroke="#15803d" strokeWidth="1.5" />
          <text x="323" y="55" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#14532d">ESP32</text>
          <text x="323" y="65" textAnchor="middle" fontSize="8" fill="#166534">GPIO 3,3 V</text>
          {/* Rama inferior 2 x 1 kΩ = 2 kΩ */}
          <line x1="178" y1="60" x2="178" y2="74" stroke="#0f172a" strokeWidth="2" />
          <rect x="155" y="74" width="46" height="16" rx="2" fill="#fef3c7" stroke="#92400e" strokeWidth="1.5" />
          <text x="178" y="85" textAnchor="middle" fontSize="8" fontWeight="700" fill="#78350f">R2a 1 kΩ</text>
          <line x1="178" y1="90" x2="178" y2="96" stroke="#0f172a" strokeWidth="2" />
          <rect x="155" y="96" width="46" height="16" rx="2" fill="#fef3c7" stroke="#92400e" strokeWidth="1.5" />
          <text x="178" y="107" textAnchor="middle" fontSize="8" fontWeight="700" fill="#78350f">R2b 1 kΩ</text>
          <line x1="178" y1="112" x2="178" y2="122" stroke="#0f172a" strokeWidth="2" />
          <line x1="164" y1="122" x2="192" y2="122" stroke="#0f172a" strokeWidth="2.5" />
          <text x="200" y="125" fontSize="8.5" fontWeight="700" fill="#0f172a">GND (R1)</text>
        </svg>
      );
    case 'MOD-02':
      return (
        <svg viewBox="0 0 360 135" className="w-full h-auto bg-slate-50 border border-slate-300 rounded">
          <text x="12" y="18" fontSize="10" fontWeight="700" fill="#0f172a">
            Pull-Up Externa (ej. HOME en ESP32 D39)
          </text>
          <line x1="40" y1="36" x2="220" y2="36" stroke="#ea580c" strokeWidth="2.5" />
          <text x="42" y="31" fontSize="8.5" fontWeight="700" fill="#c2410c">+3,3 V (Riel R3)</text>
          <line x1="130" y1="36" x2="130" y2="50" stroke="#ea580c" strokeWidth="2" />
          <rect x="106" y="50" width="48" height="18" rx="2" fill="#fef3c7" stroke="#92400e" strokeWidth="1.5" />
          <text x="130" y="62" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#78350f">1 kΩ–10 kΩ</text>
          <line x1="130" y1="68" x2="130" y2="84" stroke="#0f172a" strokeWidth="2" />
          <circle cx="130" cy="84" r="4" fill="#2563eb" />
          <line x1="134" y1="84" x2="250" y2="84" stroke="#2563eb" strokeWidth="2" />
          <rect x="250" y="70" width="94" height="28" rx="4" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5" />
          <text x="297" y="83" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#1e3a8a">Pin Lectura (D39)</text>
          <text x="297" y="93" textAnchor="middle" fontSize="7.5" fill="#1d4ed8">Reposo = HIGH (3,3 V)</text>
          <line x1="130" y1="88" x2="130" y2="100" stroke="#0f172a" strokeWidth="2" />
          <circle cx="130" cy="102" r="2.5" fill="#0f172a" />
          <line x1="130" y1="102" x2="146" y2="110" stroke="#0f172a" strokeWidth="2" />
          <circle cx="130" cy="114" r="2.5" fill="#0f172a" />
          <text x="152" y="109" fontSize="8" fontWeight="700" fill="#334155">Pulsador NO</text>
          <line x1="130" y1="114" x2="130" y2="124" stroke="#0f172a" strokeWidth="2" />
          <line x1="114" y1="124" x2="146" y2="124" stroke="#0f172a" strokeWidth="2.5" />
          <text x="154" y="127" fontSize="8.5" fontWeight="700" fill="#0f172a">GND (LOW al pulsar)</text>
        </svg>
      );
    case 'MOD-03':
      return (
        <svg viewBox="0 0 360 135" className="w-full h-auto bg-slate-50 border border-slate-300 rounded">
          <text x="12" y="18" fontSize="10" fontWeight="700" fill="#0f172a">
            Puente H (L298N / L293D) + PWM
          </text>
          <rect x="14" y="34" width="84" height="84" rx="4" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5" />
          <text x="56" y="52" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1e3a8a">MCU</text>
          <text x="56" y="68" textAnchor="middle" fontSize="8" fill="#1e40af">IN1 / IN2 (Dir)</text>
          <text x="56" y="84" textAnchor="middle" fontSize="8" fill="#15803d">ENA (PWM)</text>
          <text x="56" y="104" textAnchor="middle" fontSize="8" fill="#0f172a">GND común</text>
          <line x1="98" y1="65" x2="138" y2="65" stroke="#2563eb" strokeWidth="2" />
          <line x1="98" y1="81" x2="138" y2="81" stroke="#16a34a" strokeWidth="2" />
          <line x1="98" y1="101" x2="138" y2="101" stroke="#0f172a" strokeWidth="2" />
          <rect x="138" y="32" width="110" height="88" rx="4" fill="#fee2e2" stroke="#b91c1c" strokeWidth="1.5" />
          <text x="193" y="48" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#7f1d1d">Driver Puente H</text>
          <text x="193" y="63" textAnchor="middle" fontSize="8" fill="#991b1b">Borne +12 V (2 A)</text>
          <text x="193" y="76" textAnchor="middle" fontSize="8" fill="#991b1b">Lógica +5 V (sin jumper)</text>
          <text x="193" y="92" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0f172a">OUT1 / OUT2</text>
          <text x="193" y="108" textAnchor="middle" fontSize="7.5" fill="#475569">L293D ≤ 0,6 A · L298N ≤ 2 A</text>
          <line x1="248" y1="66" x2="285" y2="66" stroke="#dc2626" strokeWidth="2" />
          <line x1="248" y1="88" x2="285" y2="88" stroke="#0f172a" strokeWidth="2" />
          <circle cx="314" cy="77" r="24" fill="#f1f5f9" stroke="#334155" strokeWidth="2" />
          <text x="314" y="75" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#0f172a">Motor</text>
          <text x="314" y="86" textAnchor="middle" fontSize="8" fill="#475569">DC 12 V</text>
        </svg>
      );
    case 'MOD-04':
      return (
        <svg viewBox="0 0 360 135" className="w-full h-auto bg-slate-50 border border-slate-300 rounded">
          <text x="12" y="18" fontSize="10" fontWeight="700" fill="#0f172a">
            Encoder Óptico Ranurado FC-33 (a 3,3 V)
          </text>
          <circle cx="62" cy="76" r="34" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" strokeDasharray="5 3" />
          <circle cx="62" cy="76" r="8" fill="#64748b" />
          <text x="62" y="124" textAnchor="middle" fontSize="8" fontWeight="700" fill="#334155">Disco N ranuras</text>
          <rect x="88" y="54" width="96" height="44" rx="4" fill="#fef9c3" stroke="#a16207" strokeWidth="1.5" />
          <text x="136" y="70" textAnchor="middle" fontSize="9" fontWeight="700" fill="#713f12">FC-33 (LM393)</text>
          <text x="136" y="83" textAnchor="middle" fontSize="7.5" fill="#854d0e">Ranura 5 mm · VCC 3,3 V</text>
          <line x1="184" y1="64" x2="246" y2="64" stroke="#ea580c" strokeWidth="2" />
          <text x="215" y="60" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#c2410c">+3,3 V (R3)</text>
          <line x1="184" y1="76" x2="246" y2="76" stroke="#2563eb" strokeWidth="2" />
          <text x="215" y="73" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#1d4ed8">OUT (0–3,3 V)</text>
          <line x1="184" y1="88" x2="246" y2="88" stroke="#0f172a" strokeWidth="2" />
          <text x="215" y="99" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#0f172a">GND (R1)</text>
          <rect x="246" y="50" width="102" height="52" rx="4" fill="#dcfce7" stroke="#15803d" strokeWidth="1.5" />
          <text x="297" y="69" textAnchor="middle" fontSize="9" fontWeight="700" fill="#14532d">ESP32 ISR</text>
          <text x="297" y="82" textAnchor="middle" fontSize="8" fill="#166534">CHANGE → 2·N</text>
          <text x="297" y="94" textAnchor="middle" fontSize="7.5" fill="#166534">pulso/vuelta</text>
        </svg>
      );
    case 'MOD-05':
      return (
        <svg viewBox="0 0 360 135" className="w-full h-auto bg-slate-50 border border-slate-300 rounded">
          <text x="12" y="18" fontSize="10" fontWeight="700" fill="#0f172a">
            HC-SR04 (5 V) con Divisor 1k+2k en ECHO
          </text>
          <rect x="14" y="34" width="90" height="84" rx="4" fill="#e0f2fe" stroke="#0369a1" strokeWidth="1.5" />
          <text x="59" y="50" textAnchor="middle" fontSize="9" fontWeight="700" fill="#0c4a6e">HC-SR04</text>
          <text x="59" y="66" textAnchor="middle" fontSize="8" fill="#dc2626">VCC = +5 V (R2)</text>
          <text x="59" y="80" textAnchor="middle" fontSize="8" fill="#15803d">TRIG (10 µs)</text>
          <text x="59" y="94" textAnchor="middle" fontSize="8" fontWeight="700" fill="#2563eb">ECHO (5 V)</text>
          <text x="59" y="108" textAnchor="middle" fontSize="8" fill="#0f172a">GND (R1)</text>
          <line x1="104" y1="78" x2="255" y2="78" stroke="#16a34a" strokeWidth="2" />
          <text x="178" y="73" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#15803d">TRIG directo desde ESP32 (3,3 V)</text>
          <line x1="104" y1="92" x2="132" y2="92" stroke="#2563eb" strokeWidth="2" />
          <rect x="132" y="84" width="66" height="18" rx="3" fill="#fef3c7" stroke="#92400e" strokeWidth="1.5" />
          <text x="165" y="96" textAnchor="middle" fontSize="8" fontWeight="700" fill="#78350f">Divisor 3×1kΩ</text>
          <line x1="198" y1="92" x2="255" y2="92" stroke="#16a34a" strokeWidth="2" />
          <text x="226" y="105" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#15803d">3,33 V</text>
          <rect x="255" y="54" width="92" height="54" rx="4" fill="#dcfce7" stroke="#15803d" strokeWidth="1.5" />
          <text x="301" y="73" textAnchor="middle" fontSize="9" fontWeight="700" fill="#14532d">ESP32</text>
          <text x="301" y="86" textAnchor="middle" fontSize="8" fill="#166534">≥ 60 ms / sensor</text>
          <text x="301" y="99" textAnchor="middle" fontSize="7.5" fill="#166534">Mediana 5 lect.</text>
        </svg>
      );
    case 'MOD-06':
      return (
        <svg viewBox="0 0 360 135" className="w-full h-auto bg-slate-50 border border-slate-300 rounded">
          <text x="12" y="18" fontSize="10" fontWeight="700" fill="#0f172a">
            Doble Bus I2C ESP32 (Wire + Wire1 sin choque 0x3C)
          </text>
          <rect x="14" y="34" width="92" height="84" rx="4" fill="#dcfce7" stroke="#15803d" strokeWidth="1.5" />
          <text x="60" y="52" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#14532d">ESP32</text>
          <text x="60" y="68" textAnchor="middle" fontSize="8" fill="#166534">Wire: D21 / D22</text>
          <text x="60" y="96" textAnchor="middle" fontSize="8" fill="#1d4ed8">Wire1: D16 / D17</text>
          <line x1="106" y1="64" x2="152" y2="64" stroke="#ca8a04" strokeWidth="2.2" />
          <rect x="152" y="42" width="92" height="36" rx="4" fill="#fef9c3" stroke="#a16207" strokeWidth="1.5" />
          <text x="198" y="57" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#713f12">OLED A (0x3C)</text>
          <text x="198" y="69" textAnchor="middle" fontSize="7.5" fill="#854d0e">Bus #1 · 3,3 V</text>
          <line x1="244" y1="60" x2="258" y2="60" stroke="#ca8a04" strokeWidth="2" />
          <rect x="258" y="42" width="90" height="36" rx="4" fill="#e0f2fe" stroke="#0369a1" strokeWidth="1.5" />
          <text x="303" y="57" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#0c4a6e">LCD 1602</text>
          <text x="303" y="69" textAnchor="middle" fontSize="7.5" fill="#0369a1">0x27 / 0x3F · 5 V</text>
          <line x1="106" y1="95" x2="152" y2="95" stroke="#2563eb" strokeWidth="2.2" />
          <rect x="152" y="84" width="136" height="34" rx="4" fill="#ede9fe" stroke="#6d28d9" strokeWidth="1.5" />
          <text x="220" y="99" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#4c1d95">OLED B (0x3C) en Bus #2</text>
          <text x="220" y="111" textAnchor="middle" fontSize="7.5" fill="#5b21b6">Sin multiplexor · D16 SDA / D17 SCL</text>
        </svg>
      );
    case 'MOD-07':
      return (
        <svg viewBox="0 0 360 135" className="w-full h-auto bg-slate-50 border border-slate-300 rounded">
          <text x="12" y="18" fontSize="10" fontWeight="700" fill="#0f172a">
            Enlace UART Seguro 3,3 V ↔ 5 V (TX↔RX Cruzado)
          </text>
          <rect x="14" y="34" width="88" height="82" rx="4" fill="#dcfce7" stroke="#15803d" strokeWidth="1.5" />
          <text x="58" y="52" textAnchor="middle" fontSize="9" fontWeight="700" fill="#14532d">ESP32 (3,3 V)</text>
          <text x="58" y="70" textAnchor="middle" fontSize="8" fill="#166534">D15 (TX2)</text>
          <text x="58" y="94" textAnchor="middle" fontSize="8" fill="#166534">D2 (RX2)</text>
          <text x="58" y="110" textAnchor="middle" fontSize="7.5" fill="#0f172a">GND R1</text>
          {/* TX 3.3 -> RX 5 direct */}
          <line x1="102" y1="67" x2="258" y2="67" stroke="#ca8a04" strokeWidth="2" />
          <text x="180" y="61" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#854d0e">3,3 V directo → UNO A0 (RX)</text>
          {/* TX 5 -> Divisor + Jumper -> RX 3.3 */}
          <line x1="258" y1="92" x2="218" y2="92" stroke="#2563eb" strokeWidth="2" />
          <rect x="150" y="83" width="68" height="18" rx="3" fill="#fef3c7" stroke="#92400e" strokeWidth="1.5" />
          <text x="184" y="95" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#78350f">Divisor 3×1kΩ</text>
          <line x1="150" y1="92" x2="102" y2="92" stroke="#16a34a" strokeWidth="2" strokeDasharray="4 2" />
          <text x="180" y="112" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#15803d">Jumper desmontable (quitar al programar USB)</text>
          <rect x="258" y="34" width="88" height="82" rx="4" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.5" />
          <text x="302" y="52" textAnchor="middle" fontSize="9" fontWeight="700" fill="#1e3a8a">UNO (5 V)</text>
          <text x="302" y="70" textAnchor="middle" fontSize="8" fill="#1e40af">A0 (SoftRX)</text>
          <text x="302" y="94" textAnchor="middle" fontSize="8" fill="#1e40af">A1 (SoftTX)</text>
          <text x="302" y="110" textAnchor="middle" fontSize="7.5" fill="#0f172a">GND R1</text>
        </svg>
      );
    case 'MOD-08':
      return (
        <svg viewBox="0 0 360 135" className="w-full h-auto bg-slate-50 border border-slate-300 rounded">
          <text x="12" y="18" fontSize="10" fontWeight="700" fill="#0f172a">
            Electroimán 12 V con Pulso Inverso ≤ 80 ms
          </text>
          <rect x="14" y="42" width="106" height="68" rx="4" fill="#fee2e2" stroke="#b91c1c" strokeWidth="1.5" />
          <text x="67" y="60" textAnchor="middle" fontSize="9" fontWeight="700" fill="#7f1d1d">Canal M2 (L293D)</text>
          <text x="67" y="75" textAnchor="middle" fontSize="8" fill="#991b1b">Sujeción: +12 V (5 s)</text>
          <text x="67" y="88" textAnchor="middle" fontSize="8" fill="#991b1b">Soltar: −12 V (60 ms)</text>
          <text x="67" y="101" textAnchor="middle" fontSize="7.5" fill="#475569">Luego 0 V (apagado)</text>
          <line x1="120" y1="62" x2="165" y2="62" stroke="#16a34a" strokeWidth="2" />
          <line x1="120" y1="88" x2="165" y2="88" stroke="#16a34a" strokeWidth="2" />
          <rect x="165" y="48" width="76" height="54" rx="6" fill="#e2e8f0" stroke="#334155" strokeWidth="1.5" />
          <text x="203" y="72" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#0f172a">Electroimán</text>
          <text x="203" y="84" textAnchor="middle" fontSize="8" fill="#475569">12 V · 25 N</text>
          {/* Forma de onda */}
          <polyline points="256,94 274,94 274,50 308,50 308,112 322,112 322,94 348,94" fill="none" stroke="#2563eb" strokeWidth="2" />
          <text x="291" y="44" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#1d4ed8">+12 V</text>
          <text x="316" y="124" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#dc2626">≤80 ms</text>
        </svg>
      );
    case 'MOD-09':
      return (
        <svg viewBox="0 0 360 135" className="w-full h-auto bg-slate-50 border border-slate-300 rounded">
          <text x="12" y="18" fontSize="10" fontWeight="700" fill="#0f172a">
            Masa en Estrella (Punto Único GND en R1)
          </text>
          <rect x="115" y="54" width="130" height="32" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="2" />
          <text x="180" y="74" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#ffffff">
            RIEL ÚNICO GND (P1 R1 ↔ P2 R1)
          </text>
          {/* 5 ramas estrella */}
          <line x1="56" y1="36" x2="125" y2="56" stroke="#0f172a" strokeWidth="1.8" />
          <text x="14" y="34" fontSize="8" fontWeight="700" fill="#0f172a">Fuente 12 V (−)</text>
          <line x1="56" y1="112" x2="125" y2="84" stroke="#0f172a" strokeWidth="1.8" />
          <text x="14" y="122" fontSize="8" fontWeight="700" fill="#0f172a">Fuente 5 V (−)</text>
          <line x1="180" y1="32" x2="180" y2="54" stroke="#0f172a" strokeWidth="1.8" />
          <text x="180" y="28" textAnchor="middle" fontSize="8" fontWeight="700" fill="#15803d">ESP32 + Sensores</text>
          <line x1="300" y1="36" x2="235" y2="56" stroke="#0f172a" strokeWidth="1.8" />
          <text x="275" y="34" fontSize="8" fontWeight="700" fill="#1d4ed8">UNO + Shield</text>
          <line x1="300" y1="112" x2="235" y2="84" stroke="#0f172a" strokeWidth="1.8" />
          <text x="268" y="122" fontSize="8" fontWeight="700" fill="#b91c1c">L298N + Motores</text>
        </svg>
      );
    case 'MOD-10':
    default:
      return (
        <svg viewBox="0 0 360 135" className="w-full h-auto bg-slate-50 border border-slate-300 rounded">
          <text x="12" y="18" fontSize="10" fontWeight="700" fill="#0f172a">
            Rizo de Cable Pasante (Giro 0°–360° sin Anillo)
          </text>
          <rect x="44" y="36" width="46" height="84" fill="#e2e8f0" stroke="#475569" strokeWidth="1.5" />
          <text x="67" y="129" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#334155">Mástil hueco</text>
          {/* Rizo espiral */}
          <path d="M 67,120 L 67,92 C 67,78 96,78 96,90 C 96,102 48,102 48,84 C 48,66 96,66 96,54 C 96,42 67,42 67,30" fill="none" stroke="#16a34a" strokeWidth="2.5" />
          <rect x="34" y="24" width="66" height="14" rx="2" fill="#dbeafe" stroke="#1d4ed8" strokeWidth="1.2" />
          <text x="67" y="34" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#1e3a8a">Cabeza Z3</text>
          <text x="116" y="48" fontSize="8.5" fontWeight="700" fill="#0f172a">• 1,5 vueltas holgadas (Ø 6–8 cm)</text>
          <text x="116" y="64" fontSize="8.5" fill="#334155">• Reserva ≥ 40 cm + 15 cm/extremo</text>
          <text x="116" y="80" fontSize="8.5" fill="#334155">• Tope físico 0°–360° + HOME D39</text>
          <text x="116" y="96" fontSize="8.5" fill="#b91c1c">• Radio de curva ≥ 5 × Ø del haz</text>
          <text x="116" y="112" fontSize="8.5" fill="#15803d">• Trenzado sin tensión mecánica</text>
        </svg>
      );
  }
};

export const EngineeringNotebook: React.FC<EngineeringNotebookProps> = ({
  logRows,
  lessonsLearned,
  pinAssignments,
  params,
  onAddLogRow,
  onUpdateLogRow,
  onDeleteLogRow,
  onAddLesson,
  onUpdateLesson,
  onDeleteLesson,
}) => {
  const [activeSectionFilter, setActiveSectionFilter] = useState<'all' | 'log' | 'asbuilt' | 'lessons' | 'modules'>('all');
  const accent = params.institutionalColorHex || '#006837';
  const changedPins = pinAssignments.filter((pa) => pa.pin !== pa.defaultPin);

  const effectiveRatioI =
    params.gearOptionGiro === 'A_PINON_CORONA' && params.pinionDiameterMm > 0
      ? Number((params.crownDiameterMm / params.pinionDiameterMm).toFixed(2))
      : params.gearRatioGiroI;

  return (
    <div className="space-y-6">
      {/* Barra superior (no imprimible) */}
      <div className="no-print flex flex-col gap-4 rounded-xl bg-[#0F172A] border border-slate-800 p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              Cuaderno de Ingeniería (Documento Reutilizable de Laboratorio)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Documento separado del informe académico con: (1) Bitácora editable, (2) Cómo se
              construyó (As-Built), (3) Lecciones aprendidas y (4) Biblioteca de 10 módulos
              reutilizables para futuros proyectos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={onAddLogRow}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Fila en Bitácora
            </button>
            <button
              onClick={onAddLesson}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-semibold whitespace-nowrap"
            >
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Nueva lección
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold whitespace-nowrap"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF Cuaderno
            </button>
          </div>
        </div>

        {/* Filtro rápido en pantalla */}
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { id: 'all', label: 'Ver cuaderno completo (4 secciones)' },
            { id: 'log', label: `1. Bitácora (${logRows.length})` },
            { id: 'asbuilt', label: '2. Cómo se construyó (As-Built)' },
            { id: 'lessons', label: `3. Lecciones aprendidas (${lessonsLearned.length})` },
            { id: 'modules', label: `4. Módulos reutilizables (${REUSABLE_ENGINEERING_MODULES.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSectionFilter(tab.id as typeof activeSectionFilter)}
              className={`px-3 py-1.5 rounded-lg border font-medium transition ${
                activeSectionFilter === tab.id
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-[#0B1120] border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cuaderno en estilo claro A4 */}
      <div className="academic-page font-academic bg-white text-slate-900 max-w-[210mm] mx-auto shadow-2xl border border-slate-300 p-8 sm:p-[22mm] space-y-8 text-[10.5pt]">
        <div className="border-b-2 pb-3 flex items-center justify-between gap-4" style={{ borderColor: accent }}>
          <div>
            <div className="text-xs uppercase tracking-wider font-bold" style={{ color: accent }}>
              Cuaderno de Ingeniería — Registro Reutilizable
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Bitácora, Estado As-Built, Lecciones y Biblioteca de Módulos
            </h1>
          </div>
          <div className="text-right text-xs text-slate-600 shrink-0">
            <div>Responsable: {params.studentName || 'José'}</div>
            <div>Cambios de pines: {changedPins.length}</div>
          </div>
        </div>

        {/* 1. BITÁCORA (tabla vacía por defecto, editable) */}
        {(activeSectionFilter === 'all' || activeSectionFilter === 'log') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold" style={{ color: accent }}>
                1. Bitácora de Pruebas de Laboratorio
              </h2>
              <span className="text-xs text-slate-500">
                Inicia vacía para que registres tus mediciones reales
              </span>
            </div>

            <table className="w-full text-[9pt] border-collapse border-y border-slate-800 tabular-nums">
              <thead>
                <tr className="border-b border-slate-400 text-left">
                  <th className="py-1.5 pr-2">Fecha</th>
                  <th className="py-1.5 pr-2">Prueba</th>
                  <th className="py-1.5 pr-2">Valor esperado</th>
                  <th className="py-1.5 pr-2">Valor medido</th>
                  <th className="py-1.5 pr-2">Aprobado</th>
                  <th className="py-1.5">Notas</th>
                  <th className="no-print py-1.5 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {logRows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-1.5 pr-2">
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => onUpdateLogRow(row.id, { date: e.target.value })}
                        className="w-28 border-b border-slate-300 bg-transparent text-xs font-mono"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        placeholder="Nombre de prueba..."
                        value={row.testName}
                        onChange={(e) => onUpdateLogRow(row.id, { testName: e.target.value })}
                        className="w-full border-b border-slate-300 bg-transparent text-xs"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        placeholder="Ej. 3,33 V ± 0,1 V"
                        value={row.expectedValue}
                        onChange={(e) => onUpdateLogRow(row.id, { expectedValue: e.target.value })}
                        className="w-28 border-b border-slate-300 bg-transparent text-xs font-mono"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="text"
                        placeholder="Lectura real"
                        value={row.measuredValue}
                        onChange={(e) => onUpdateLogRow(row.id, { measuredValue: e.target.value })}
                        className="w-24 border-b border-slate-300 bg-transparent text-xs font-mono"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        value={row.approved}
                        onChange={(e) =>
                          onUpdateLogRow(row.id, {
                            approved: e.target.value as NotebookLogRow['approved'],
                          })
                        }
                        className="border-b border-slate-300 bg-transparent text-xs"
                      >
                        <option value="">—</option>
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                      </select>
                    </td>
                    <td className="py-1.5">
                      <input
                        type="text"
                        placeholder="Observaciones..."
                        value={row.notes}
                        onChange={(e) => onUpdateLogRow(row.id, { notes: e.target.value })}
                        className="w-full border-b border-slate-300 bg-transparent text-xs"
                      />
                    </td>
                    <td className="no-print py-1.5 text-right">
                      <button
                        onClick={() => onDeleteLogRow(row.id)}
                        aria-label="Eliminar fila"
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 2. CÓMO SE CONSTRUYÓ (AS-BUILT) */}
        {(activeSectionFilter === 'all' || activeSectionFilter === 'asbuilt') && (
          <section className="space-y-3">
            <h2 className="text-base font-bold" style={{ color: accent }}>
              2. Cómo se Construyó (Tabla Maestra Final As-Built)
            </h2>
            <p className="text-xs text-slate-700">
              Refleja automáticamente la configuración exacta actual de hardware, parámetros físicos
              medidos por el constructor y cualquier modificación de pines hecha en el Diseñador.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs border border-slate-300 rounded p-3 bg-slate-50 tabular-nums">
              <div>
                <strong>Dirección LCD:</strong>{' '}
                <span className="font-mono">{params.lcdI2cAddress}</span>
              </div>
              <div>
                <strong>Tipo Buzzers:</strong>{' '}
                <span className="font-mono">{params.buzzerType}</span>
              </div>
              <div>
                <strong>Kit LED sonido:</strong>{' '}
                <span className="font-mono">{params.ledSoundKitVoltage}</span>
              </div>
              <div>
                <strong>Altura mástil:</strong>{' '}
                <span className="font-mono">
                  {params.mastHeightCm !== null ? `${params.mastHeightCm} cm` : 'POR CONFIRMAR'}
                </span>
              </div>
              <div>
                <strong>Ranuras N (G/C/H):</strong>{' '}
                <span className="font-mono">
                  {params.slotsGiroN ?? 'POR CONFIRMAR'} / {params.slotsCarroN ?? 'POR CONFIRMAR'} /{' '}
                  {params.slotsGanchoN ?? 'POR CONFIRMAR'}
                </span>
              </div>
              <div>
                <strong>Tambores D (C/H) · i:</strong>{' '}
                <span className="font-mono">
                  {params.drumDiameterCarroCm ? `${params.drumDiameterCarroCm} cm` : 'POR CONFIRMAR'} /{' '}
                  {params.drumDiameterGanchoCm ? `${params.drumDiameterGanchoCm} cm` : 'POR CONFIRMAR'} ·{' '}
                  {effectiveRatioI ?? 'POR CONFIRMAR'}
                </span>
              </div>
            </div>

            <table className="w-full text-[9pt] border-collapse border-y border-slate-800 tabular-nums">
              <thead>
                <tr className="border-b border-slate-400 text-left">
                  <th className="py-1.5 pr-2">ID</th>
                  <th className="py-1.5 pr-2">Controlador</th>
                  <th className="py-1.5 pr-2">Componente / Señal</th>
                  <th className="py-1.5 pr-2">Pin Diseño</th>
                  <th className="py-1.5 pr-2">Pin Final Construido</th>
                  <th className="py-1.5">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pinAssignments.map((pa) => {
                  const modified = pa.pin !== pa.defaultPin;
                  return (
                    <tr key={pa.id} className={modified ? 'bg-amber-50' : ''}>
                      <td className="py-1 pr-2 font-mono">{pa.id}</td>
                      <td className="py-1 pr-2 font-mono">{pa.controller}</td>
                      <td className="py-1 pr-2">{pa.componentLabel}</td>
                      <td className="py-1 pr-2 font-mono text-slate-500">{pa.defaultPin}</td>
                      <td className="py-1 pr-2 font-mono font-bold">{pa.pin}</td>
                      <td className="py-1 text-xs font-semibold">
                        {modified ? 'MODIFICADO EN MONTAJE' : 'ORIGINAL'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* 3. LECCIONES APRENDIDAS (editable) */}
        {(activeSectionFilter === 'all' || activeSectionFilter === 'lessons') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold" style={{ color: accent }}>
                3. Lecciones Aprendidas (Editable para Futuros Proyectos)
              </h2>
              <button
                onClick={onAddLesson}
                className="no-print inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Agregar lección
              </button>
            </div>
            <p className="text-xs text-slate-700">
              Anota aquí fallos reales encontrados durante el armado, qué decisión los resolvió y
              qué regla conservarías para tu próximo sistema mecatrónico.
            </p>

            <table className="w-full text-[9pt] border-collapse border-y border-slate-800">
              <thead>
                <tr className="border-b border-slate-400 text-left">
                  <th className="py-1.5 pr-2 w-40">Tema / Subsistema</th>
                  <th className="py-1.5 pr-2">Qué ocurrió / Lección aprendida</th>
                  <th className="py-1.5">Cómo aplicarlo en futuros proyectos</th>
                  <th className="no-print py-1.5 text-right w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {lessonsLearned.map((item) => (
                  <tr key={item.id}>
                    <td className="py-1.5 pr-2 align-top">
                      <input
                        type="text"
                        placeholder="Ej. Divisores / UART"
                        value={item.topic}
                        onChange={(e) => onUpdateLesson(item.id, { topic: e.target.value })}
                        className="w-full border-b border-slate-300 bg-transparent text-xs font-semibold"
                      />
                    </td>
                    <td className="py-1.5 pr-2 align-top">
                      <textarea
                        rows={2}
                        placeholder="Describe el hallazgo o problema real..."
                        value={item.lesson}
                        onChange={(e) => onUpdateLesson(rowIdOrItem(item.id), { lesson: e.target.value })}
                        className="w-full border border-slate-300 rounded px-1.5 py-1 bg-transparent text-xs resize-y"
                      />
                    </td>
                    <td className="py-1.5 align-top">
                      <textarea
                        rows={2}
                        placeholder="Regla práctica para repetir en el siguiente proyecto..."
                        value={item.applyNextTime}
                        onChange={(e) =>
                          onUpdateLesson(item.id, { applyNextTime: e.target.value })
                        }
                        className="w-full border border-slate-300 rounded px-1.5 py-1 bg-transparent text-xs resize-y"
                      />
                    </td>
                    <td className="no-print py-1.5 text-right align-top">
                      <button
                        onClick={() => onDeleteLesson(item.id)}
                        aria-label="Eliminar lección"
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 4. BIBLIOTECA DE MÓDULOS REUTILIZABLES (10 MÓDULOS) */}
        {(activeSectionFilter === 'all' || activeSectionFilter === 'modules') && (
          <section className="space-y-4">
            <div>
              <h2 className="text-base font-bold flex items-center gap-2" style={{ color: accent }}>
                <Cpu className="w-4 h-4" />
                4. Biblioteca de Módulos Reutilizables (10 Bloques de Referencia)
              </h2>
              <p className="text-xs text-slate-700 mt-1">
                Fichas técnicas genéricas para reutilizar cada circuito y patrón en cualquier futuro
                proyecto de automatización o robótica (incluye esquema con valores, fórmula, errores
                comunes y código mínimo de ejemplo).
              </p>
            </div>

            <div className="space-y-5">
              {REUSABLE_ENGINEERING_MODULES.map((mod) => (
                <article
                  key={mod.id}
                  className="avoid-break border border-slate-300 rounded-lg p-4 bg-white space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">{mod.title}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-700">
                      {mod.id}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1.5">
                      <div>
                        <strong className="text-slate-900">Qué hace:</strong>{' '}
                        <span className="text-slate-700">{mod.whatItDoes}</span>
                      </div>
                      <div>
                        <strong className="text-slate-900">Cuándo usarlo:</strong>{' '}
                        <span className="text-slate-700">{mod.whenToUse}</span>
                      </div>
                      <div>
                        <strong className="text-slate-900">Valores de referencia:</strong>{' '}
                        <span className="text-slate-800 font-mono text-[11px]">{mod.valuesSummary}</span>
                      </div>
                      <div className="rounded bg-slate-100 border border-slate-200 px-2.5 py-1.5 font-mono text-[11px] text-slate-900">
                        <strong>Fórmula:</strong> {mod.formula}
                      </div>
                    </div>

                    <div>
                      <ModuleSchematicSvg moduleId={mod.id} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="rounded bg-rose-50/70 border border-rose-200 p-2.5">
                      <div className="font-bold text-rose-900 mb-1">Errores comunes a evitar:</div>
                      <ul className="list-disc list-inside space-y-0.5 text-rose-950 text-[11px]">
                        {mod.commonMistakes.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded bg-slate-900 text-slate-100 p-2.5">
                      <div className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1 mb-1">
                        <Code2 className="w-3 h-3" />
                        {mod.minimalCodeTitle}
                      </div>
                      <pre className="text-[10px] font-mono leading-snug overflow-x-auto whitespace-pre-wrap">
                        {mod.minimalCode}
                      </pre>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

function rowIdOrItem(id: string): string {
  return id;
}
