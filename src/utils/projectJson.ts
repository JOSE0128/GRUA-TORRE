import { ZONES } from '../data/craneData';
import {
  CraneComponent,
  CraneProjectJson,
  ErrorCodeSpec,
  LibrarySpec,
  PinAssignment,
  ProjectChangeEvent,
  ProtocolFrameSpec,
  UserEditableParams,
} from '../types/crane';

export const ERROR_CODES_SPEC: ErrorCodeSpec[] = [
  {
    code: 'E01',
    title: 'Enlace serial GT-1.0 perdido con Arduino UNO',
    triggerCondition: 'Han pasado más de 1000 ms sin recibir $ACK ni $PING válido en UART (ESP32 D2 / UNO A1).',
    safeAction: 'Detiene los 3 motores inmediatamente. MANTIENE el electroimán en su estado actual para no dejar caer una carga suspendida.',
    operatorAction: 'Revisa el jumper desmontable de D2, la masa común R1 y los cables del Divisor #3 (columnas 29–38 en P2); luego pulsa Rearmar.',
  },
  {
    code: 'E02',
    title: 'Lectura inválida de ultrasonido (US-H o US-V)',
    triggerCondition: 'Cinco lecturas seguidas fuera del rango físico 2–400 cm o timeout de eco repetido.',
    safeAction: 'Detiene movimiento automático de carro/izaje para evitar colisiones ciegas; mantiene el electroimán intacto.',
    operatorAction: 'Verifica alimentación +5 V (R2), divisor de tensión en ECHO (3,33 V máx.) y que no haya cables flojos en la manguera.',
  },
  {
    code: 'E03',
    title: 'Contrapeso no confirmado o sobrecarga de momento',
    triggerCondition: 'Intento de iniciar modo TRABAJANDO sin confirmar la masa mínima de contrapeso m_cp = 1,1 × max(m_i·r_i) / d_cp.',
    safeAction: 'Bloquea el arranque automático en estado REPOSO o LISTO; no energiza motores.',
    operatorAction: 'Coloca el contrapeso físico en la contrapluma Z4, mide la masa requerida y confírmalo en el panel de la tablet.',
  },
  {
    code: 'E04',
    title: 'Límite mecánico de giro (0–360°) o tope inesperado',
    triggerCondition: 'Intento de superar θ < 0° o θ > 360°, o activación inesperada de HOME / Hall fuera de secuencia.',
    safeAction: 'Detiene de inmediato giro y carro; evita enrollar o romper la manguera de 22 hilos del mástil.',
    operatorAction: 'Ejecuta una secuencia HOMING controlada desde la tablet para restablecer θ = 0° y verificar el rizo del mástil.',
  },
  {
    code: 'E05',
    title: 'Paro de emergencia activado (PARO enclavado)',
    triggerCondition: 'Pulsador físico PARO (ESP32 D12 → GND) presionado o botón rojo PARO en la tablet.',
    safeAction: 'Detiene todos los motores (cabrestante, giro, carro) y enclava el sistema en estado PARO. El electroimán conserva su estado hasta orden explícita.',
    operatorAction: 'Despeja la zona, libera el pulsador físico y confirma manualmente «Rearmar» en la tablet para pasar a REPOSO.',
  },
  {
    code: 'E06',
    title: 'Encoder sin pulsos o tiempo máximo agotado',
    triggerCondition: 'Un motor estuvo energizado más de 2500 ms sin registrar pulsos en su FC-33 (D34, D35 o D32) o superó el tiempo límite del paso.',
    safeAction: 'Detiene el motor afectado para evitar atascos mecánicos o sobrecalentamiento del puente H.',
    operatorAction: 'Revisa el disco ranurado en el FC-33, comprueba 3,3 V en R3 y observa la pestaña Diagnóstico en la tablet.',
  },
  {
    code: 'E07',
    title: 'Pérdida de carga detectada durante el transporte',
    triggerCondition: 'El sensor US-V detecta caída súbita o diferencia Δh fuera de ventana mientras transporta hacia la bodega Z7.',
    safeAction: 'Detiene traslación y emite alarma sonora continua en Buzzer 2 (UNO D13).',
    operatorAction: 'Inspecciona la superficie metálica de la carga y verifica la tensión de 12 V en bornes M2 del Shield L293D.',
  },
];

export const FIRMWARE_LIBRARIES: LibrarySpec[] = [
  {
    id: 'core-esp32',
    name: 'Placa ESP32 (espressif/arduino-esp32)',
    exactManagerName: 'esp32 by Espressif Systems',
    author: 'Espressif Systems',
    targetController: 'ESP32',
    targetFile: 'Gestor de placas (Boards Manager)',
    purpose: 'Compila el firmware WiFi AP, WebServer, LEDC PWM e interrupciones IRAM_ATTR para ESP32 DevKit 30 pines.',
    isBuiltIn: false,
    boardManagerUrl: 'https://espressif.github.io/arduino-esp32/package_esp32_index.json',
    commonError: 'A fatal error occurred: Failed to connect to ESP32: Timed out waiting for packet header.',
    commonErrorFix: 'Desconecta el cable del pin D2 (jumper desmontable), desconecta R2 de VIN antes de usar USB y mantén pulsado BOOT mientras inicia la carga.',
    notes: 'Instala la última versión estable y anótala en el Cuaderno de ingeniería.',
  },
  {
    id: 'core-bluepad32',
    name: 'Placa Bluepad32 (Opcional si usas mando Bluetooth HID)',
    exactManagerName: 'esp32-bluepad32',
    author: 'Ricardo Quesada',
    targetController: 'ESP32',
    targetFile: 'Gestor de placas (URL adicional)',
    purpose: 'Permite emparejar mandos Bluetooth estándar (PS4, Xbox, Switch, genéricos) directamente con el ESP32 en modo MANUAL.',
    isBuiltIn: false,
    boardManagerUrl: 'https://raw.githubusercontent.com/ricardoquesada/esp32-arduino-lib-builder/master/bluepad32_files/package_esp32_bluepad32_index.json',
    commonError: 'Bluepad32.h: No such file or directory al compilar con el núcleo Espressif estándar.',
    commonErrorFix: 'En Herramientas → Placa selecciona la variante Bluepad32 o desactiva USE_BLUEPAD32 en config.h si pruebas solo con la tablet.',
    notes: 'POR VERIFICAR en la documentación oficial de Bluepad32 qué versión exacta empareja con tu núcleo ESP32 instalado.',
  },
  {
    id: 'lib-ssd1306',
    name: 'Adafruit SSD1306',
    exactManagerName: 'Adafruit SSD1306',
    author: 'Adafruit',
    targetController: 'ESP32',
    targetFile: 'grua_esp32/grua_esp32.ino',
    purpose: 'Dibuja texto y barras en las dos pantallas OLED 0,96" (I2C 0x3C en buses D21/D22 y D16/D17).',
    isBuiltIn: false,
    commonError: 'OLED B en blanco o congelada por usar el mismo bus Wire sin segunda instancia TwoWire(1).',
    commonErrorFix: 'Pasa &Wire a OLED_A y &Wire1 a OLED_B en el constructor de Adafruit_SSD1306.',
  },
  {
    id: 'lib-gfx',
    name: 'Adafruit GFX Library',
    exactManagerName: 'Adafruit GFX Library',
    author: 'Adafruit',
    targetController: 'ESP32',
    targetFile: 'Dependencia de Adafruit SSD1306',
    purpose: 'Provee fuentes tipográficas, líneas y gráficos básicos para las pantallas OLED.',
    isBuiltIn: false,
    commonError: 'Adafruit_GFX.h: No such file or directory.',
    commonErrorFix: 'Cuando el Gestor de librerías pregunte "Install all dependencies", acepta instalar Adafruit GFX y Adafruit BusIO.',
  },
  {
    id: 'lib-busio',
    name: 'Adafruit BusIO',
    exactManagerName: 'Adafruit BusIO',
    author: 'Adafruit',
    targetController: 'ESP32',
    targetFile: 'Dependencia de Adafruit GFX / SSD1306',
    purpose: 'Gestiona transacciones I2C de bajo nivel de forma estable.',
    isBuiltIn: false,
    commonError: 'Adafruit_I2CDevice.h: No such file or directory.',
    commonErrorFix: 'Instala «Adafruit BusIO» desde el Gestor de librerías de Arduino IDE 2.x.',
  },
  {
    id: 'lib-afmotor',
    name: 'Adafruit Motor Shield library (V1)',
    exactManagerName: 'Adafruit Motor Shield library',
    author: 'Adafruit',
    targetController: 'Arduino UNO',
    targetFile: 'grua_uno/grua_uno.ino',
    purpose: 'Controla el Shield L293D DK Electronics v1.0 (puertos M1 carro, M2 electroimán, M3 bombillo). IMPORTANTE: debe ser la V1 (AFMotor.h), NO la V2.',
    isBuiltIn: false,
    commonError: 'Error compilando AFMotor.h o motores no giran por instalar "Adafruit Motor Shield V2 Library".',
    commonErrorFix: 'Desinstala la V2 y busca exactamente «Adafruit Motor Shield library» (sin V2) que incluye AFMotor.h.',
  },
  {
    id: 'lib-lcd-i2c',
    name: 'LiquidCrystal I2C',
    exactManagerName: 'LiquidCrystal I2C',
    author: 'Frank de Brabander',
    targetController: 'Arduino UNO',
    targetFile: 'grua_uno/grua_uno.ino',
    purpose: 'Escribe dos filas de 16 caracteres en la LCD 1602 I2C conectada a A4/A5 del Arduino UNO.',
    isBuiltIn: false,
    commonError: 'La pantalla enciende retroiluminación azul pero no muestra letras o sale error de argumentos.',
    commonErrorFix: 'Ajusta el potenciómetro azul trasero de contraste y confirma si la dirección I2C es 0x27 o 0x3F con el sketch de escáner I2C.',
  },
  {
    id: 'lib-builtin-esp32',
    name: 'Librerías integradas ESP32 (WiFi, WebServer, ESPmDNS, Preferences, Wire, ArduinoOTA, esp_task_wdt)',
    exactManagerName: 'Incluidas en el núcleo ESP32 (no instalar aparte)',
    author: 'Espressif Systems',
    targetController: 'ESP32',
    targetFile: 'grua_esp32/grua_esp32.ino',
    purpose: 'Crean la red WiFi de la grúa, sirven el panel web, guardan calibración en memoria NVS y habilitan el perro guardián.',
    isBuiltIn: true,
    commonError: 'WebServer.h not found al tener seleccionada una placa Arduino AVR en lugar de ESP32 Dev Module.',
    commonErrorFix: 'Cambia la placa activa en Herramientas → Placa → ESP32 Arduino → ESP32 Dev Module.',
  },
  {
    id: 'lib-builtin-uno',
    name: 'Librerías integradas Arduino AVR (SoftwareSerial, Wire)',
    exactManagerName: 'Incluidas en Arduino IDE (no instalar aparte)',
    author: 'Arduino',
    targetController: 'Arduino UNO',
    targetFile: 'grua_uno/grua_uno.ino',
    purpose: 'Permiten hablar por UART GT-1.0 en A0/A1 (9600 baudios) y controlar el bus I2C A4/A5.',
    isBuiltIn: true,
    commonError: 'Al subir al UNO falla porque dejaste seleccionada la placa ESP32 Dev Module.',
    commonErrorFix: 'Antes de compilar grua_uno.ino, cambia en Herramientas → Placa → Arduino AVR Boards → Arduino UNO.',
  },
];

export const GT10_PROTOCOL_SPEC: ProtocolFrameSpec = {
  name: 'Protocolo Serial GT-1.0',
  baudRate: 9600,
  serialFormat: '8N1 ASCII con salto de línea (\\n)',
  framePattern: '$CAMPO,V1,V2,...*HH\\n',
  maxFrameChars: 48,
  checksumRule: 'XOR byte a byte entre el carácter siguiente a "$" y el carácter anterior a "*", expresado en 2 dígitos hexadecimales.',
  pingIntervalMs: 250,
  timeoutMs: 1000,
  frames: [
    { prefix: '$PING', direction: 'ESP32 -> UNO', fields: 'millis_s', example: '$PING,124*4A\\n', purpose: 'Latido cada 250 ms para supervisar que el enlace sigue vivo.' },
    { prefix: '$M1', direction: 'ESP32 -> UNO', fields: 'dir(-1/0/1),pwm(0..130)', example: '$M1,1,120*2E\\n', purpose: 'Mueve el carro en el canal M1 del shield (tope PWM 130 ≈ 50 %).' },
    { prefix: '$M2', direction: 'ESP32 -> UNO', fields: 'modo(0=OFF,1=ON,2=INV)', example: '$M2,1,255*19\\n', purpose: 'Control explícito del electroimán (nunca cambia por pérdida de enlace).' },
    { prefix: '$M3', direction: 'ESP32 -> UNO', fields: 'pwm(0..110)', example: '$M3,102*3B\\n', purpose: 'Regula el bombillo de corona en M3 (~40 % PWM).' },
    { prefix: '$LCD', direction: 'ESP32 -> UNO', fields: 'l1(<=16),l2(<=16)', example: '$LCD,LISTO T:045,R:24 Z:12*5C\\n', purpose: 'Actualiza los textos de la LCD 1602 en la tapa.' },
    { prefix: '$BUZ', direction: 'ESP32 -> UNO', fields: 'id(1..3),patron', example: '$BUZ,3,1*21\\n', purpose: 'Activa uno de los 3 buzzers KY-012 (movimiento, alarma, confirmación).' },
    { prefix: '$ACK', direction: 'UNO -> ESP32', fields: 'btnA,btnB,pot2', example: '$ACK,0,0,512*63\\n', purpose: 'Confirma recepción, estado de botones A/B y lectura de Potenciómetro 2.' },
    { prefix: '$ERR', direction: 'UNO -> ESP32', fields: 'codigo', example: '$ERR,E01*1D\\n', purpose: 'Notifica fallo detectado en el controlador auxiliar.' },
  ],
};

export function computeSpeedOfSoundCmPerUs(tempC: number): number {
  const mPerS = 331.3 + 0.606 * tempC;
  return Number((mPerS / 10000).toFixed(6));
}

export function buildProjectJson(
  params: UserEditableParams,
  pinAssignments: PinAssignment[],
  components: CraneComponent[]
): CraneProjectJson {
  const speedCmUs = computeSpeedOfSoundCmPerUs(params.ambientTempC);
  const wifiPassword = params.wifiPassword ?? '';
  const wifiPasswordStatus = wifiPassword.length >= 8 ? 'CONFIRMADO' : 'POR CONFIRMAR';

  const getPin = (id: string, fallback: string) =>
    pinAssignments.find((p) => p.id === id)?.pin ?? fallback;

  return {
    schemaVersion: '2.0.0',
    app: 'Crane Engineering Studio',
    generatedAt: new Date().toISOString(),
    architecture: {
      controllers: ['ESP32 DevKit V1 (30 pines)', 'Arduino UNO R3 + Shield L293D DK Electronics v1.0'],
      maxSimultaneousMotors: 2,
      logicRailVolts: 5,
      powerRailVolts: 12,
      maxPowerSupplyAmps: 2.0,
      usVOffsetAboveMagnetCm: 3.5,
      usVLateralOffsetCm: 2.5,
      electromagnetFailsafeRule: 'El electroimán SOLO se apaga por orden explícita, paro manual de operador o final de descarga; JAMÁS por pérdida de enlace o timeout.',
    },
    network: {
      wifiSsid: (params.wifiSsid || 'GRUA').trim() || 'GRUA',
      wifiPassword,
      wifiPasswordStatus,
      apIp: '192.168.4.1',
      useMdns: params.useMdns ?? true,
      mdnsHost: (params.mdnsHost || 'grua').trim() || 'grua',
      operatorPinEnabled: params.operatorPinEnabled ?? false,
      operatorPin: (params.operatorPin || '1234').slice(0, 4),
      otaEnabled: params.otaEnabled ?? true,
      otaHostname: 'grua-esp32',
      otaPassword: params.otaPassword || 'grua_ota',
    },
    calibration: {
      slotsGiroN: params.slotsGiroN,
      slotsCarroN: params.slotsCarroN,
      slotsGanchoN: params.slotsGanchoN,
      drumDiameterCarroCm: params.drumDiameterCarroCm,
      drumDiameterGanchoCm: params.drumDiameterGanchoCm,
      gearOptionGiro: params.gearOptionGiro,
      gearRatioGiroI: params.gearRatioGiroI,
      usHOffsetShCm: params.usHOffsetShCm ?? null,
      usVOffsetECm: 3.5,
      r0MinCm: params.r0MinCm,
      rMaxUsefulCm: params.rMaxUsefulCm,
      boomLengthCm: params.boomLengthCm,
      mastHeightCm: params.mastHeightCm,
      hookBlockHeightCm: params.hookBlockHeightCm,
      hallMarginCm: params.hallMarginCm,
      ambientTempC: params.ambientTempC,
      speedOfSoundCmPerUs: speedCmUs,
      counterweightDistDcpCm: params.counterweightDistDcpCm,
      counterweightPlaced: params.counterweightPlaced,
      warehouseRadiusCm: params.warehouseRadiusCm,
      warehouseAngleDeg: params.warehouseAngleDeg ?? null,
      maxPwmGiro: params.maxPwmGiro ?? 210,
      maxPwmCabrestante: params.maxPwmCabrestante ?? 220,
      maxPwmCarro: Math.min(130, params.maxPwmCarro ?? 130),
      maxPwmBombillo: params.maxPwmBombillo ?? 110,
      lcdI2cAddress: params.lcdI2cAddress,
    },
    zones: ZONES,
    components: components.map((c) => ({
      id: c.id,
      shortCode: c.shortCode,
      name: c.name,
      zone: c.zone,
      availableQty: c.availableQty,
      usedQty: c.usedQty,
      status: c.status,
      operatingVoltage: c.operatingVoltage,
      dimensionsMm: c.dimensionsMm,
      unitCostCop: params.bomUnitCostsCop?.[c.id] ?? 0,
    })),
    pins: pinAssignments,
    loads: params.activeLoads,
    libraries: FIRMWARE_LIBRARIES.map((lib) => ({
      id: lib.id,
      name: lib.exactManagerName,
      author: lib.author,
      targetController: lib.targetController,
      installedVersion: params.libraryVersions?.[lib.id] || 'POR CONFIRMAR (anotar versión instalada)',
    })),
    protocolGT10: GT10_PROTOCOL_SPEC,
    screens: {
      lcd1602: {
        lines: 2,
        cols: 16,
        line1Template: 'EST:{ESTADO} T:{THETA}',
        line2Template: 'R:{RADIO} Z:{ALTURA}',
      },
      oledA: {
        tabs: ['1. Posición (θ, r, z)', '2. Sensores (US-H, US-V, Hall)', '3. Carga y Contrapeso'],
        busPins: getPin('PA18', 'D21/D22'),
        i2cAddress: '0x3C',
      },
      oledB: {
        tabs: ['1. Red WiFi / Mando / Enlace UNO', '2. Cola de cargas y Errores E01-E07'],
        busPins: getPin('PA19', 'D16/D17'),
        i2cAddress: '0x3C',
      },
    },
    errorCodes: ERROR_CODES_SPEC,
  };
}

export function computeProjectJsonDiff(
  prev: CraneProjectJson,
  next: CraneProjectJson
): ProjectChangeEvent | null {
  const details: string[] = [];
  const affected = new Set<ProjectChangeEvent['affectedModules'][number]>();

  // 1. Pines
  const prevPinMap = new Map(prev.pins.map((p) => [p.id, p]));
  for (const np of next.pins) {
    const pp = prevPinMap.get(np.id);
    if (!pp) continue;
    if (pp.pin !== np.pin || pp.usesDivider !== np.usesDivider || pp.hasExternalResistor !== np.hasExternalResistor) {
      details.push(
        `Pin ${np.componentLabel} (${np.controller}): ${pp.pin} → ${np.pin}` +
          (pp.usesDivider !== np.usesDivider ? ` (Divisor: ${np.usesDivider ? 'Sí' : 'No'})` : '')
      );
      affected.add('Láminas');
      affected.add('Guía');
      affected.add('Informe');
      affected.add('Código');
      affected.add('Asesor');
      affected.add('Validador');
    }
  }

  // 2. Calibración
  const calKeys: [keyof CraneProjectJson['calibration'], string][] = [
    ['slotsGiroN', 'Ranuras N giro'],
    ['slotsCarroN', 'Ranuras N carro'],
    ['slotsGanchoN', 'Ranuras N gancho'],
    ['drumDiameterCarroCm', 'Diámetro tambor carro'],
    ['drumDiameterGanchoCm', 'Diámetro tambor gancho'],
    ['gearRatioGiroI', 'Relación giro i'],
    ['usHOffsetShCm', 'Offset s_H (US-H)'],
    ['r0MinCm', 'Radio mínimo r₀'],
    ['rMaxUsefulCm', 'Radio máximo útil'],
    ['boomLengthCm', 'Longitud de pluma'],
    ['mastHeightCm', 'Altura del mástil'],
    ['ambientTempC', 'Temperatura ambiente'],
    ['counterweightDistDcpCm', 'Distancia contrapeso d_cp'],
    ['warehouseRadiusCm', 'Radio de bodega'],
    ['warehouseAngleDeg', 'Ángulo de bodega'],
    ['lcdI2cAddress', 'Dirección I2C LCD'],
  ];
  for (const [k, label] of calKeys) {
    if (prev.calibration[k] !== next.calibration[k]) {
      details.push(`${label}: ${String(prev.calibration[k] ?? 'POR CONFIRMAR')} → ${String(next.calibration[k] ?? 'POR CONFIRMAR')}`);
      affected.add('Informe');
      affected.add('Código');
      affected.add('Asesor');
      affected.add('Validador');
    }
  }

  // 3. Red WiFi / OTA / PIN
  if (
    prev.network.wifiSsid !== next.network.wifiSsid ||
    prev.network.wifiPassword !== next.network.wifiPassword ||
    prev.network.operatorPinEnabled !== next.network.operatorPinEnabled ||
    prev.network.otaEnabled !== next.network.otaEnabled
  ) {
    details.push(`Red WiFi/Seguridad actualizada (SSID: ${next.network.wifiSsid}, OTA: ${next.network.otaEnabled ? 'Sí' : 'No'})`);
    affected.add('Código');
    affected.add('Asesor');
  }

  // 4. Cargas
  if (JSON.stringify(prev.loads) !== JSON.stringify(next.loads)) {
    details.push(`Lista de cargas actualizada (${next.loads.length} carga(s))`);
    affected.add('Informe');
    affected.add('Código');
    affected.add('Asesor');
  }

  // 5. Componentes
  if (JSON.stringify(prev.components) !== JSON.stringify(next.components)) {
    details.push('Inventario o costos de componentes actualizados');
    affected.add('Validador');
    affected.add('Informe');
    affected.add('Asesor');
  }

  if (details.length === 0) return null;

  return {
    id: `CHG-${Date.now()}`,
    timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    summary: `Se actualizó project.json (${details.length} cambio${details.length > 1 ? 's' : ''})`,
    details: details.slice(0, 5),
    affectedModules: Array.from(affected),
  };
}

export function buildProjectDocumentationMarkdown(projectJson: CraneProjectJson): string {
  const c = projectJson.calibration;
  const n = projectJson.network;
  const maxMoment = projectJson.loads.length > 0 ? Math.max(...projectJson.loads.map((l) => l.massG * l.rCm)) : 0;
  const mcpText =
    c.counterweightDistDcpCm && maxMoment > 0
      ? `${((1.1 * maxMoment) / c.counterweightDistDcpCm).toFixed(1)} g`
      : 'POR CONFIRMAR (definir d_cp y cargas)';

  return [
    '# Documentación Técnica Completa — Grúa Torre Automatizada',
    '',
    `Generado automáticamente desde \`project.json\` (esquema ${projectJson.schemaVersion}).`,
    '',
    '## 1. Manual de Operación (Uso con Tablet y Mando)',
    '',
    '1. **Encendido seguro**: Verifica que todos los cables estén firmes y las cargas dentro del radio útil. Enciende primero la fuente lógica de **5 V 3 A** y luego el interruptor de potencia de **12 V 2 A**.',
    `2. **Conexión WiFi de la tablet**: Abre Ajustes → WiFi en la tablet, conéctate a la red **${n.wifiSsid}** (la clave debe tener mínimo 8 caracteres; mientras estés conectado a esta red la tablet no tendrá internet).`,
    `3. **Apertura del panel embebido**: En el navegador de la tablet escribe **http://${n.apIp}**${n.useMdns ? ` o **http://${n.mdnsHost}.local**` : ''}.`,
    '4. **Secuencia obligatoria de arranque**: Pulsa **HOME** para llevar la pluma al pulsador cero (θ = 0°) y subir el gancho hasta que el sensor magnético Hall confirme la posición superior segura.',
    `5. **Confirmación del contrapeso**: Antes de pulsar **TRABAJAR**, confirma en la ventana de seguridad que colocaste al menos **${mcpText}** en la contrapluma (Z4).`,
    '6. **Paro de emergencia (PARO)**: Ante cualquier anomalía pulsa el botón físico rojo en la caja Z1 o el botón **PARO** permanente de la tablet. Los motores se detienen de inmediato y el electroimán conserva su estado para no soltar cargas en el aire.',
    '',
    '## 2. Manual de Mantenimiento Preventivo',
    '',
    '- **Antes de cada sesión**: Inspecciona visualmente el rizo de la manguera de 22 hilos en la salida superior del mástil Z2 para confirmar que gira libremente entre 0° y 360° sin tensión.',
    '- **Divisores de tensión (3,33 V)**: Con el multímetro en escala DC 20 V, verifica que ECHO US-H, ECHO US-V, UNO A1 y Hall KY-003 S no superen 3,40 V en la entrada del ESP32.',
    '- **Limpieza óptica**: Mantén libres de polvo las ranuras de los tres sensores FC-33 y la placa reflectora plana del carro (blanco acústico del US-H).',
    '- **Drivers y temperatura**: Comprueba que los disipadores del L298N y los chips L293D del shield no superen una temperatura incómoda al tacto; recuerda que el carro (M1) está limitado a PWM ≤ 50 %.',
    `- **Parámetros activos de calibración**: Temp = ${c.ambientTempC} °C (v_sonido = ${c.speedOfSoundCmPerUs} cm/µs), offset US-V e = ${c.usVOffsetECm} cm, offset US-H s_H = ${c.usHOffsetShCm ?? 'POR CONFIRMAR'} cm, bodega r = ${c.warehouseRadiusCm} cm / θ = ${c.warehouseAngleDeg ?? 'POR CONFIRMAR'}°.`,
    '',
    '## 3. Tabla de Códigos de Error (E01–E07)',
    '',
    '| Código | Título | Condición de disparo | Acción segura automática | Qué debe hacer el operador |',
    '|---|---|---|---|---|',
    ...projectJson.errorCodes.map(
      (e) => `| **${e.code}** | ${e.title} | ${e.triggerCondition} | ${e.safeAction} | ${e.operatorAction} |`
    ),
    '',
  ].join('\n');
}
