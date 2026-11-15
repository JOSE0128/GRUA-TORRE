import { ReusableModuleItem } from '../types/crane';

export const REUSABLE_ENGINEERING_MODULES: ReusableModuleItem[] = [
  {
    id: 'MOD-01',
    title: '1. Divisor de tensión resistivo (5 V → 3,33 V)',
    whatItDoes:
      'Reduce de manera proporcional una señal digital de 5 V a un nivel seguro (~3,33 V) para entradas lógicas de 3,3 V como ESP32 o STM32.',
    whenToUse:
      'Siempre que un sensor o placa de 5 V envíe datos digitales hacia un pin de 3,3 V que no es tolerante a 5 V (p. ej. ECHO de HC-SR04, TX de UNO o salida de Hall a 5 V).',
    valuesSummary: 'R1 = 1 kΩ (serie señal→nodo) + R2 = 1 kΩ + 1 kΩ = 2 kΩ en serie (nodo→GND). 3 resistencias de 1 kΩ idénticas.',
    formula: 'V_out = V_in × R_abajo ÷ (R_arriba + R_abajo) = 5 × 2 kΩ ÷ (1 kΩ + 2 kΩ) = 3,33 V',
    commonMistakes: [
      'Olvidar conectar el extremo inferior de R_abajo a la masa común (GND): el nodo sube a 5 V y daña el ESP32.',
      'Usar valores demasiado altos (> 100 kΩ) en señales rápidas de ultrasonido o UART, deformando los flancos.',
      'Conectar primero el ESP32 sin medir 3,33 V ± 0,1 V con multímetro.',
    ],
    minimalCodeTitle: 'Lectura digital protegida (genérico)',
    minimalCode: `// Entrada digital protegida por divisor 1k + 2k -> 3.33 V
const int PIN_SENAL = 23;
void setup() { pinMode(PIN_SENAL, INPUT); }
void loop() { int estado = digitalRead(PIN_SENAL); }`,
  },
  {
    id: 'MOD-02',
    title: '2. Resistencias Pull-up y Pull-down para pulsadores',
    whatItDoes:
      'Fija un nivel lógico conocido (3,3 V/5 V en reposo para pull-up, o 0 V en pull-down) cuando un pulsador o interruptor está abierto, evitando lecturas flotantes.',
    whenToUse:
      'En todo pulsador mecánico o final de carrera. Obligatoria de forma externa en pines sin pull-up interna (como GPIO34–39 del ESP32).',
    valuesSummary: 'R_pullup = 1 kΩ a 10 kΩ entre el pin de lectura y +VCC; pulsador entre ese mismo pin y GND.',
    formula: 'I_reposo ≈ 0 A; I_pulsado = V_CC ÷ R_pullup (con 3,3 V y 1 kΩ → 3,3 mA)',
    commonMistakes: [
      'Colocar pull-up externa en pines de arranque sensibles (p. ej. GPIO12 del ESP32 puede fallar el booteo).',
      'Conectar el pulsador en paralelo con la fuente en lugar de ir del pin al riel opuesto (cortocircuito al oprimir).',
      'No filtrar el rebote mecánico (debounce de 20–50 ms en software).',
    ],
    minimalCodeTitle: 'Lectura activa en LOW con filtro de rebote',
    minimalCode: `const int PIN_BTN = 39; // Con R externa de 1 kOhm a 3.3 V
void setup() { pinMode(PIN_BTN, INPUT); }
bool presionado() { return digitalRead(PIN_BTN) == LOW; }`,
  },
  {
    id: 'MOD-03',
    title: '3. Puente H (L298N / L293D) con control de velocidad PWM',
    whatItDoes:
      'Permite invertir la polaridad de un motor DC (adelante/atrás/freno) y regular su velocidad modulando el ancho de pulso (PWM) en el pin Enable.',
    whenToUse:
      'Para controlar motores DC bidireccionales o cargas inductivas cuya corriente y voltaje (p. ej. 12 V) superan lo que entrega un microcontrolador.',
    valuesSummary: 'Pines dirección IN1/IN2 (lógica 3,3 V o 5 V); ENA PWM 1–20 kHz; alimentación potencia 12 V aislada de la lógica 5 V.',
    formula: 'V_efectivo ≈ V_potencia × (Ciclo_útil_PWM ÷ 100 %)',
    commonMistakes: [
      'Dejar puesto el jumper 5V-EN del L298N al alimentar el borne de 5 V desde una fuente externa.',
      'No unir la masa (GND) del driver con la masa del microcontrolador.',
      'Activar el motor al 100 % cuando el driver (p. ej. L293D) solo soporta 0,6 A continuos.',
    ],
    minimalCodeTitle: 'Giro en dos sentidos con rampa PWM',
    minimalCode: `void moverMotor(int pinIn1, int pinIn2, int pinEn, bool fwd, int pwm) {
  digitalWrite(pinIn1, fwd ? HIGH : LOW);
  digitalWrite(pinIn2, fwd ? LOW : HIGH);
  analogWrite(pinEn, constrain(pwm, 0, 255));
}`,
  },
  {
    id: 'MOD-04',
    title: '4. Encoder óptico ranurado (FC-33 / LM393) por interrupción',
    whatItDoes:
      'Cuenta los pasos o vueltas de un eje midiendo cuántas veces las ranuras de un disco interrumpen un haz infrarrojo.',
    whenToUse:
      'Para medir posición angular, distancia lineal sobre un tambor o velocidad de giro en lazo cerrado.',
    valuesSummary: 'Disco de N ranuras (ancho ≥ 4 mm, espesor ≤ 2 mm en ranura de 5 mm); alimentación 3,3 V para conectar OUT directo al ESP32.',
    formula: 'Δs = π · D ÷ (2 · N) por flanco (CHANGE)  |  Δθ = 360° ÷ (2 · N · i)',
    commonMistakes: [
      'Alimentar el FC-33 con 5 V y conectarlo sin divisor al ESP32.',
      'Olvidar la palabra clave volatile e IRAM_ATTR en la rutina de interrupción del ESP32.',
      'Hacer el disco demasiado grueso o con ranuras menores de 4 mm (no corta bien el haz).',
    ],
    minimalCodeTitle: 'Contador por flancos con interrupción segura',
    minimalCode: `volatile long pulsos = 0;
void IRAM_ATTR isrEncoder() { pulsos++; }
void setup() {
  pinMode(34, INPUT);
  attachInterrupt(digitalPinToInterrupt(34), isrEncoder, CHANGE);
}`,
  },
  {
    id: 'MOD-05',
    title: '5. Sensor ultrasónico HC-SR04 con divisor y mediana',
    whatItDoes:
      'Mide distancias sin contacto calculando el tiempo de vuelo de un pulso acústico de 40 kHz y protegiendo la señal ECHO de 5 V con divisor.',
    whenToUse:
      'Medición de carros lineales o altura sobre superficie plana cuando se requiere lectura absoluta sin desgaste mecánico.',
    valuesSummary: 'VCC = 5 V, TRIG = 3,3 V (pulso 10 µs), ECHO = 5 V → Divisor 1 kΩ+2 kΩ → 3,33 V; intervalo ≥ 60 ms entre sensores.',
    formula: 'v = 331,3 + 0,606 · T (°C) [m/s]  |  d = (v · t_eco) ÷ 2',
    commonMistakes: [
      'Disparar dos sensores ultrasónicos al mismo tiempo (causa eco cruzado falso).',
      'Conectar ECHO directo a 5 V hacia un ESP32 sin divisor.',
      'Apuntar hacia una superficie curva o muy pequeña en vez de una placa plana perpendicular.',
    ],
    minimalCodeTitle: 'Disparo único y conversión a centímetros',
    minimalCode: `float medirCm(int trigPin, int echoPin, float tempC) {
  digitalWrite(trigPin, LOW); delayMicroseconds(2);
  digitalWrite(trigPin, HIGH); delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long us = pulseIn(echoPin, HIGH, 25000);
  float vCmUs = (331.3 + 0.606 * tempC) * 0.0001;
  return (us * vCmUs) / 2.0;
}`,
  },
  {
    id: 'MOD-06',
    title: '6. Bus I2C y gestión de direcciones repetidas',
    whatItDoes:
      'Comunica pantallas OLED, LCD y sensores mediante solo 2 hilos (SDA datos y SCL reloj) asignando una dirección hexadecimal única en cada bus.',
    whenToUse:
      'Pantallas LCD 1602 (0x27 o 0x3F), OLED SSD1306 (0x3C) y sensores digitales múltiples.',
    valuesSummary: 'ESP32 soporta 2 buses I2C independientes (Wire en D21/D22 y Wire1 en D16/D17) para usar dos OLED 0x3C sin multiplexor.',
    formula: 'Frecuencia estándar = 100 kHz; modo rápido = 400 kHz',
    commonMistakes: [
      'Conectar dos pantallas OLED con la misma dirección 0x3C en los mismos pines SDA/SCL.',
      'Invertir los pines SDA y SCL o no compartir GND común.',
      'Asumir 0x27 en una LCD con expansor PCF8574 sin correr un escáner I2C (puede ser 0x3F).',
    ],
    minimalCodeTitle: 'Doble bus Wire y Wire1 en ESP32',
    minimalCode: `#include <Wire.h>
void setup() {
  Wire.begin(21, 22);       // Bus #1 (OLED A 0x3C)
  Wire1.begin(16, 17);      // Bus #2 (OLED B 0x3C)
}`,
  },
  {
    id: 'MOD-07',
    title: '7. Enlace UART entre placas de distinta tensión (3,3 V ↔ 5 V)',
    whatItDoes:
      'Permite comunicación serie bidireccional segura entre un microcontrolador de 3,3 V y otro de 5 V protegiendo el receptor de 3,3 V.',
    whenToUse:
      'Cuando se coordina un ESP32 con un Arduino UNO u otro periférico serial TTL de 5 V.',
    valuesSummary: 'TX 3,3 V → RX 5 V directo (el 5 V reconoce ≥ 2,5 V como HIGH); TX 5 V → Divisor 1k+2k → RX 3,3 V con jumper desmontable.',
    formula: 'Tasa estándar recomendada para SoftwareSerial / enlace estable: 9600 o 38400 baudios',
    commonMistakes: [
      'Conectar TX con TX y RX con RX en vez de cruzarlos (TX siempre va a RX).',
      'Dejar conectado un pin de arranque como ESP32 D2 durante la carga por USB.',
      'Usar velocidades muy altas (115200 bps) en SoftwareSerial del Arduino UNO, generando tramas corruptas.',
    ],
    minimalCodeTitle: 'Serial2 en ESP32 con pines remapeados',
    minimalCode: `// RX en GPIO2 (vía divisor desde UNO TX), TX en GPIO15 (hacia UNO RX)
void setup() {
  Serial2.begin(9600, SERIAL_8N1, 2, 15);
}`,
  },
  {
    id: 'MOD-08',
    title: '8. Electroimán 12 V con pulso inverso de desmagnetización',
    whatItDoes:
      'Sujeta piezas ferromagnéticas al energizar a 12 V y elimina el magnetismo remanente aplicando un breve pulso de polaridad invertida al soltar.',
    whenToUse:
      'Manipulación robotizada de cargas ligeras con tapa o arandela de acero donde la carga no debe quedar pegada por histéresis al apagar.',
    valuesSummary: 'M2 del Puente H (≤ 0,6 A continuos), retención 12 V, pulso inverso de liberación entre 40 ms y 80 ms antes de pasar a apagado (0 V).',
    formula: 'Energía disipada E = V · I · t  |  Duración segura de pulso inverso: t_rev ≤ 80 ms',
    commonMistakes: [
      'Dejar el pulso inverso encendido demasiado tiempo (> 200 ms): vuelve a magnetizar la pieza con el polo contrario.',
      'Usar arandelas pequeñas o de acero inoxidable austenítico (no magnético).',
      'No verificar el agarre con sensor (p. ej. subir 2 cm y medir distancia US-V) antes de trasladar.',
    ],
    minimalCodeTitle: 'Secuencia de liberación sin magnetismo residual',
    minimalCode: `void soltarElectroiman(int pinA, int pinB) {
  digitalWrite(pinA, LOW);  digitalWrite(pinB, HIGH); // Pulso inverso
  delay(60);                                          // <= 80 ms
  digitalWrite(pinA, LOW);  digitalWrite(pinB, LOW);  // Apagado total
}`,
  },
  {
    id: 'MOD-09',
    title: '9. Masa en estrella (Single-Point Grounding)',
    whatItDoes:
      'Reúne todos los retornos negativos (fuentes de potencia, lógica, drivers y sensores) en un único nodo físico para impedir lazos de tierra y caídas de voltaje.',
    whenToUse:
      'Obligatorio en todo proyecto que mezcle motores/actuadores inductivos de alta corriente con microcontroladores y sensores analógicos/I2C.',
    valuesSummary: 'Riel único de referencia R1 en P1 unido con 1 jumper firme a R1 de P2; nunca encadenar la masa lógica después del retorno de un motor.',
    formula: 'ΔV_ruido = I_motor × R_pista_compartida (se vuelve ~0 V si las ramas no comparten retorno de potencia)',
    commonMistakes: [
      'Sacar la masa de un sensor desde el terminal GND de un motor que está recibiendo corriente pulsada (PWM).',
      'Dejar dos protoboards aisladas sin puente entre sus rieles azules (−).',
      'Unir por accidente los rieles positivos R2 (+5 V) y R3 (+3,3 V) al intentar unir las masas.',
    ],
    minimalCodeTitle: 'Verificación eléctrica previa al encendido',
    minimalCode: `// Verificación física obligatoria con multímetro (sin código):
// 1. Escala continuidad: P1(R1) <-> P2(R1) <-> GND fuentes <-> GND drivers < 1 Ohm.
// 2. Escala continuidad: P1(R2 +5V) <-> P2(R3 +3.3V) = OL (circuito abierto).`,
  },
  {
    id: 'MOD-10',
    title: '10. Rizo de cable pasante para giro limitado (0°–360°)',
    whatItDoes:
      'Transmite energía y decenas de señales a una estructura giratoria sin anillo colector rozante, dejando una espiral flexible holgada alrededor del eje.',
    whenToUse:
      'Mecanismos con giro acotado por topes físicos (≤ 360°) que suben cables por el centro de un mástil o columna hueca.',
    valuesSummary: '≥ 1,5 vueltas en espiral Ø 6–8 cm sobre eje guía ~15 mm; reserva mínima ≥ 40 cm + 15 cm de alivio por extremo; radio curva ≥ 5 × Ø_haz.',
    formula: 'L_manguera = H_mástil + Reserva_rizo (≥ 40 cm) + 30 cm (extremos) + extra_cabeza',
    commonMistakes: [
      'Dejar el cable recto y tenso: se parte o arranca los conectores antes de completar los 360°.',
      'No colocar topes mecánicos ni detector HOME en 0° (si da dos vueltas en el mismo sentido, rompe la manguera).',
      'Oprimir el haz contra aristas vivas sin buje/guía o exceder el 70 % de llenado del ducto.',
    ],
    minimalCodeTitle: 'Protección por tope HOME y límite 0°–360°',
    minimalCode: `// Regla de control de giro seguro sin anillo colector:
const float THETA_MIN = 0.0, THETA_MAX = 360.0;
bool giroPermitido(float targetTheta, bool homeActivo) {
  if (targetTheta <= 0 && homeActivo) return false;
  return (targetTheta >= THETA_MIN && targetTheta <= THETA_MAX);
}`,
  },
];
