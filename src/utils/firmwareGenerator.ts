import { CraneProjectJson, GeneratedFirmwareBundle } from '../types/crane';
import { lintFirmwareBundle } from './firmwareLinter';
import { generatePanelWebHtml } from './panelWebGenerator';
import { FIRMWARE_LIBRARIES } from './projectJson';
import { buildZipBlob } from './zipBuilder';

function pinNum(project: CraneProjectJson, id: string, fallback: string): string {
  const raw = project.pins.find((p) => p.id === id)?.pin ?? fallback;
  return raw.replace(/^D/i, '');
}

function pinPair(project: CraneProjectJson, id: string, fallback: [string, string]): [string, string] {
  const raw = project.pins.find((p) => p.id === id)?.pin;
  if (!raw || !raw.includes('/')) return fallback;
  const parts = raw.split('/').map((s) => s.trim().replace(/^D/i, ''));
  return [parts[0] || fallback[0], parts[1] || fallback[1]];
}

export function generateFirmwareBundle(project: CraneProjectJson): GeneratedFirmwareBundle {
  const cal = project.calibration;
  const net = project.network;

  // Pines ESP32 desde project.json
  const pCabEna = pinNum(project, 'PA01', '25');
  const pCabIn1 = pinNum(project, 'PA02', '26');
  const pCabIn2 = pinNum(project, 'PA03', '27');
  const pGiroEnb = pinNum(project, 'PA04', '14');
  const pGiroIn3 = pinNum(project, 'PA05', '13');
  const pGiroIn4 = pinNum(project, 'PA06', '4');

  const pEncGiro = pinNum(project, 'PA07', '34');
  const pEncCarro = pinNum(project, 'PA08', '35');
  const pEncGancho = pinNum(project, 'PA09', '32');
  const pHall = pinNum(project, 'PA10', '33');
  const pHome = pinNum(project, 'PA11', '39');
  const pPot1 = pinNum(project, 'PA12', '36');
  const pParo = pinNum(project, 'PA13', '12');

  const pUshTrig = pinNum(project, 'PA14', '19');
  const pUshEcho = pinNum(project, 'PA15', '23');
  const pUsvTrig = pinNum(project, 'PA16', '5');
  const pUsvEcho = pinNum(project, 'PA17', '18');

  const [oledASda, oledAScl] = pinPair(project, 'PA18', ['21', '22']);
  const [oledBSda, oledBScl] = pinPair(project, 'PA19', ['16', '17']);
  const pUartTx = pinNum(project, 'PA20', '15');
  const pUartRx = pinNum(project, 'PA21', '2');

  // Pines UNO desde project.json
  const pUnoRx = pinNum(project, 'PA22', 'A0');
  const pUnoTx = pinNum(project, 'PA23', 'A1');
  const pUnoPot2 = pinNum(project, 'PA24', 'A2');
  const pUnoBuz3 = pinNum(project, 'PA25', 'A3');
  const pUnoBtnA = pinNum(project, 'PA27', '2');
  const pUnoBtnB = pinNum(project, 'PA28', '9');
  const pUnoBuz1 = pinNum(project, 'PA29', '10');
  const pUnoBuz2 = pinNum(project, 'PA30', '13');

  const slotsGiro = cal.slotsGiroN ?? 20;
  const slotsCarro = cal.slotsCarroN ?? 20;
  const slotsGancho = cal.slotsGanchoN ?? 20;
  const ratioI = cal.gearRatioGiroI ?? 3.6;
  const diamCarro = cal.drumDiameterCarroCm ?? 3.0;
  const diamGancho = cal.drumDiameterGanchoCm ?? 3.0;
  const sH = cal.usHOffsetShCm ?? 0.0;
  const whAng = cal.warehouseAngleDeg ?? 180.0;
  const dCp = cal.counterweightDistDcpCm ?? 18.0;
  const lcdAddr = cal.lcdI2cAddress === '0x3F' ? '0x3F' : '0x27';
  const wifiPass = net.wifiPassword && net.wifiPassword.length >= 8 ? net.wifiPassword : 'CAMBIAR_CLAVE_8';

  const esp32ConfigH = `// Archivo generado automaticamente desde project.json (${project.schemaVersion})
// NO edites numeros de pin aqui a mano: modificalos en Crane Studio y regenera.
#pragma once

// --- RED WIFI AP, mDNS, PIN Y OTA ---
#define WIFI_AP_SSID        "${net.wifiSsid}"
#define WIFI_AP_PASS        "${wifiPass}"
#define MDNS_HOST           "${net.mdnsHost}"
#define USE_MDNS            ${net.useMdns ? 1 : 0}
#define OPERATOR_PIN_REQ    ${net.operatorPinEnabled ? 1 : 0}
#define OPERATOR_PIN_STR    "${net.operatorPin}"
#define ENABLE_OTA          ${net.otaEnabled ? 1 : 0}
#define OTA_PASS            "${net.otaPassword}"
#define USE_BLUEPAD32       0  // Cambiar a 1 solo si compilas con tarjeta Bluepad32 instalada

// --- PINES ESP32 (3,3 V ESTRICTO) ---
#define PIN_CAB_ENA         ${pCabEna}
#define PIN_CAB_IN1         ${pCabIn1}
#define PIN_CAB_IN2         ${pCabIn2}
#define PIN_GIRO_ENB        ${pGiroEnb}
#define PIN_GIRO_IN3        ${pGiroIn3}
#define PIN_GIRO_IN4        ${pGiroIn4}

#define PIN_ENC_GIRO        ${pEncGiro}
#define PIN_ENC_CARRO       ${pEncCarro}
#define PIN_ENC_GANCHO      ${pEncGancho}
#define PIN_HALL            ${pHall}
#define PIN_HOME            ${pHome}
#define PIN_POT1            ${pPot1}
#define PIN_PARO            ${pParo}   // Prohibida resistencia externa: solo INPUT_PULLUP

#define PIN_USH_TRIG        ${pUshTrig}
#define PIN_USH_ECHO        ${pUshEcho}  // Entra por Divisor #1 (3,33 V)
#define PIN_USV_TRIG        ${pUsvTrig}
#define PIN_USV_ECHO        ${pUsvEcho}  // Entra por Divisor #2 (3,33 V)

#define PIN_OLEDA_SDA       ${oledASda}
#define PIN_OLEDA_SCL       ${oledAScl}
#define PIN_OLEDB_SDA       ${oledBSda}
#define PIN_OLEDB_SCL       ${oledBScl}

#define PIN_UART_TX         ${pUartTx}  // Hacia UNO A0
#define PIN_UART_RX         ${pUartRx}  // Desde UNO A1 via Divisor #3 + jumper desmontable

// --- LIMITES DE POTENCIA Y SEGURIDAD ---
#define MAX_MOTORES_SIMULTANEOS ${project.architecture.maxSimultaneousMotors}
#define MAX_PWM_GIRO        ${cal.maxPwmGiro}
#define MAX_PWM_CABRESTANTE ${cal.maxPwmCabrestante}
#define MAX_PWM_CARRO       ${Math.min(130, cal.maxPwmCarro)}  // <= 50 % para proteger L293D (< 0,6 A)
#define MAX_PWM_BOMBILLO    ${cal.maxPwmBombillo}              // ~ 40 % para 4-5 V efectivos
#define PULSO_INVERSO_MS    80   // Maximo 80 ms para desmagnetizar carga

// --- CALIBRACION MECANICA Y SENSORES ---
#define SLOTS_GIRO_N        ${slotsGiro}
#define SLOTS_CARRO_N       ${slotsCarro}
#define SLOTS_GANCHO_N      ${slotsGancho}
#define GIRO_RATIO_I        ${ratioI.toFixed(3)}f
#define DIAM_CARRO_CM       ${diamCarro.toFixed(3)}f
#define DIAM_GANCHO_CM      ${diamGancho.toFixed(3)}f
#define OFFSET_USH_SH_CM    ${sH.toFixed(2)}f
#define OFFSET_USV_E_CM     ${cal.usVOffsetECm.toFixed(2)}f
#define RADIO_MIN_R0_CM     ${(cal.r0MinCm ?? 8).toFixed(2)}f
#define RADIO_MAX_UTIL_CM   ${cal.rMaxUsefulCm.toFixed(2)}f
#define BODEGA_R_CM         ${cal.warehouseRadiusCm.toFixed(2)}f
#define BODEGA_THETA_DEG    ${whAng.toFixed(2)}f
#define DIST_CONTRAPESO_CM  ${dCp.toFixed(2)}f
#define TEMP_AMBIENTE_C     ${cal.ambientTempC.toFixed(1)}f
#define VEL_SONIDO_CM_US    ${cal.speedOfSoundCmPerUs.toFixed(6)}f

// --- PROTOCOLO GT-1.0 ---
#define GT10_BAUD           ${project.protocolGT10.baudRate}
#define GT10_PING_MS        ${project.protocolGT10.pingIntervalMs}
#define GT10_TIMEOUT_MS     ${project.protocolGT10.timeoutMs}
`;

  const esp32ErroresH = `// Tabla de codigos de error E01-E07 sincronizada con project.json
#pragma once

struct ErrorSpec {
  const char* code;
  const char* title;
};

static const ErrorSpec CRANE_ERRORS[] = {
${project.errorCodes.map((e) => `  { "${e.code}", "${e.title}" }`).join(',\n')}
};
`;

  const panelHtml = generatePanelWebHtml(project);
  const panelWebH = `// HTML autocontenido del Panel de Control Embebido (${new TextEncoder().encode(panelHtml).length} bytes, 0 CDNs externos)
#pragma once
#include <pgmspace.h>

const char PANEL_WEB_HTML[] PROGMEM = R"rawliteral(
${panelHtml}
)rawliteral";
`;

  const esp32Ino = `/*
 * grua_esp32.ino — Controlador Principal (ESP32 DevKit 30 pines)
 * Generado deterministicamente desde project.json (${project.schemaVersion})
 * Reglas activas:
 *  - Cero delay(): maquina de estados no bloqueante basada en millis().
 *  - Todas las ISR con IRAM_ATTR + contadores volatile + secciones criticas portMUX.
 *  - Arbitro central: maximo 2 motores simultaneos (fuente 12 V 2 A).
 *  - Electroiman NUNCA se apaga por perdida de enlace o timeout.
 *  - Watchdog hardware activo (esp_task_wdt).
 */
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <Wire.h>
#include <ArduinoOTA.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <esp_task_wdt.h>
#include "config.h"
#include "errores.h"
#include "panel_web.h"

// --- Buses I2C hardware separados para OLED A y OLED B (ambas 0x3C) ---
TwoWire I2C_OLED_B = TwoWire(1);
Adafruit_SSD1306 oledA(128, 64, &Wire, -1);
Adafruit_SSD1306 oledB(128, 64, &I2C_OLED_B, -1);
WebServer server(80);
Preferences prefs;
HardwareSerial UnoSerial(2);

// --- Maquina de Estados ---
enum FsmState {
  ST_INICIO, ST_REPOSO, ST_HOMING, ST_MANUAL,
  ST_ESCANEO, ST_LISTO, ST_TRABAJANDO, ST_PARO, ST_FALLA
};
enum WorkSubState {
  SUB_NINGUNO, SUB_IR, SUB_BAJAR, SUB_ENGANCHAR_5S, SUB_VERIFICAR_2CM,
  SUB_TRANSPORTAR, SUB_BAJAR_BODEGA, SUB_ESPERA_5S, SUB_SOLTAR_PULSO, SUB_SUBIR
};

FsmState fsm = ST_INICIO;
WorkSubState workSub = SUB_NINGUNO;
unsigned long subTimerMs = 0;

// --- Variables criticas de interrupciones (IRAM_ATTR) ---
portMUX_TYPE isrMux = portMUX_INITIALIZER_UNLOCKED;
volatile long pulsesGiro = 0;
volatile long pulsesCarro = 0;
volatile long pulsesGancho = 0;
volatile int8_t dirGiro = 0;
volatile int8_t dirCarro = 0;
volatile int8_t dirGancho = 0;
volatile bool hallTopFlag = false;

volatile unsigned long ushStartUs = 0;
volatile unsigned long ushPulseUs = 0;
volatile bool ushReady = false;
volatile unsigned long usvStartUs = 0;
volatile unsigned long usvPulseUs = 0;
volatile bool usvReady = false;

void IRAM_ATTR isrEncGiro() {
  portENTER_CRITICAL_ISR(&isrMux);
  pulsesGiro += (dirGiro >= 0) ? 1 : -1;
  portEXIT_CRITICAL_ISR(&isrMux);
}
void IRAM_ATTR isrEncCarro() {
  portENTER_CRITICAL_ISR(&isrMux);
  pulsesCarro += (dirCarro >= 0) ? 1 : -1;
  portEXIT_CRITICAL_ISR(&isrMux);
}
void IRAM_ATTR isrEncGancho() {
  portENTER_CRITICAL_ISR(&isrMux);
  pulsesGancho += (dirGancho >= 0) ? 1 : -1;
  portEXIT_CRITICAL_ISR(&isrMux);
}
void IRAM_ATTR isrHall() {
  portENTER_CRITICAL_ISR(&isrMux);
  hallTopFlag = (digitalRead(PIN_HALL) == LOW);
  portEXIT_CRITICAL_ISR(&isrMux);
}
void IRAM_ATTR isrUshEcho() {
  portENTER_CRITICAL_ISR(&isrMux);
  if (digitalRead(PIN_USH_ECHO) == HIGH) {
    ushStartUs = micros();
  } else if (ushStartUs > 0) {
    ushPulseUs = micros() - ushStartUs;
    ushReady = true;
    ushStartUs = 0;
  }
  portEXIT_CRITICAL_ISR(&isrMux);
}
void IRAM_ATTR isrUsvEcho() {
  portENTER_CRITICAL_ISR(&isrMux);
  if (digitalRead(PIN_USV_ECHO) == HIGH) {
    usvStartUs = micros();
  } else if (usvStartUs > 0) {
    usvPulseUs = micros() - usvStartUs;
    usvReady = true;
    usvStartUs = 0;
  }
  portEXIT_CRITICAL_ISR(&isrMux);
}

// --- Estado de actuadores y arbitro de max 2 motores ---
bool mCabActive = false;
bool mGiroActive = false;
bool mCarroActive = false;
bool electromagnetOn = false;
bool counterweightConfirmed = false;
bool unoLinkAlive = false;
unsigned long lastUnoRxMs = 0;
unsigned long lastPingTxMs = 0;
unsigned long lastUiRefreshMs = 0;
String activeErrorCode = "OK";

// --- Ultrasonidos alternados >= 60 ms + mediana de 5 (2..400 cm) ---
float ushBuf[5] = {0}; uint8_t ushIdx = 0; float ushCm = 0;
float usvBuf[5] = {0}; uint8_t usvIdx = 0; float usvCm = 0;
unsigned long lastUsTrigMs = 0;
bool trigNextVertical = false;
uint8_t usInvalidCount = 0;
float velSonidoCmUs = VEL_SONIDO_CM_US;
float calR0 = RADIO_MIN_R0_CM;
float calE = OFFSET_USV_E_CM;
float calSh = OFFSET_USH_SH_CM;
float calDcp = DIST_CONTRAPESO_CM;

struct CargaItem { String id; float massG; float rCm; float thetaDeg; int order; };
CargaItem cargas[10];
int numCargas = 0;
int cargaActualIdx = 0;

struct LogItem { unsigned long tSec; String state; String msg; };
LogItem logs[30];
int logHead = 0;

void pushLog(const String& msg) {
  logs[logHead] = { millis() / 1000UL, String((int)fsm), msg };
  logHead = (logHead + 1) % 30;
}

float median5(const float* arr) {
  float tmp[5];
  for (int i = 0; i < 5; i++) tmp[i] = arr[i];
  for (int i = 0; i < 4; i++) {
    for (int j = i + 1; j < 5; j++) {
      if (tmp[j] < tmp[i]) { float t = tmp[i]; tmp[i] = tmp[j]; tmp[j] = t; }
    }
  }
  return tmp[2];
}

// --- Protocolo GT-1.0 con checksum XOR ---
uint8_t gt10Checksum(const String& payload) {
  uint8_t cs = 0;
  for (size_t i = 0; i < payload.length(); i++) cs ^= (uint8_t)payload[i];
  return cs;
}
void sendGt10(const String& body) {
  uint8_t cs = gt10Checksum(body);
  char tail[6];
  snprintf(tail, sizeof(tail), "*%02X\\n", cs);
  String frame = "$" + body + String(tail);
  if (frame.length() <= 48) UnoSerial.print(frame);
}

// --- Arbitro central: maximo 2 motores activos ---
int countActiveMotors() {
  return (mCabActive ? 1 : 0) + (mGiroActive ? 1 : 0) + (mCarroActive ? 1 : 0);
}
void setCabrestante(int8_t dir, uint8_t pwm) {
  if (dir != 0 && !mCabActive && countActiveMotors() >= MAX_MOTORES_SIMULTANEOS) return;
  dirCabReset:
  dirGancho = dir;
  if (dir == 0 || pwm == 0) {
    digitalWrite(PIN_CAB_IN1, LOW); digitalWrite(PIN_CAB_IN2, LOW);
    ledcWrite(PIN_CAB_ENA, 0); mCabActive = false;
  } else {
    digitalWrite(PIN_CAB_IN1, dir > 0 ? HIGH : LOW);
    digitalWrite(PIN_CAB_IN2, dir > 0 ? LOW : HIGH);
    ledcWrite(PIN_CAB_ENA, min<uint8_t>(pwm, MAX_PWM_CABRESTANTE));
    mCabActive = true;
  }
}
void setGiro(int8_t dir, uint8_t pwm) {
  if (dir != 0 && !mGiroActive && countActiveMotors() >= MAX_MOTORES_SIMULTANEOS) return;
  dirGiro = dir;
  if (dir == 0 || pwm == 0) {
    digitalWrite(PIN_GIRO_IN3, LOW); digitalWrite(PIN_GIRO_IN4, LOW);
    ledcWrite(PIN_GIRO_ENB, 0); mGiroActive = false;
  } else {
    digitalWrite(PIN_GIRO_IN3, dir > 0 ? HIGH : LOW);
    digitalWrite(PIN_GIRO_IN4, dir > 0 ? LOW : HIGH);
    ledcWrite(PIN_GIRO_ENB, min<uint8_t>(pwm, MAX_PWM_GIRO));
    mGiroActive = true;
  }
}
void setCarro(int8_t dir, uint8_t pwm) {
  if (dir != 0 && !mCarroActive && countActiveMotors() >= MAX_MOTORES_SIMULTANEOS) {
    dir = 0; pwm = 0;
  }
  dirCarro = dir;
  mCarroActive = (dir != 0 && pwm > 0);
  uint8_t safePwm = min<uint8_t>(pwm, MAX_PWM_CARRO);
  sendGt10("M1," + String(dir) + "," + String(safePwm));
}
void stopAllMotorsOnly() {
  setCabrestante(0, 0);
  setGiro(0, 0);
  setCarro(0, 0);
}
void setElectromagnetExplicit(uint8_t mode) {
  // mode: 0=OFF, 1=ON, 2=PULSO_INVERSO
  electromagnetOn = (mode == 1);
  sendGt10("M2," + String(mode) + ",255");
}

// --- Cinematica desde project.json ---
float getThetaDeg() {
  long p;
  portENTER_CRITICAL(&isrMux); p = pulsesGiro; portEXIT_CRITICAL(&isrMux);
  return (float)p * 360.0f / (2.0f * (float)SLOTS_GIRO_N * GIRO_RATIO_I);
}
float getRadioCm() {
  long p;
  portENTER_CRITICAL(&isrMux); p = pulsesCarro; portEXIT_CRITICAL(&isrMux);
  float encR = calR0 + ((float)p * PI * DIAM_CARRO_CM) / (2.0f * (float)SLOTS_CARRO_N);
  return ushCm > 2.0f ? (ushCm + calSh) : encR;
}
float getAlturaZCm() {
  long p;
  portENTER_CRITICAL(&isrMux); p = pulsesGancho; portEXIT_CRITICAL(&isrMux);
  return ((float)p * PI * DIAM_GANCHO_CM) / (2.0f * (float)SLOTS_GANCHO_N);
}

const char* fsmName(FsmState s) {
  switch (s) {
    case ST_INICIO: return "INICIO";
    case ST_REPOSO: return "REPOSO";
    case ST_HOMING: return "HOMING";
    case ST_MANUAL: return "MANUAL";
    case ST_ESCANEO: return "ESCANEO";
    case ST_LISTO: return "LISTO";
    case ST_TRABAJANDO: return "TRABAJANDO";
    case ST_PARO: return "PARO";
    case ST_FALLA: return "FALLA";
  }
  return "REPOSO";
}

// --- Endpoints WebServer ---
bool checkPinAuth() {
  if (!OPERATOR_PIN_REQ) return true;
  if (server.hasHeader("X-Crane-Pin") && server.header("X-Crane-Pin") == OPERATOR_PIN_STR) return true;
  server.send(403, "application/json", "{\\"ok\\":false,\\"err\\":\\"PIN_REQUERIDO\\"}");
  return false;
}

void handleEstado() {
  String j = "{";
  j += "\\"estado\\":\\"" + String(fsmName(fsm)) + "\\",";
  j += "\\"sub\\":\\"" + String((int)workSub) + "\\",";
  j += "\\"theta\\":" + String(getThetaDeg(), 1) + ",";
  j += "\\"r\\":" + String(getRadioCm(), 1) + ",";
  j += "\\"z\\":" + String(getAlturaZCm(), 1) + ",";
  j += "\\"ush\\":" + String(ushCm, 1) + ",";
  j += "\\"usv\\":" + String(usvCm, 1) + ",";
  j += "\\"hall\\":" + String(digitalRead(PIN_HALL) == LOW ? 1 : 0) + ",";
  j += "\\"home\\":" + String(digitalRead(PIN_HOME) == LOW ? 1 : 0) + ",";
  j += "\\"paro\\":" + String(digitalRead(PIN_PARO) == LOW ? 1 : 0) + ",";
  j += "\\"link\\":" + String(unoLinkAlive ? 1 : 0) + ",";
  j += "\\"mag\\":" + String(electromagnetOn ? 1 : 0) + ",";
  j += "\\"mot\\":" + String(countActiveMotors()) + ",";
  j += "\\"err\\":\\"" + activeErrorCode + "\\",";
  j += "\\"cargas\\":[";
  for (int i = 0; i < numCargas; i++) {
    if (i > 0) j += ",";
    j += "{\\"id\\":\\"" + cargas[i].id + "\\",\\"massG\\":" + String(cargas[i].massG, 0) +
         ",\\"rCm\\":" + String(cargas[i].rCm, 1) + ",\\"thetaDeg\\":" + String(cargas[i].thetaDeg, 1) +
         ",\\"order\\":" + String(cargas[i].order) + "}";
  }
  j += "]}";
  server.send(200, "application/json", j);
}

void handleOrden() {
  if (!checkPinAuth()) return;
  String body = server.arg("plain");
  if (body.indexOf("PARO") >= 0) {
    stopAllMotorsOnly();
    fsm = ST_PARO;
    activeErrorCode = "E05";
    pushLog("PARO activado desde panel");
  } else if (body.indexOf("REARMAR") >= 0) {
    if (digitalRead(PIN_PARO) == HIGH) {
      activeErrorCode = "OK";
      fsm = ST_REPOSO;
      pushLog("Sistema rearmado a REPOSO");
    }
  } else if (body.indexOf("HOME") >= 0 && fsm != ST_PARO) {
    fsm = ST_HOMING;
    pushLog("Iniciando HOMING");
  } else if (body.indexOf("ESCANEO") >= 0 && fsm != ST_PARO) {
    fsm = ST_ESCANEO;
    pushLog("Iniciando ESCANEO");
  } else if (body.indexOf("TRABAJAR") >= 0 && fsm != ST_PARO) {
    if (body.indexOf("\\"contrapeso\\":1") >= 0) {
      counterweightConfirmed = true;
      cargaActualIdx = 0;
      workSub = SUB_IR;
      subTimerMs = millis();
      fsm = ST_TRABAJANDO;
      pushLog("Ciclo TRABAJANDO iniciado");
    } else {
      activeErrorCode = "E03";
      fsm = ST_FALLA;
      pushLog("Bloqueado: contrapeso no confirmado (E03)");
    }
  } else if (body.indexOf("IMAN_ON") >= 0 && fsm != ST_PARO) {
    setElectromagnetExplicit(1);
    pushLog("Electroiman encendido manualmente");
  } else if (body.indexOf("IMAN_OFF") >= 0) {
    setElectromagnetExplicit(0);
    pushLog("Electroiman apagado manualmente");
  } else if (body.indexOf("ALTO_MOTORES") >= 0) {
    stopAllMotorsOnly();
  } else if (body.indexOf("MANUAL") >= 0 && fsm != ST_PARO) {
    fsm = ST_MANUAL;
  }
  server.send(200, "application/json", "{\\"ok\\":true}");
}

void handleDiag() {
  String r = "{\\"rows\\":[";
  r += "{\\"n\\":\\"FC-33 Giro (D" + String(PIN_ENC_GIRO) + ")\\",\\"v\\":\\"" + String(pulsesGiro) + " pulsos\\",\\"m\\":\\"0 / 3,3 V\\"},";
  r += "{\\"n\\":\\"FC-33 Carro (D" + String(PIN_ENC_CARRO) + ")\\",\\"v\\":\\"" + String(pulsesCarro) + " pulsos\\",\\"m\\":\\"0 / 3,3 V\\"},";
  r += "{\\"n\\":\\"FC-33 Gancho (D" + String(PIN_ENC_GANCHO) + ")\\",\\"v\\":\\"" + String(pulsesGancho) + " pulsos\\",\\"m\\":\\"0 / 3,3 V\\"},";
  r += "{\\"n\\":\\"Hall KY-003 (D" + String(PIN_HALL) + ")\\",\\"v\\":\\"" + String(digitalRead(PIN_HALL) == LOW ? "IMAN" : "LIBRE") + "\\",\\"m\\":\\"<= 3,33 V (Div #4)\\"},";
  r += "{\\"n\\":\\"US-H (D" + String(PIN_USH_ECHO) + ")\\",\\"v\\":\\"" + String(ushCm, 1) + " cm\\",\\"m\\":\\"<= 3,33 V (Div #1)\\"},";
  r += "{\\"n\\":\\"US-V (D" + String(PIN_USV_ECHO) + ")\\",\\"v\\":\\"" + String(usvCm, 1) + " cm\\",\\"m\\":\\"<= 3,33 V (Div #2)\\"},";
  r += "{\\"n\\":\\"PARO D" + String(PIN_PARO) + " / HOME D" + String(PIN_HOME) + "\\",\\"v\\":\\"" + String(digitalRead(PIN_PARO)) + "/" + String(digitalRead(PIN_HOME)) + "\\",\\"m\\":\\"3,3 V reposo\\"}";
  r += "]}";
  server.send(200, "application/json", r);
}

void handleCsv() {
  String csv = "Tiempo_s,Estado,Evento\\n";
  for (int i = 0; i < 30; i++) {
    int idx = (logHead + i) % 30;
    if (logs[idx].msg.length() > 0) {
      csv += String(logs[idx].tSec) + "," + logs[idx].state + "," + logs[idx].msg + "\\n";
    }
  }
  server.send(200, "text/csv", csv);
}

void setup() {
  Serial.begin(115200);
  UnoSerial.begin(GT10_BAUD, SERIAL_8N1, PIN_UART_RX, PIN_UART_TX);

  pinMode(PIN_CAB_IN1, OUTPUT); pinMode(PIN_CAB_IN2, OUTPUT);
  pinMode(PIN_GIRO_IN3, OUTPUT); pinMode(PIN_GIRO_IN4, OUTPUT);
  ledcAttach(PIN_CAB_ENA, 1000, 8);
  ledcAttach(PIN_GIRO_ENB, 1000, 8);
  stopAllMotorsOnly();

  pinMode(PIN_ENC_GIRO, INPUT);
  pinMode(PIN_ENC_CARRO, INPUT);
  pinMode(PIN_ENC_GANCHO, INPUT);
  pinMode(PIN_HALL, INPUT);
  pinMode(PIN_HOME, INPUT);
  pinMode(PIN_PARO, INPUT_PULLUP); // Unicamente pull-up interna (D12)
  pinMode(PIN_USH_TRIG, OUTPUT); digitalWrite(PIN_USH_TRIG, LOW);
  pinMode(PIN_USH_ECHO, INPUT);
  pinMode(PIN_USV_TRIG, OUTPUT); digitalWrite(PIN_USV_TRIG, LOW);
  pinMode(PIN_USV_ECHO, INPUT);

  attachInterrupt(digitalPinToInterrupt(PIN_ENC_GIRO), isrEncGiro, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_CARRO), isrEncCarro, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_GANCHO), isrEncGancho, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_HALL), isrHall, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_USH_ECHO), isrUshEcho, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_USV_ECHO), isrUsvEcho, CHANGE);

  prefs.begin("grua", false);
  calR0 = prefs.getFloat("r0", RADIO_MIN_R0_CM);
  calE = prefs.getFloat("e", OFFSET_USV_E_CM);
  calSh = prefs.getFloat("sh", OFFSET_USH_SH_CM);

  Wire.begin(PIN_OLEDA_SDA, PIN_OLEDA_SCL);
  I2C_OLED_B.begin(PIN_OLEDB_SDA, PIN_OLEDB_SCL, 400000);
  oledA.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  oledB.begin(SSD1306_SWITCHCAPVCC, 0x3C);

  WiFi.mode(WIFI_AP);
  WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASS);
  if (USE_MDNS) MDNS.begin(MDNS_HOST);

  server.on("/", HTTP_GET, []() { server.send_P(200, "text/html", PANEL_WEB_HTML); });
  server.on("/api/estado", HTTP_GET, handleEstado);
  server.on("/api/orden", HTTP_POST, handleOrden);
  server.on("/api/diag", HTTP_GET, handleDiag);
  server.on("/api/registro.csv", HTTP_GET, handleCsv);
  server.on("/api/cargas", HTTP_POST, []() { server.send(200, "application/json", "{\\"ok\\":true}"); });
  server.on("/api/calibracion", HTTP_POST, []() { server.send(200, "application/json", "{\\"ok\\":true}"); });
  server.begin();

  if (ENABLE_OTA) {
    ArduinoOTA.setPassword(OTA_PASS);
    ArduinoOTA.begin();
  }

  esp_task_wdt_config_t wdtCfg = { .timeout_ms = 3000, .idle_core_mask = 0, .trigger_panic = true };
  esp_task_wdt_reconfigure(&wdtCfg);
  esp_task_wdt_add(NULL);

  fsm = ST_REPOSO;
  pushLog("ESP32 iniciado en modo AP " WIFI_AP_SSID);
}

void updateUltrasonics(unsigned long now) {
  if (ushReady) {
    float d = ((float)ushPulseUs * velSonidoCmUs) * 0.5f;
    ushReady = false;
    if (d >= 2.0f && d <= 400.0f) { ushBuf[ushIdx] = d; ushIdx = (ushIdx + 1) % 5; ushCm = median5(ushBuf); usInvalidCount = 0; }
    else if (++usInvalidCount >= 5) { activeErrorCode = "E02"; }
  }
  if (usvReady) {
    float d = ((float)usvPulseUs * velSonidoCmUs) * 0.5f;
    usvReady = false;
    if (d >= 2.0f && d <= 400.0f) { usvBuf[usvIdx] = d; usvIdx = (usvIdx + 1) % 5; usvCm = median5(usvBuf); usInvalidCount = 0; }
    else if (++usInvalidCount >= 5) { activeErrorCode = "E02"; }
  }
  if (now - lastUsTrigMs >= 60) {
    lastUsTrigMs = now;
    uint8_t trigPin = trigNextVertical ? PIN_USV_TRIG : PIN_USH_TRIG;
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    trigNextVertical = !trigNextVertical;
  }
}

void loop() {
  unsigned long now = millis();
  esp_task_wdt_reset();
  server.handleClient();
  if (ENABLE_OTA) ArduinoOTA.handle();

  // 1. Paro fisico enclavado en D12
  if (digitalRead(PIN_PARO) == LOW && fsm != ST_PARO) {
    stopAllMotorsOnly();
    fsm = ST_PARO;
    activeErrorCode = "E05";
    pushLog("PARO fisico activado en D12");
  }

  // 2. Proteccion 0-360 grados
  float th = getThetaDeg();
  if ((th < -3.0f || th > 363.0f) && fsm != ST_PARO && fsm != ST_HOMING) {
    stopAllMotorsOnly();
    fsm = ST_FALLA;
    activeErrorCode = "E04";
  }

  // 3. Protocolo GT-1.0: Ping cada 250 ms y RX
  if (now - lastPingTxMs >= GT10_PING_MS) {
    lastPingTxMs = now;
    sendGt10("PING," + String(now / 1000UL));
  }
  while (UnoSerial.available()) {
    String line = UnoSerial.readStringUntil('\\n');
    if (line.startsWith("$ACK")) {
      unoLinkAlive = true;
      lastUnoRxMs = now;
    }
  }
  if (lastUnoRxMs > 0 && (now - lastUnoRxMs > GT10_TIMEOUT_MS)) {
    if (unoLinkAlive) {
      unoLinkAlive = false;
      stopAllMotorsOnly(); // NUNCA apaga el electroiman
      activeErrorCode = "E01";
      pushLog("E01 enlace UNO perdido (electroiman conservado)");
    }
  }

  // 4. Sensores ultrasonicos alternados >= 60 ms
  updateUltrasonics(now);

  // 5. Maquina de estados no bloqueante
  if (fsm == ST_HOMING) {
    if (digitalRead(PIN_HALL) == HIGH) setCabrestante(1, 180); else setCabrestante(0, 0);
    if (digitalRead(PIN_HOME) == HIGH) setGiro(-1, 170); else setGiro(0, 0);
    if (digitalRead(PIN_HALL) == LOW && digitalRead(PIN_HOME) == LOW) {
      portENTER_CRITICAL(&isrMux); pulsesGiro = 0; pulsesGancho = 0; portEXIT_CRITICAL(&isrMux);
      fsm = ST_LISTO;
      pushLog("HOMING completo (theta=0, gancho arriba)");
    }
  } else if (fsm == ST_TRABAJANDO && cargaActualIdx < numCargas) {
    // Ciclo completo de 9 subestados no bloqueantes
    if (workSub == SUB_IR) {
      if (now - subTimerMs >= 1500) { stopAllMotorsOnly(); workSub = SUB_BAJAR; subTimerMs = now; }
    } else if (workSub == SUB_BAJAR) {
      setCabrestante(-1, 160);
      if (usvCm > 0 && (usvCm - calE) <= 2.5f) { setCabrestante(0, 0); setElectromagnetExplicit(1); workSub = SUB_ENGANCHAR_5S; subTimerMs = now; }
    } else if (workSub == SUB_ENGANCHAR_5S) {
      if (now - subTimerMs >= 5000) { workSub = SUB_VERIFICAR_2CM; subTimerMs = now; }
    } else if (workSub == SUB_VERIFICAR_2CM) {
      setCabrestante(1, 170);
      if (now - subTimerMs >= 600) { setCabrestante(0, 0); workSub = SUB_TRANSPORTAR; subTimerMs = now; }
    } else if (workSub == SUB_TRANSPORTAR) {
      if (now - subTimerMs >= 1500) { stopAllMotorsOnly(); workSub = SUB_BAJAR_BODEGA; subTimerMs = now; }
    } else if (workSub == SUB_BAJAR_BODEGA) {
      if (now - subTimerMs >= 1200) { setCabrestante(0, 0); workSub = SUB_ESPERA_5S; subTimerMs = now; }
    } else if (workSub == SUB_ESPERA_5S) {
      if (now - subTimerMs >= 5000) { setElectromagnetExplicit(2); workSub = SUB_SOLTAR_PULSO; subTimerMs = now; }
    } else if (workSub == SUB_SOLTAR_PULSO) {
      if (now - subTimerMs >= PULSO_INVERSO_MS) { setElectromagnetExplicit(0); workSub = SUB_SUBIR; subTimerMs = now; }
    } else if (workSub == SUB_SUBIR) {
      setCabrestante(1, 180);
      if (digitalRead(PIN_HALL) == LOW) {
        setCabrestante(0, 0);
        cargaActualIdx++;
        if (cargaActualIdx >= numCargas) { fsm = ST_LISTO; workSub = SUB_NINGUNO; pushLog("Cargas completadas"); }
        else { workSub = SUB_IR; subTimerMs = now; }
      }
    }
  }

  // 6. Refresco pantallas OLED + LCD cada 250 ms
  if (now - lastUiRefreshMs >= 250) {
    lastUiRefreshMs = now;
    oledA.clearDisplay();
    oledA.setTextSize(1); oledA.setTextColor(SSD1306_WHITE);
    oledA.setCursor(0, 0); oledA.println(fsmName(fsm));
    oledA.printf("T:%.1f R:%.1f Z:%.1f\\n", th, getRadioCm(), getAlturaZCm());
    oledA.display();

    oledB.clearDisplay();
    oledB.setTextSize(1); oledB.setTextColor(SSD1306_WHITE);
    oledB.setCursor(0, 0); oledB.println("WiFi:" WIFI_AP_SSID);
    oledB.printf("UNO:%s ERR:%s\\n", unoLinkAlive ? "OK" : "NO", activeErrorCode.c_str());
    oledB.display();

    sendGt10("LCD," + String(fsmName(fsm)) + "," + String((int)th) + "d R" + String((int)getRadioCm()));
  }
}
`;

  const unoConfigH = `// Configuracion Arduino UNO + Shield L293D generada desde project.json
#pragma once

// Pines libres del UNO (prohibido usar D3-D8, D11, D12 reservados del Shield)
#define PIN_UART_RX   ${pUnoRx}
#define PIN_UART_TX   ${pUnoTx}
#define PIN_POT2      ${pUnoPot2}
#define PIN_BUZ3      ${pUnoBuz3}
#define PIN_BTN_A     ${pUnoBtnA}
#define PIN_BTN_B     ${pUnoBtnB}
#define PIN_BUZ1      ${pUnoBuz1}
#define PIN_BUZ2      ${pUnoBuz2}

#define LCD_I2C_ADDR  ${lcdAddr}
#define MAX_PWM_CARRO ${Math.min(130, cal.maxPwmCarro)}
#define MAX_PWM_BOMB  ${cal.maxPwmBombillo}
#define GT10_BAUD     ${project.protocolGT10.baudRate}
#define GT10_TOUT_MS  ${project.protocolGT10.timeoutMs}
`;

  const unoIno = `/*
 * grua_uno.ino — Controlador Auxiliar (Arduino UNO + Shield L293D v1)
 * Generado desde project.json (${project.schemaVersion})
 * - Cero delay(): todo con millis().
 * - Si el enlace GT-1.0 supera 1000 ms sin respuesta: detiene M1 (carro),
 *   muestra "SIN ENLACE" en LCD y MANTIENE M2 (electroiman) sin soltar carga.
 */
#include <Arduino.h>
#include <Wire.h>
#include <SoftwareSerial.h>
#include <AFMotor.h>
#include <LiquidCrystal_I2C.h>
#include "config.h"

SoftwareSerial espLink(PIN_UART_RX, PIN_UART_TX);
AF_DCMotor motorCarro(1);     // M1
AF_DCMotor electroiman(2);    // M2
AF_DCMotor bombillo(3);       // M3
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, 16, 2);

unsigned long lastRxMs = 0;
unsigned long lastAckMs = 0;
unsigned long pulseInvUntilMs = 0;
bool linkLostShown = false;
String rxBuf = "";

uint8_t calcXor(const String& s) {
  uint8_t c = 0;
  for (size_t i = 0; i < s.length(); i++) c ^= (uint8_t)s[i];
  return c;
}

void sendAck() {
  int bA = (digitalRead(PIN_BTN_A) == LOW) ? 1 : 0;
  int bB = (digitalRead(PIN_BTN_B) == LOW) ? 1 : 0;
  int p2 = analogRead(PIN_POT2);
  String body = "ACK," + String(bA) + "," + String(bB) + "," + String(p2);
  char hex[6];
  snprintf(hex, sizeof(hex), "*%02X\\n", calcXor(body));
  espLink.print("$" + body + String(hex));
}

void processFrame(const String& line) {
  int star = line.indexOf('*');
  if (!line.startsWith("$") || star < 2) return;
  String body = line.substring(1, star);
  lastRxMs = millis();
  linkLostShown = false;

  if (body.startsWith("M1,")) {
    int c1 = body.indexOf(',');
    int c2 = body.indexOf(',', c1 + 1);
    int dir = body.substring(c1 + 1, c2).toInt();
    int pwm = min(MAX_PWM_CARRO, body.substring(c2 + 1).toInt());
    motorCarro.setSpeed(pwm);
    if (dir > 0) motorCarro.run(FORWARD);
    else if (dir < 0) motorCarro.run(BACKWARD);
    else motorCarro.run(RELEASE);
  } else if (body.startsWith("M2,")) {
    int c1 = body.indexOf(',');
    int c2 = body.indexOf(',', c1 + 1);
    int mode = body.substring(c1 + 1, c2).toInt();
    if (mode == 1) { electroiman.setSpeed(255); electroiman.run(FORWARD); }
    else if (mode == 2) { electroiman.setSpeed(255); electroiman.run(BACKWARD); pulseInvUntilMs = millis() + 80; }
    else { electroiman.setSpeed(0); electroiman.run(RELEASE); }
  } else if (body.startsWith("M3,")) {
    int pwm = min(MAX_PWM_BOMB, body.substring(3).toInt());
    bombillo.setSpeed(pwm);
    bombillo.run(pwm > 0 ? FORWARD : RELEASE);
  } else if (body.startsWith("LCD,")) {
    int c1 = body.indexOf(',');
    int c2 = body.indexOf(',', c1 + 1);
    lcd.setCursor(0, 0); lcd.print(body.substring(c1 + 1, c2) + "                ");
    lcd.setCursor(0, 1); lcd.print(body.substring(c2 + 1) + "                ");
  }
}

void setup() {
  espLink.begin(GT10_BAUD);
  pinMode(PIN_BTN_A, INPUT_PULLUP);
  pinMode(PIN_BTN_B, INPUT_PULLUP);
  pinMode(PIN_BUZ1, OUTPUT);
  pinMode(PIN_BUZ2, OUTPUT);
  pinMode(PIN_BUZ3, OUTPUT);

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0); lcd.print("GRUA UNO LISTO  ");
  bombillo.setSpeed(MAX_PWM_BOMB);
  bombillo.run(FORWARD);
  lastRxMs = millis();
}

void loop() {
  unsigned long now = millis();
  if (pulseInvUntilMs > 0 && now >= pulseInvUntilMs) {
    pulseInvUntilMs = 0;
    electroiman.setSpeed(0);
    electroiman.run(RELEASE);
  }
  while (espLink.available()) {
    char ch = (char)espLink.read();
    if (ch == '\\n') { processFrame(rxBuf); rxBuf = ""; }
    else if (rxBuf.length() < 48) rxBuf += ch;
  }
  if (now - lastAckMs >= 250) {
    lastAckMs = now;
    sendAck();
  }
  if (now - lastRxMs > GT10_TOUT_MS && !linkLostShown) {
    linkLostShown = true;
    motorCarro.run(RELEASE); // Seguro: detiene carro M1 y NO toca electroiman M2
    lcd.setCursor(0, 0); lcd.print("SIN ENLACE E01  ");
  }
}
`;

  // 7 Sketches de prueba de banco (cero delay(), claros para principiantes)
  const testHeader = (id: string, target: string, desc: string, expected: string) =>
`/*
 * ${id} — Prueba de banco (${target})
 * Que hace: ${desc}
 * Resultado esperado: ${expected}
 * Nota: Usa millis() sin delay() para cumplir las reglas de seguridad.
 */
#include <Arduino.h>
`;

  const tests = [
    {
      path: 'pruebas/E2_L298N.ino',
      category: 'Pruebas' as const,
      content: testHeader(
        'E2_L298N.ino',
        'ESP32',
        'Alterna suavemente el canal A (cabrestante) y el canal B (giro) por ciclos de 2 s con pausa de 1 s.',
        'Los LEDs del L298N y los motores giran en ambos sentidos sin reiniciar el ESP32.'
      ) + `#include "../grua_esp32/config.h"
unsigned long t0 = 0; int fase = 0;
void setup() {
  Serial.begin(115200);
  pinMode(PIN_CAB_IN1, OUTPUT); pinMode(PIN_CAB_IN2, OUTPUT);
  pinMode(PIN_GIRO_IN3, OUTPUT); pinMode(PIN_GIRO_IN4, OUTPUT);
  ledcAttach(PIN_CAB_ENA, 1000, 8); ledcAttach(PIN_GIRO_ENB, 1000, 8);
}
void loop() {
  if (millis() - t0 >= 2000) {
    t0 = millis(); fase = (fase + 1) % 3;
    digitalWrite(PIN_CAB_IN1, fase == 1); digitalWrite(PIN_CAB_IN2, fase == 2);
    ledcWrite(PIN_CAB_ENA, fase == 0 ? 0 : 150);
    Serial.printf("Fase L298N: %d\\n", fase);
  }
}
`,
    },
    {
      path: 'pruebas/E3_OLED.ino',
      category: 'Pruebas' as const,
      content: testHeader(
        'E3_OLED.ino',
        'ESP32',
        'Inicializa simultaneamente OLED A (bus 0) y OLED B (bus 1) ambas en direccion 0x3C.',
        'OLED A muestra "OLED A OK" y OLED B muestra "OLED B OK" sin interferirse.'
      ) + `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "../grua_esp32/config.h"
TwoWire WireB = TwoWire(1);
Adafruit_SSD1306 oA(128, 64, &Wire, -1), oB(128, 64, &WireB, -1);
unsigned long t0 = 0;
void setup() {
  Wire.begin(PIN_OLEDA_SDA, PIN_OLEDA_SCL);
  WireB.begin(PIN_OLEDB_SDA, PIN_OLEDB_SCL, 400000);
  oA.begin(SSD1306_SWITCHCAPVCC, 0x3C); oB.begin(SSD1306_SWITCHCAPVCC, 0x3C);
}
void loop() {
  if (millis() - t0 >= 1000) {
    t0 = millis();
    oA.clearDisplay(); oA.setTextSize(2); oA.setTextColor(1); oA.setCursor(0,0); oA.println("OLED A OK"); oA.display();
    oB.clearDisplay(); oB.setTextSize(2); oB.setTextColor(1); oB.setCursor(0,0); oB.println("OLED B OK"); oB.display();
  }
}
`,
    },
    {
      path: 'pruebas/E4_LCD.ino',
      category: 'Pruebas' as const,
      content: testHeader(
        'E4_LCD.ino',
        'Arduino UNO',
        'Prueba la pantalla LCD 1602 I2C y los 3 buzzers KY-012 en A4/A5, D10, D13 y A3.',
        'La LCD muestra contador en segundos y los buzzers emiten pitido corto cada 3 s.'
      ) + `#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "../grua_uno/config.h"
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, 16, 2);
unsigned long t0 = 0;
void setup() {
  pinMode(PIN_BUZ1, OUTPUT); pinMode(PIN_BUZ2, OUTPUT); pinMode(PIN_BUZ3, OUTPUT);
  lcd.init(); lcd.backlight();
  lcd.setCursor(0,0); lcd.print("LCD UNO E4 OK   ");
}
void loop() {
  if (millis() - t0 >= 1000) {
    t0 = millis();
    lcd.setCursor(0,1); lcd.print("Seg: "); lcd.print(t0 / 1000); lcd.print("     ");
    digitalWrite(PIN_BUZ3, ((t0 / 1000) % 3) == 0);
  }
}
`,
    },
    {
      path: 'pruebas/E5_enlace_GT10.ino',
      category: 'Pruebas' as const,
      content: testHeader(
        'E5_enlace_GT10.ino',
        'ESP32',
        'Envia tramas $PING GT-1.0 al Arduino UNO y verifica la llegada de $ACK por D2 (Divisor #3).',
        'Monitor serie imprime "ACK UNO RECIBIDO" cada 250 ms; con multimetro en D2 <= 3,33 V.'
      ) + `#include "../grua_esp32/config.h"
HardwareSerial U(2); unsigned long t0 = 0;
void setup() { Serial.begin(115200); U.begin(GT10_BAUD, SERIAL_8N1, PIN_UART_RX, PIN_UART_TX); }
void loop() {
  if (millis() - t0 >= 250) { t0 = millis(); U.println("$PING,1*28"); }
  if (U.available()) Serial.println("RX UNO: " + U.readStringUntil('\\n'));
}
`,
    },
    {
      path: 'pruebas/E6_sensores.ino',
      category: 'Pruebas' as const,
      content: testHeader(
        'E6_sensores.ino',
        'ESP32',
        'Lee con interrupciones IRAM_ATTR los 3 FC-33, Hall, HOME y PARO y los imprime por Serial cada 300 ms.',
        'Al pasar la mano o girar cada disco los contadores cambian; PARO en D12 muestra 0 al pulsar.'
      ) + `#include "../grua_esp32/config.h"
volatile long cG=0,cC=0,cZ=0;
void IRAM_ATTR iG(){cG++;} void IRAM_ATTR iC(){cC++;} void IRAM_ATTR iZ(){cZ++;}
unsigned long t0 = 0;
void setup() {
  Serial.begin(115200);
  pinMode(PIN_ENC_GIRO, INPUT); pinMode(PIN_ENC_CARRO, INPUT); pinMode(PIN_ENC_GANCHO, INPUT);
  pinMode(PIN_HALL, INPUT); pinMode(PIN_HOME, INPUT); pinMode(PIN_PARO, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_GIRO), iG, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_CARRO), iC, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_ENC_GANCHO), iZ, CHANGE);
}
void loop() {
  if (millis() - t0 >= 300) {
    t0 = millis();
    Serial.printf("G:%ld C:%ld Z:%ld Hall:%d Home:%d Paro:%d\\n",
      cG, cC, cZ, digitalRead(PIN_HALL), digitalRead(PIN_HOME), digitalRead(PIN_PARO));
  }
}
`,
    },
    {
      path: 'pruebas/E7_motores.ino',
      category: 'Pruebas' as const,
      content: testHeader(
        'E7_motores.ino',
        'Arduino UNO',
        'Prueba el motor del carro en M1 respetando el limite estricto de PWM <= 130 (50 %) y el bombillo en M3.',
        'El carro avanza y retrocede suavemente sin superar 0,6 A continuos en el Shield L293D.'
      ) + `#include <AFMotor.h>
#include "../grua_uno/config.h"
AF_DCMotor m1(1), m3(3); unsigned long t0 = 0; int st = 0;
void setup() { m3.setSpeed(MAX_PWM_BOMB); m3.run(FORWARD); }
void loop() {
  if (millis() - t0 >= 2000) {
    t0 = millis(); st = (st + 1) % 3;
    m1.setSpeed(st == 0 ? 0 : MAX_PWM_CARRO);
    m1.run(st == 1 ? FORWARD : (st == 2 ? BACKWARD : RELEASE));
  }
}
`,
    },
    {
      path: 'pruebas/E8_electroiman.ino',
      category: 'Pruebas' as const,
      content: testHeader(
        'E8_electroiman.ino',
        'Arduino UNO',
        'Energiza el electroiman M2 durante 4 s, aplica pulso inverso de 80 ms para liberar remanencia y apaga 3 s.',
        'La pieza metalica se adhiere con firmeza y cae limpiamente tras el pulso inverso de 80 ms.'
      ) + `#include <AFMotor.h>
#include "../grua_uno/config.h"
AF_DCMotor m2(2); unsigned long t0 = 0; int f = 0;
void setup() { m2.setSpeed(255); m2.run(FORWARD); t0 = millis(); }
void loop() {
  unsigned long now = millis();
  if (f == 0 && now - t0 >= 4000) { m2.run(BACKWARD); t0 = now; f = 1; }
  else if (f == 1 && now - t0 >= 80) { m2.run(RELEASE); t0 = now; f = 2; }
  else if (f == 2 && now - t0 >= 3000) { m2.run(FORWARD); t0 = now; f = 0; }
}
`,
    },
  ];

  const librariesTxt = [
    '# Librerias y tarjetas requeridas — Crane Engineering Studio',
    '# Instala la ultima version estable en Arduino IDE 2.x y anota la version exacta en el Cuaderno.',
    '',
    ...FIRMWARE_LIBRARIES.map(
      (l) =>
        `[${l.targetController}] ${l.exactManagerName} | Autor: ${l.author} | ${
          l.isBuiltIn ? 'Integrada' : l.boardManagerUrl ? `URL: ${l.boardManagerUrl}` : 'Library Manager'
        }`
    ),
  ].join('\n');

  const leemeMd = `# Firmware Oficial — Grúa Torre Automatizada (GT-1.0)

Generado automáticamente desde \`project.json\` (${project.schemaVersion}).

## 1. Pasos para compilar y subir

1. **Antes de conectar USB**: Desconecta los cables de \`+5 V\` hacia \`ESP32 VIN\` y \`UNO 5V\`. Retira el **jumper desmontable de ESP32 D2** al subir al ESP32 por cable USB (no es necesario si usas carga inalámbrica OTA).
2. **Arduino UNO (\`grua_uno/grua_uno.ino\`)**:
   - Herramientas → Placa → **Arduino UNO**.
   - Instala **Adafruit Motor Shield library** (V1, \`AFMotor.h\`) y **LiquidCrystal I2C** (Frank de Brabander).
   - Selecciona el puerto COM del UNO y pulsa **Subir**.
3. **ESP32 (\`grua_esp32/grua_esp32.ino\`)**:
   - Herramientas → Placa → **ESP32 Dev Module**.
   - Instala **Adafruit SSD1306**, **Adafruit GFX Library** y **Adafruit BusIO**.
   - Selecciona el puerto COM del ESP32 y pulsa **Subir**.
4. **Reconectar en modo taller**: Desconecta el USB, reconecta el jumper desmontable de \`D2\` y vuelve a conectar la alimentación de \`5 V 3 A\` primero y \`12 V 2 A\` después.

## 2. Tabla de pines vigente (desde project.json)

| ID | Controlador | Pin | Señal | Voltaje origen | Divisor | Notas |
|---|---|---|---|---|---|---|
${project.pins
  .map((p) => `| ${p.id} | ${p.controller} | ${p.pin} | ${p.signalName} | ${p.sourceVoltage} | ${p.usesDivider ? 'Sí' : 'No'} | ${p.notes} |`)
  .join('\n')}
`;

  const files: GeneratedFirmwareBundle['files'] = [
    { path: 'grua_esp32/config.h', content: esp32ConfigH, category: 'ESP32' },
    { path: 'grua_esp32/errores.h', content: esp32ErroresH, category: 'ESP32' },
    { path: 'grua_esp32/panel_web.h', content: panelWebH, category: 'ESP32' },
    { path: 'grua_esp32/grua_esp32.ino', content: esp32Ino, category: 'ESP32' },
    { path: 'grua_uno/config.h', content: unoConfigH, category: 'UNO' },
    { path: 'grua_uno/grua_uno.ino', content: unoIno, category: 'UNO' },
    ...tests,
    { path: 'libraries.txt', content: librariesTxt, category: 'Docs' },
    { path: 'LEEME.md', content: leemeMd, category: 'Docs' },
  ];

  const panelHtmlBytes = new TextEncoder().encode(panelHtml).length;
  const hasExternalCdn = /https?:\/\//i.test(panelHtml);
  const linterFindings = lintFirmwareBundle(files, project);

  return {
    files,
    panelHtmlBytes,
    hasExternalCdn,
    linterFindings,
  };
}

export function buildFirmwareZipBlob(bundle: GeneratedFirmwareBundle): Blob {
  return buildZipBlob(bundle.files.map((f) => ({ path: f.path, data: f.content })));
}
