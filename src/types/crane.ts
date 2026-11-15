export type DataStatus =
  | 'CONFIRMADO'
  | 'POR CONFIRMAR'
  | 'PROPUESTO'
  | 'POR COMPRAR'
  | 'NO USADO'
  | 'POR DEFINIR';

export type ZoneId =
  | 'Z1'
  | 'Z2'
  | 'Z3'
  | 'Z4'
  | 'Z5'
  | 'Z6'
  | 'Z7'
  | 'Z8'
  | 'EXTERNO'
  | 'RESERVA';

export type ComponentCategory =
  | 'Controladores'
  | 'Drivers y Potencia'
  | 'Motores y Actuadores'
  | 'Sensores'
  | 'Pantallas e Interfaz'
  | 'Fuentes y Protección'
  | 'Cableado y Protoboards';

export interface PinSpec {
  name: string;
  voltage: string;
  direction: 'ENTRADA' | 'SALIDA' | 'ALIMENTACIÓN' | 'GND' | 'BIDIRECCIONAL';
  connectedTo: string;
  wireColor: string;
  notes?: string;
}

export interface CraneComponent {
  id: string;
  name: string;
  shortCode: string;
  category: ComponentCategory;
  status: DataStatus;
  availableQty: number;
  usedQty: number;
  poolGroup?: string;
  poolNote?: string;
  zone: ZoneId;
  zoneDetail: string;
  role: string;
  howItWorks: [string, string];
  pins: PinSpec[];
  wireColorsSummary: string;
  dimensionsMm: string;
  dimensionsStatus: DataStatus;
  datasheetUrl: string;
  datasheetLabel: string;
  toConfirm: string[];
  imageDataUrl?: string;
  maxCurrentA?: number;
  operatingVoltage: string;
}

export type JumperType =
  | 'M-M'
  | 'M-H'
  | 'H-H'
  | 'Cable bornera (AWG 20-22)';

export type WireColor =
  | 'Rojo (+5V / +12V)'
  | 'Naranja (+3.3V / +12V rotulado)'
  | 'Negro (GND)'
  | 'Azul (Señal)'
  | 'Verde (PWM / Control)'
  | 'Amarillo / Blanco (I2C / Datos)';

export interface WireConnection {
  id: string;
  stage: string;
  fromComponentId: string;
  fromComponentName: string;
  fromPin: string;
  toComponentId: string;
  toComponentName: string;
  toPin: string;
  voltage: string;
  wireColor: WireColor;
  jumperType: JumperType;
  breadboardCoord?: string;
  requiresDivider?: boolean;
  dividerId?: string;
  status: DataStatus;
  notes: string;
}

export interface VoltageDividerSpec {
  id: string;
  name: string;
  signalLabel: string;
  sourcePin: string;
  esp32Pin: string;
  startColumn: number;
  hasDetachableJumper: boolean;
  steps: {
    stepNumber: number;
    part: string;
    fromCoord: string;
    toCoord: string;
    note: string;
  }[];
  expectedTestVoltage: string;
}

export interface BreadboardColumnEntry {
  board: 'P1' | 'P2';
  columnRange: string;
  section: 'Riel superior R1' | 'Riel inferior R2/R3' | 'Filas a-e' | 'Filas f-j';
  occupiedBy: string;
  netName: string;
}

export interface HarnessConductor {
  index: number;
  tramo: 'Tramo A (Caja -> Cabeza)' | 'Tramo B (Cabeza -> Carro/Gancho)';
  shortLabel: string;
  color: string;
  group: 'Potencia' | 'Señal' | 'Común';
  origin: string;
  destination: string;
  voltage: string;
  extraLengthCm: number;
}

export interface LoadItem {
  id: string;
  name: string;
  massG: number;
  rCm: number;
  thetaDeg: number;
  order: number;
}

export interface PinAssignment {
  id: string;
  componentId: string;
  componentLabel: string;
  signalName: string;
  controller: 'ESP32' | 'UNO' | 'SHIELD' | 'L298N';
  pin: string;
  defaultPin: string;
  sourceVoltage: '3.3V' | '5V' | '12V';
  usesDivider: boolean;
  hasExternalResistor: boolean;
  wireColor: 'red' | 'orange' | 'black' | 'blue' | 'green' | 'yellow';
  notes: string;
}

export interface AssemblyStep {
  id: string;
  stepNumber: number;
  title: string;
  tableItems: { item: string; qty: string }[];
  powerState: 'TODO DESCONECTADO' | 'SOLO 5 V ENCENDIDO' | '5 V + 12 V ENCENDIDO';
  actionSentence: string;
  origin: string;
  destination: string;
  jumperType: JumperType | 'Resistencia 1 kΩ' | 'Verificación física';
  wireColor: string;
  breadboardCoord?: string;
  simpleExplanation: string;
  highlightZone: string;
  highlightNodes: [string, string];
  multimeterTest: {
    probes: string;
    scale: string;
    expected: string;
    ifFails: string;
  };
}

export interface AssemblyStage {
  id: string;
  code: string;
  title: string;
  objective: string;
  simpleSummary: string;
  connectList: string[];
  doNotConnectYet: string[];
  stageTest: string;
  ifFails: string;
  steps: AssemblyStep[];
}

export interface ValidationCheck {
  id: string;
  category:
    | 'Pines'
    | 'Niveles de voltaje'
    | 'Arranque y reservados'
    | 'Alimentación y masa'
    | 'Corriente y capacidad'
    | 'Geometría y dimensiones'
    | 'Inventario'
    | 'Guía de montaje';
  title: string;
  passed: boolean;
  severity: 'ERROR' | 'ADVERTENCIA' | 'OK';
  detail: string;
  fixAction: string;
}

export interface NotebookLogRow {
  id: string;
  date: string;
  testName: string;
  expectedValue: string;
  measuredValue: string;
  approved: '' | 'Sí' | 'No';
  notes: string;
}

export interface RealMeasurementRow {
  id: string;
  magnitude: string;
  instrument: string;
  expectedRange: string;
  measuredValue: string;
  observations: string;
}

export interface ShoppingListItem {
  id: string;
  item: string;
  neededQty: number;
  availableQty: number | null;
  missingQty: number;
  specification: string;
  status: DataStatus;
}

export interface UserEditableParams {
  // Encoders y tambores
  slotsGiroN: number | null;
  slotsCarroN: number | null;
  slotsGanchoN: number | null;
  drumDiameterCarroCm: number | null;
  drumDiameterGanchoCm: number | null;
  gearOptionGiro: 'A_PINON_CORONA' | 'B_RUEDA_FRICCION';
  gearRatioGiroI: number | null;
  pinionDiameterMm: number;
  crownDiameterMm: number;

  // Geometría coherente (Sección 5)
  geometryConfirmed: boolean;
  boomLengthCm: number;
  rMaxUsefulCm: number;
  warehouseRadiusCm: number;
  counterBoomLengthCm: number;
  mastHeightCm: number | null;
  mastInnerSideMm: number;
  harnessOuterDiameterMm: number;
  headWidthMm: number;
  headDepthMm: number;
  encoderDiskDiameterMm: number;
  encoderSlotWidthMm: number;
  encoderDiskThicknessMm: number;
  hookBlockHeightCm: number;
  hallMarginCm: number;
  r0MinCm: number | null;
  counterweightDistDcpCm: number | null;

  // Caja de control Z1 (Sección 2 y 5)
  controlBoxLengthCm: number;
  controlBoxWidthCm: number;
  controlBoxHeightCm: number;

  // Manguera y ambiente
  ambientTempC: number;
  rizoReserveCm: number;

  // Verificaciones físicas pendientes
  resistors1kAvailable: number | null;
  lcdI2cAddress: 'POR CONFIRMAR' | '0x27' | '0x3F';
  buzzerType: 'POR CONFIRMAR' | 'ACTIVO' | 'PASIVO';
  ledSoundKitVoltage: 'POR CONFIRMAR' | '3.3V (R3)' | '5V (R2)';
  bulbNominalVoltage: string;

  // Portada e Informe Académico
  studentName: string;
  academicProgram: string;
  academicCourse: string;
  academicProfessor: string;
  institutionalColorHex: string;
  universityLogoDataUrl?: string;

  // Cargas y presupuesto de corriente
  activeLoads: LoadItem[];
  counterweightPlaced: boolean;
  estimatedMaxCurrentMotorA: number;
  estimatedMaxCurrentElectromagnetA: number;
  estimatedMaxCurrentBulbA: number;

  // Nivel Profesional: Calibración extendida, WiFi AP, OTA, Costos y Librerías
  usHOffsetShCm?: number | null;
  warehouseAngleDeg?: number | null;
  maxPwmGiro?: number;
  maxPwmCabrestante?: number;
  maxPwmCarro?: number;
  maxPwmBombillo?: number;
  wifiSsid?: string;
  wifiPassword?: string;
  useMdns?: boolean;
  mdnsHost?: string;
  operatorPinEnabled?: boolean;
  operatorPin?: string;
  otaEnabled?: boolean;
  otaPassword?: string;
  libraryVersions?: Record<string, string>;
  bomUnitCostsCop?: Record<string, number>;
  labelWidthMm?: number;
  labelPaperWidthMm?: number;
}

export interface ZoneInfo {
  id: ZoneId;
  name: string;
  description: string;
  componentsSummary: string;
}

export interface GlossaryItem {
  term: string;
  simpleExplanation: string;
  exampleInCrane: string;
}

export interface CommonErrorItem {
  id: string;
  title: string;
  consequence: string;
  prevention: string;
}

export interface ApaReference {
  id: string;
  category: string;
  citation: string;
  verified: boolean;
}

export interface LessonLearnedItem {
  id: string;
  topic: string;
  lesson: string;
  applyNextTime: string;
}

export interface ReusableModuleItem {
  id: string;
  title: string;
  whatItDoes: string;
  whenToUse: string;
  valuesSummary: string;
  formula: string;
  commonMistakes: string[];
  minimalCodeTitle: string;
  minimalCode: string;
}

export interface ErrorCodeSpec {
  code: 'E01' | 'E02' | 'E03' | 'E04' | 'E05' | 'E06' | 'E07';
  title: string;
  triggerCondition: string;
  safeAction: string;
  operatorAction: string;
}

export interface LibrarySpec {
  id: string;
  name: string;
  exactManagerName: string;
  author: string;
  targetController: 'ESP32' | 'Arduino UNO' | 'Ambos';
  targetFile: string;
  purpose: string;
  isBuiltIn: boolean;
  boardManagerUrl?: string;
  commonError: string;
  commonErrorFix: string;
  notes?: string;
}

export interface ProtocolFrameSpec {
  name: string;
  baudRate: number;
  serialFormat: string;
  framePattern: string;
  maxFrameChars: number;
  checksumRule: string;
  pingIntervalMs: number;
  timeoutMs: number;
  frames: {
    prefix: string;
    direction: 'ESP32 -> UNO' | 'UNO -> ESP32';
    fields: string;
    example: string;
    purpose: string;
  }[];
}

export interface CraneProjectJson {
  schemaVersion: '2.0.0';
  app: 'Crane Engineering Studio';
  generatedAt: string;
  architecture: {
    controllers: string[];
    maxSimultaneousMotors: number;
    logicRailVolts: number;
    powerRailVolts: number;
    maxPowerSupplyAmps: number;
    usVOffsetAboveMagnetCm: number;
    usVLateralOffsetCm: number;
    electromagnetFailsafeRule: string;
  };
  network: {
    wifiSsid: string;
    wifiPassword: string;
    wifiPasswordStatus: DataStatus;
    apIp: string;
    useMdns: boolean;
    mdnsHost: string;
    operatorPinEnabled: boolean;
    operatorPin: string;
    otaEnabled: boolean;
    otaHostname: string;
    otaPassword: string;
  };
  calibration: {
    slotsGiroN: number | null;
    slotsCarroN: number | null;
    slotsGanchoN: number | null;
    drumDiameterCarroCm: number | null;
    drumDiameterGanchoCm: number | null;
    gearOptionGiro: 'A_PINON_CORONA' | 'B_RUEDA_FRICCION';
    gearRatioGiroI: number | null;
    usHOffsetShCm: number | null;
    usVOffsetECm: number;
    r0MinCm: number | null;
    rMaxUsefulCm: number;
    boomLengthCm: number;
    mastHeightCm: number | null;
    hookBlockHeightCm: number;
    hallMarginCm: number;
    ambientTempC: number;
    speedOfSoundCmPerUs: number;
    counterweightDistDcpCm: number | null;
    counterweightPlaced: boolean;
    warehouseRadiusCm: number;
    warehouseAngleDeg: number | null;
    maxPwmGiro: number;
    maxPwmCabrestante: number;
    maxPwmCarro: number;
    maxPwmBombillo: number;
    lcdI2cAddress: 'POR CONFIRMAR' | '0x27' | '0x3F';
  };
  zones: ZoneInfo[];
  components: {
    id: string;
    shortCode: string;
    name: string;
    zone: ZoneId;
    availableQty: number;
    usedQty: number;
    status: DataStatus;
    operatingVoltage: string;
    dimensionsMm: string;
    unitCostCop: number;
  }[];
  pins: PinAssignment[];
  loads: LoadItem[];
  libraries: {
    id: string;
    name: string;
    author: string;
    targetController: string;
    installedVersion: string;
  }[];
  protocolGT10: ProtocolFrameSpec;
  screens: {
    lcd1602: { lines: number; cols: number; line1Template: string; line2Template: string };
    oledA: { tabs: string[]; busPins: string; i2cAddress: string };
    oledB: { tabs: string[]; busPins: string; i2cAddress: string };
  };
  errorCodes: ErrorCodeSpec[];
}

export interface ProjectChangeEvent {
  id: string;
  timestamp: string;
  summary: string;
  details: string[];
  affectedModules: ('Láminas' | 'Guía' | 'Informe' | 'Código' | 'Asesor' | 'Validador')[];
}

export interface ProjectVersionSnapshot {
  id: string;
  timestamp: string;
  label: string;
  summary: string;
  projectJson: CraneProjectJson;
  params: UserEditableParams;
  pinAssignments: PinAssignment[];
}

export interface LinterFinding {
  id: string;
  file: string;
  line: number;
  severity: 'ERROR' | 'ADVERTENCIA';
  ruleId: string;
  title: string;
  detail: string;
  fix: string;
}

export interface GeneratedFirmwareBundle {
  files: { path: string; content: string; category: 'ESP32' | 'UNO' | 'Pruebas' | 'Docs' }[];
  panelHtmlBytes: number;
  hasExternalCdn: boolean;
  linterFindings: LinterFinding[];
}

export type CraneFsmState =
  | 'INICIO'
  | 'REPOSO'
  | 'HOMING'
  | 'MANUAL'
  | 'ESCANEO'
  | 'LISTO'
  | 'TRABAJANDO'
  | 'PARO'
  | 'FALLA';

export type CraneWorkingSubState =
  | 'NINGUNO'
  | 'IR'
  | 'BAJAR'
  | 'ENGANCHAR_5S'
  | 'VERIFICAR_2CM'
  | 'TRANSPORTAR'
  | 'BAJAR_BODEGA'
  | 'ESPERA_5S'
  | 'SOLTAR_PULSO_INVERSO'
  | 'SUBIR';

export interface DigitalTwinState {
  fsmState: CraneFsmState;
  subState: CraneWorkingSubState;
  subStateTimerMs: number;
  thetaDeg: number;
  targetThetaDeg: number;
  rCm: number;
  targetRCm: number;
  zCm: number;
  targetZCm: number;
  hallTriggered: boolean;
  homeSwitchActive: boolean;
  paroLatched: boolean;
  linkAlive: boolean;
  electromagnetOn: boolean;
  reversePulseMs: number;
  bulbPwm: number;
  activeMotors: ('GIRO' | 'CABRESTANTE' | 'CARRO')[];
  activeLoadIndex: number;
  completedLoadIds: string[];
  usHReadingCm: number;
  usVReadingCm: number;
  errorCode: ErrorCodeSpec['code'] | 'OK';
  counterweightConfirmed: boolean;
  logs: { time: string; event: string; level: 'INFO' | 'WARN' | 'ERR' }[];
}

export interface AdvisorPatchProposal {
  id: string;
  description: string;
  paramsPatch?: Partial<UserEditableParams>;
  pinPatches?: { id: string; pin: string; notes?: string }[];
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  imagePreviewUrl?: string;
  toolCallsUsed?: string[];
  patchProposal?: AdvisorPatchProposal;
  patchApplied?: boolean;
}

export interface PreEnergizeChecklistState {
  commonGroundVerified: boolean;
  railsR2R3Isolated: boolean;
  dividersMeasured33V: boolean;
  shieldPwrJumperRemoved: boolean;
  l298n5vJumperRemoved: boolean;
  usbDisconnectedForExternal5V: boolean;
  counterweightConfirmed: boolean;
}


