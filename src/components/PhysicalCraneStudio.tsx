import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  CheckCircle2,
  Compass,
  Move3d,
  Pause,
  Play,
  RotateCcw,
  Ruler,
  Scissors,
  ShieldAlert,
  Sliders,
} from 'lucide-react';
import { DEFAULT_EDITABLE_PARAMS } from '../data/craneData';
import { LoadItem, UserEditableParams } from '../types/crane';
import { StatusChip } from './StatusChip';

interface PhysicalCraneStudioProps {
  params: UserEditableParams;
  onUpdateParams: (next: Partial<UserEditableParams>) => void;
}

type StudioView = 'sim3d' | 'blueprints' | 'cutlist';
type DimGroup = 'structure' | 'enclosures' | 'encoders';
type OpMode = 'auto' | 'manual';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

type AutoPhase =
  | 'IDLE'
  | 'SIGNALING'
  | 'SLEW_AND_TROLLEY'
  | 'DESCEND_FAST'
  | 'DESCEND_CREEP'
  | 'MAGNET_HOLD'
  | 'VERIFY_LIFT'
  | 'HOIST_TO_HALL'
  | 'TRAVEL_WAREHOUSE'
  | 'LOWER_WAREHOUSE'
  | 'RELEASE_PULSE'
  | 'RETURN_HOME';

const PHASE_LABELS: Record<AutoPhase, string> = {
  IDLE: 'En espera (HOME θ = 0° o listo para TRABAJAR)',
  SIGNALING: 'Paso 2: Enciende baliza Corona (M3) y Buzzer 1 (D10)',
  SLEW_AND_TROLLEY: 'Paso 3: Gira a θᵢ (L298N B + FC-33) y mueve carro a rᵢ (M1 + US-H) [2 motores máx.]',
  DESCEND_FAST: 'Paso 4a: Baja gancho hacia la carga (L298N A + FC-33 gancho)',
  DESCEND_CREEP: 'Paso 4b: Δh ≤ 1 cm (US-V) → velocidad reducida (Pot 2) hasta contacto',
  MAGNET_HOLD: 'Paso 5: Electroimán M2 energizado a 12 V durante 5 s sobre arandela ≥ 4 cm',
  VERIFY_LIFT: 'Paso 6: Sube 2 cm y verifica con US-V que d_V ≈ 3,5 cm (carga agarrada)',
  HOIST_TO_HALL: 'Paso 7a: Sube gancho hasta activar tope superior Hall KY-003 (D33)',
  TRAVEL_WAREHOUSE: 'Paso 7b: Gira y ajusta carro hacia Bodega Z7 (≤ 2 motores a la vez)',
  LOWER_WAREHOUSE: 'Paso 8a: Baja por encoder FC-33 gancho (D32) hasta < 1 cm del piso de bodega',
  RELEASE_PULSE: 'Paso 8b: Espera 5 s + pulso inverso ≤ 80 ms en M2 para desmagnetizar y soltar',
  RETURN_HOME: 'Ciclo completado: Retorno seguro a HOME (θ = 0°, tope físico D39)',
};

interface SimState {
  thetaDeg: number;
  trolleyRCm: number;
  hookHeightZCm: number;
  magnetOn: boolean;
  reversePulseActive: boolean;
  bulbOn: boolean;
  autoPhase: AutoPhase;
  activeLoadIdx: number;
  carriedLoadId: string | null;
  deliveredIds: string[];
  phaseClockMs: number;
}

export const PhysicalCraneStudio: React.FC<PhysicalCraneStudioProps> = ({
  params,
  onUpdateParams,
}) => {
  const [view, setView] = useState<StudioView>('sim3d');
  const [dimGroup, setDimGroup] = useState<DimGroup>('structure');
  const [opMode, setOpMode] = useState<OpMode>('auto');
  const [warehouseAngleDeg, setWarehouseAngleDeg] = useState<number>(270);

  // 3D Orbit Camera
  const [camYaw, setCamYaw] = useState<number>(36);
  const [camPitch, setCamPitch] = useState<number>(24);
  const [camZoom, setCamZoom] = useState<number>(1);
  const dragRef = useRef<{ x: number; y: number; yaw: number; pitch: number } | null>(null);

  // Live physical kinematics state
  const mastH = params.mastHeightCm ?? 52;
  const r0Min = params.r0MinCm ?? 10;
  const dCp = params.counterweightDistDcpCm ?? 18;
  const usefulHookH = Math.max(15, mastH - params.hookBlockHeightCm - params.hallMarginCm);

  const [autoRunning, setAutoRunning] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<1 | 2>(1);
  const [safetyAlert, setSafetyAlert] = useState<string | null>(null);

  const [sim, setSim] = useState<SimState>(() => ({
    thetaDeg: 25,
    trolleyRCm: Math.min(params.rMaxUsefulCm, Math.max(r0Min, 24)),
    hookHeightZCm: usefulHookH * 0.68,
    magnetOn: false,
    reversePulseActive: false,
    bulbOn: false,
    autoPhase: 'IDLE',
    activeLoadIdx: 0,
    carriedLoadId: null,
    deliveredIds: [],
    phaseClockMs: 0,
  }));

  const {
    thetaDeg,
    trolleyRCm,
    hookHeightZCm,
    magnetOn,
    reversePulseActive,
    bulbOn,
    autoPhase,
    activeLoadIdx,
    carriedLoadId,
    deliveredIds,
  } = sim;

  // Effective mechanical calculations from editable dimensions
  const effectiveRatioI =
    params.gearOptionGiro === 'A_PINON_CORONA' && params.pinionDiameterMm > 0
      ? params.crownDiameterMm / params.pinionDiameterMm
      : (params.gearRatioGiroI ?? 0);

  const resGiroDeg =
    params.slotsGiroN && effectiveRatioI > 0
      ? 360 / (2 * params.slotsGiroN * effectiveRatioI)
      : null;

  const resCarroMm =
    params.slotsCarroN && params.drumDiameterCarroCm
      ? (Math.PI * params.drumDiameterCarroCm * 10) / (2 * params.slotsCarroN)
      : null;

  const resGanchoMm =
    params.slotsGanchoN && params.drumDiameterGanchoCm
      ? (Math.PI * params.drumDiameterGanchoCm * 10) / (2 * params.slotsGanchoN)
      : null;

  const maxMomentGcm =
    params.activeLoads.length > 0
      ? Math.max(...params.activeLoads.map((l) => l.massG * l.rCm))
      : 0;

  const minCounterweightG =
    dCp > 0 && maxMomentGcm > 0 ? (1.1 * maxMomentGcm) / dCp : null;

  const mastFillPct =
    params.mastInnerSideMm > 0
      ? ((Math.PI * Math.pow(params.harnessOuterDiameterMm / 2, 2)) /
          (params.mastInnerSideMm * params.mastInnerSideMm)) *
        100
      : 100;

  const baseTramoACm =
    params.mastHeightCm !== null ? params.mastHeightCm + params.rizoReserveCm + 30 : null;

  // Clamp live trolley & hook when user shrinks dimensions
  useEffect(() => {
    setSim((prev) => ({
      ...prev,
      trolleyRCm: Math.max(r0Min, Math.min(params.rMaxUsefulCm, prev.trolleyRCm)),
      hookHeightZCm: Math.max(0, Math.min(usefulHookH, prev.hookHeightZCm)),
    }));
  }, [r0Min, params.rMaxUsefulCm, usefulHookH]);

  const sortedLoads = useMemo(
    () => [...params.activeLoads].sort((a, b) => a.order - b.order),
    [params.activeLoads]
  );

  // Stop auto-runner cleanly when returning to IDLE
  useEffect(() => {
    if (autoRunning && autoPhase === 'IDLE' && deliveredIds.length > 0) {
      setAutoRunning(false);
    }
  }, [autoRunning, autoPhase, deliveredIds.length]);

  // Automated kinematics step loop (faithful to Section 9) — pure single-state updater
  useEffect(() => {
    if (opMode !== 'auto' || !autoRunning) return;

    const tickMs = 45;
    const timer = window.setInterval(() => {
      const speedMult = simSpeed;
      const dt = tickMs * speedMult;

      setSim((prev) => {
        const targetLoad: LoadItem | undefined = sortedLoads[prev.activeLoadIdx];
        const nextClock = prev.phaseClockMs + dt;

        if (prev.autoPhase === 'IDLE') {
          if (!targetLoad) {
            return { ...prev, bulbOn: false, autoPhase: 'IDLE', phaseClockMs: 0 };
          }
          return {
            ...prev,
            bulbOn: true,
            autoPhase: 'SIGNALING',
            phaseClockMs: 0,
          };
        }

        if (prev.autoPhase === 'SIGNALING') {
          if (nextClock >= 700) {
            return {
              ...prev,
              autoPhase: targetLoad ? 'SLEW_AND_TROLLEY' : 'RETURN_HOME',
              phaseClockMs: 0,
            };
          }
          return { ...prev, phaseClockMs: nextClock };
        }

        if (prev.autoPhase === 'SLEW_AND_TROLLEY') {
          if (!targetLoad) {
            return { ...prev, autoPhase: 'RETURN_HOME', phaseClockMs: 0 };
          }
          const targetTheta = Math.max(0, Math.min(360, targetLoad.thetaDeg));
          const targetR = Math.max(r0Min, Math.min(params.rMaxUsefulCm, targetLoad.rCm));

          const dTheta = targetTheta - prev.thetaDeg;
          const stepTheta = 2.4 * speedMult;
          const thetaDone = Math.abs(dTheta) <= stepTheta;
          const nextTheta = thetaDone ? targetTheta : prev.thetaDeg + Math.sign(dTheta) * stepTheta;

          const dR = targetR - prev.trolleyRCm;
          const stepR = 0.7 * speedMult;
          const rDone = Math.abs(dR) <= stepR;
          const nextR = rDone ? targetR : prev.trolleyRCm + Math.sign(dR) * stepR;

          return {
            ...prev,
            thetaDeg: nextTheta,
            trolleyRCm: nextR,
            autoPhase: thetaDone && rDone ? 'DESCEND_FAST' : 'SLEW_AND_TROLLEY',
            phaseClockMs: thetaDone && rDone ? 0 : nextClock,
          };
        }

        if (prev.autoPhase === 'DESCEND_FAST') {
          const nextZ = prev.hookHeightZCm - 0.85 * speedMult;
          if (nextZ <= 4.5) {
            return {
              ...prev,
              hookHeightZCm: 4.5,
              autoPhase: 'DESCEND_CREEP',
              phaseClockMs: 0,
            };
          }
          return { ...prev, hookHeightZCm: nextZ, phaseClockMs: nextClock };
        }

        if (prev.autoPhase === 'DESCEND_CREEP') {
          const nextZ = prev.hookHeightZCm - 0.18 * speedMult;
          if (nextZ <= 2.4) {
            return {
              ...prev,
              hookHeightZCm: 2.4,
              magnetOn: true,
              autoPhase: 'MAGNET_HOLD',
              phaseClockMs: 0,
            };
          }
          return { ...prev, hookHeightZCm: nextZ, phaseClockMs: nextClock };
        }

        if (prev.autoPhase === 'MAGNET_HOLD') {
          if (nextClock >= 1500) {
            return {
              ...prev,
              carriedLoadId: targetLoad ? targetLoad.id : prev.carriedLoadId,
              autoPhase: 'VERIFY_LIFT',
              phaseClockMs: 0,
            };
          }
          return { ...prev, phaseClockMs: nextClock };
        }

        if (prev.autoPhase === 'VERIFY_LIFT') {
          const nextZ = prev.hookHeightZCm + 0.25 * speedMult;
          if (nextZ >= 4.4) {
            return {
              ...prev,
              hookHeightZCm: 4.4,
              autoPhase: 'HOIST_TO_HALL',
              phaseClockMs: 0,
            };
          }
          return { ...prev, hookHeightZCm: nextZ, phaseClockMs: nextClock };
        }

        if (prev.autoPhase === 'HOIST_TO_HALL') {
          const nextZ = prev.hookHeightZCm + 0.9 * speedMult;
          if (nextZ >= usefulHookH) {
            return {
              ...prev,
              hookHeightZCm: usefulHookH,
              autoPhase: 'TRAVEL_WAREHOUSE',
              phaseClockMs: 0,
            };
          }
          return { ...prev, hookHeightZCm: nextZ, phaseClockMs: nextClock };
        }

        if (prev.autoPhase === 'TRAVEL_WAREHOUSE') {
          const whR = Math.max(r0Min, Math.min(params.rMaxUsefulCm, params.warehouseRadiusCm));
          const dTheta = warehouseAngleDeg - prev.thetaDeg;
          const stepTheta = 2.4 * speedMult;
          const thetaDone = Math.abs(dTheta) <= stepTheta;
          const nextTheta = thetaDone ? warehouseAngleDeg : prev.thetaDeg + Math.sign(dTheta) * stepTheta;

          const dR = whR - prev.trolleyRCm;
          const stepR = 0.7 * speedMult;
          const rDone = Math.abs(dR) <= stepR;
          const nextR = rDone ? whR : prev.trolleyRCm + Math.sign(dR) * stepR;

          return {
            ...prev,
            thetaDeg: nextTheta,
            trolleyRCm: nextR,
            autoPhase: thetaDone && rDone ? 'LOWER_WAREHOUSE' : 'TRAVEL_WAREHOUSE',
            phaseClockMs: thetaDone && rDone ? 0 : nextClock,
          };
        }

        if (prev.autoPhase === 'LOWER_WAREHOUSE') {
          const nextZ = prev.hookHeightZCm - 0.85 * speedMult;
          if (nextZ <= 2.6) {
            return {
              ...prev,
              hookHeightZCm: 2.6,
              autoPhase: 'RELEASE_PULSE',
              phaseClockMs: 0,
            };
          }
          return { ...prev, hookHeightZCm: nextZ, phaseClockMs: nextClock };
        }

        if (prev.autoPhase === 'RELEASE_PULSE') {
          let nextMagnet = prev.magnetOn;
          let nextPulse = prev.reversePulseActive;
          let nextDelivered = prev.deliveredIds;
          let nextCarried = prev.carriedLoadId;

          if (nextClock >= 900 && nextClock < 1300) {
            nextMagnet = false;
            nextPulse = true;
            if (prev.carriedLoadId) {
              nextDelivered = prev.deliveredIds.includes(prev.carriedLoadId)
                ? prev.deliveredIds
                : [...prev.deliveredIds, prev.carriedLoadId];
              nextCarried = null;
            }
          }

          if (nextClock >= 1500) {
            const hasMore = prev.activeLoadIdx + 1 < sortedLoads.length;
            return {
              ...prev,
              magnetOn: false,
              reversePulseActive: false,
              deliveredIds: nextDelivered,
              carriedLoadId: nextCarried,
              activeLoadIdx: hasMore ? prev.activeLoadIdx + 1 : prev.activeLoadIdx,
              autoPhase: hasMore ? 'SLEW_AND_TROLLEY' : 'RETURN_HOME',
              phaseClockMs: 0,
            };
          }

          return {
            ...prev,
            magnetOn: nextMagnet,
            reversePulseActive: nextPulse,
            deliveredIds: nextDelivered,
            carriedLoadId: nextCarried,
            phaseClockMs: nextClock,
          };
        }

        if (prev.autoPhase === 'RETURN_HOME') {
          const nextZ = Math.min(usefulHookH * 0.72, prev.hookHeightZCm + 0.9 * speedMult);
          const zDone = nextZ >= usefulHookH * 0.72 - 0.05;
          const stepTheta = 2.6 * speedMult;
          const thetaDone = prev.thetaDeg <= stepTheta;
          const nextTheta = thetaDone ? 0 : prev.thetaDeg - stepTheta;

          if (zDone && thetaDone) {
            return {
              ...prev,
              hookHeightZCm: usefulHookH * 0.72,
              thetaDeg: 0,
              bulbOn: false,
              autoPhase: 'IDLE',
              phaseClockMs: 0,
            };
          }
          return {
            ...prev,
            hookHeightZCm: nextZ,
            thetaDeg: nextTheta,
            phaseClockMs: nextClock,
          };
        }

        return prev;
      });
    }, tickMs);

    return () => window.clearInterval(timer);
  }, [
    opMode,
    autoRunning,
    sortedLoads,
    simSpeed,
    r0Min,
    params.rMaxUsefulCm,
    params.warehouseRadiusCm,
    usefulHookH,
    warehouseAngleDeg,
  ]);

  const handleStartAuto = () => {
    if (!params.counterweightPlaced) {
      setSafetyAlert(
        `Bloqueado por seguridad: confirma primero que el contrapeso mínimo (${
          minCounterweightG ? `${minCounterweightG.toFixed(0)} g` : 'calculado'
        }) ya está colocado en la contrapluma Z4.`
      );
      return;
    }
    if (sortedLoads.length === 0) {
      setSafetyAlert('Agrega al menos una carga en la pestaña Inicio para iniciar el ciclo automático.');
      return;
    }
    setSafetyAlert(null);
    setOpMode('auto');
    if (autoPhase === 'IDLE') {
      setSim((prev) => ({
        ...prev,
        activeLoadIdx: 0,
        deliveredIds: [],
        carriedLoadId: null,
        phaseClockMs: 0,
      }));
    }
    setAutoRunning((r) => !r);
  };

  const handleResetSimulation = () => {
    setAutoRunning(false);
    setSafetyAlert(null);
    setSim({
      thetaDeg: 0,
      trolleyRCm: Math.min(params.rMaxUsefulCm, Math.max(r0Min, 22)),
      hookHeightZCm: usefulHookH * 0.72,
      magnetOn: false,
      reversePulseActive: false,
      bulbOn: false,
      autoPhase: 'IDLE',
      activeLoadIdx: 0,
      carriedLoadId: null,
      deliveredIds: [],
      phaseClockMs: 0,
    });
  };

  // Telemetry values derived from physical position & editable encoder params
  const hallTriggered = hookHeightZCm >= usefulHookH - 0.1;
  const homeTriggered = thetaDeg <= 0.5;
  const usHDistanceCm = Math.max(1, trolleyRCm - r0Min + 2.5); // distance from boom root
  const loadUnderHook = sortedLoads.find(
    (l) =>
      !deliveredIds.includes(l.id) &&
      Math.abs(l.thetaDeg - thetaDeg) < 4 &&
      Math.abs(l.rCm - trolleyRCm) < 2.5
  );
  const deltaHCm = carriedLoadId
    ? 0
    : loadUnderHook
      ? Math.max(0, hookHeightZCm - 2.4)
      : hookHeightZCm;
  const usVMeasuredCm = deltaHCm + 3.5; // e = 3.5 cm physical offset

  const activeMotorsCount =
    opMode === 'auto' && autoRunning
      ? autoPhase === 'SLEW_AND_TROLLEY' || autoPhase === 'TRAVEL_WAREHOUSE'
        ? 2
        : autoPhase === 'DESCEND_FAST' ||
            autoPhase === 'DESCEND_CREEP' ||
            autoPhase === 'VERIFY_LIFT' ||
            autoPhase === 'HOIST_TO_HALL' ||
            autoPhase === 'LOWER_WAREHOUSE' ||
            autoPhase === 'RETURN_HOME'
          ? 1
          : 0
      : 0;

  const estimatedCurrentA =
    activeMotorsCount * params.estimatedMaxCurrentMotorA +
    (magnetOn ? params.estimatedMaxCurrentElectromagnetA : 0) +
    (bulbOn ? params.estimatedMaxCurrentBulbA : 0);

  // 3D SVG right-handed CAD projection helper (+x East, +y North, +z Up)
  const project3D = (pt: Vec3) => {
    const yawRad = (camYaw * Math.PI) / 180;
    const pitchRad = (camPitch * Math.PI) / 180;
    const x1 = pt.x * Math.cos(yawRad) - pt.y * Math.sin(yawRad);
    const y1 = pt.x * Math.sin(yawRad) + pt.y * Math.cos(yawRad);
    const y2 = -y1 * Math.sin(pitchRad) - pt.z * Math.cos(pitchRad);
    const baseScale = (410 / Math.max(80, params.boomLengthCm + params.counterBoomLengthCm + 18)) * camZoom;
    return {
      sx: 450 + x1 * baseScale,
      sy: 345 + y2 * baseScale,
    };
  };

  // Precompute 3D crane skeleton points
  const radTheta = (thetaDeg * Math.PI) / 180;
  const cosT = Math.cos(radTheta);
  const sinT = Math.sin(radTheta);

  const mastTopZ = mastH;
  const coronaTopZ = mastH + 10;
  const boomEnd: Vec3 = { x: params.boomLengthCm * cosT, y: params.boomLengthCm * sinT, z: mastTopZ };
  const counterEnd: Vec3 = {
    x: -params.counterBoomLengthCm * cosT,
    y: -params.counterBoomLengthCm * sinT,
    z: mastTopZ,
  };
  const counterweightPos: Vec3 = {
    x: -dCp * cosT,
    y: -dCp * sinT,
    z: mastTopZ - 4,
  };
  const trolleyPos: Vec3 = {
    x: trolleyRCm * cosT,
    y: trolleyRCm * sinT,
    z: mastTopZ - 2,
  };
  const hookTopZ = Math.min(mastTopZ - 5, hookHeightZCm + params.hookBlockHeightCm);
  const hookTop: Vec3 = { x: trolleyPos.x, y: trolleyPos.y, z: hookTopZ };
  const hookBottom: Vec3 = { x: trolleyPos.x, y: trolleyPos.y, z: Math.max(0.5, hookHeightZCm) };

  // Base board extent (fixed square board covering max boom + control box Z1)
  const boardHalf = Math.max(params.boomLengthCm + 8, 56);
  const pBoard = [
    project3D({ x: -boardHalf, y: -boardHalf, z: 0 }),
    project3D({ x: boardHalf, y: -boardHalf, z: 0 }),
    project3D({ x: boardHalf, y: boardHalf, z: 0 }),
    project3D({ x: -boardHalf, y: boardHalf, z: 0 }),
  ];

  // Control Box Z1 on base board (fixed separate corner, never on counter-jib!)
  const boxX = -boardHalf + 6;
  const boxY = -boardHalf + 6;
  const boxL = params.controlBoxLengthCm;
  const boxW = params.controlBoxWidthCm;
  const boxH = params.controlBoxHeightCm;
  const boxBasePts = [
    project3D({ x: boxX, y: boxY, z: 0 }),
    project3D({ x: boxX + boxL, y: boxY, z: 0 }),
    project3D({ x: boxX + boxL, y: boxY + boxW, z: 0 }),
    project3D({ x: boxX, y: boxY + boxW, z: 0 }),
  ];
  const boxTopPts = [
    project3D({ x: boxX, y: boxY, z: boxH }),
    project3D({ x: boxX + boxL, y: boxY, z: boxH }),
    project3D({ x: boxX + boxL, y: boxY + boxW, z: boxH }),
    project3D({ x: boxX, y: boxY + boxW, z: boxH }),
  ];

  // Warehouse Z7 fixed on base board
  const whRad = (warehouseAngleDeg * Math.PI) / 180;
  const whCenter = {
    x: params.warehouseRadiusCm * Math.cos(whRad),
    y: params.warehouseRadiusCm * Math.sin(whRad),
  };
  const whHalf = 6.5;
  const whPts = [
    project3D({ x: whCenter.x - whHalf, y: whCenter.y - whHalf, z: 0.4 }),
    project3D({ x: whCenter.x + whHalf, y: whCenter.y - whHalf, z: 0.4 }),
    project3D({ x: whCenter.x + whHalf, y: whCenter.y + whHalf, z: 0.4 }),
    project3D({ x: whCenter.x - whHalf, y: whCenter.y + whHalf, z: 0.4 }),
  ];
  const warehousePirLit =
    Math.abs(thetaDeg - warehouseAngleDeg) < 12 &&
    Math.abs(trolleyRCm - params.warehouseRadiusCm) < 5;

  const pMastBot = project3D({ x: 0, y: 0, z: 0 });
  const pMastTop = project3D({ x: 0, y: 0, z: mastTopZ });
  const pCoronaTop = project3D({ x: 0, y: 0, z: coronaTopZ });
  const pBoomEnd = project3D(boomEnd);
  const pCounterEnd = project3D(counterEnd);
  const pCounterweight = project3D(counterweightPos);
  const pTrolley = project3D(trolleyPos);
  const pHookTop = project3D(hookTop);
  const pHookBot = project3D(hookBottom);
  const pBoxCableExit = project3D({ x: boxX + boxL, y: boxY + boxW / 2, z: 1.5 });

  // Cut list items dynamically computed from editable params (no geometric validation)
  const cutListRows = [
    {
      zone: 'Z2',
      part: 'Paredes del mástil hueco (4 tiras)',
      qty: 4,
      spec: `${(params.mastInnerSideMm + 6).toFixed(0)} mm ancho × ${
        params.mastHeightCm !== null ? `${params.mastHeightCm} cm` : 'POR CONFIRMAR'
      } alto (hueco interior ${params.mastInnerSideMm}×${params.mastInnerSideMm} mm)`,
      pending: params.mastHeightCm === null,
    },
    {
      zone: 'Z3',
      part: 'Plataforma cabeza giratoria',
      qty: 1,
      spec: `${params.headWidthMm} × ${params.headDepthMm} mm (espacio 3 motores + 3 FC-33 + US-H + bornera)`,
      pending: false,
    },
    {
      zone: 'Z4',
      part: 'Pluma principal + riel del carro',
      qty: 1,
      spec: `${params.boomLengthCm} cm totales (radio útil ${
        params.r0MinCm ?? 'POR CONFIRMAR'
      }–${params.rMaxUsefulCm} cm)`,
      pending: params.r0MinCm === null,
    },
    {
      zone: 'Z4',
      part: 'Contrapluma (solo contrapeso, SIN electrónica)',
      qty: 1,
      spec: `${params.counterBoomLengthCm} cm de largo (colgar contrapeso a d_cp = ${
        params.counterweightDistDcpCm ?? 'POR CONFIRMAR'
      } cm)`,
      pending: params.counterweightDistDcpCm === null,
    },
    {
      zone: 'Z1',
      part: 'Caja de control separada (base, 4 paredes y tapa)',
      qty: 1,
      spec: `${params.controlBoxLengthCm} × ${params.controlBoxWidthCm} × ${params.controlBoxHeightCm} cm (calados tapa: LCD 80×36 mm, 2×OLED 27×27 mm)`,
      pending: false,
    },
    {
      zone: 'Z3',
      part: 'Discos ranurados ópticos',
      qty: 3,
      spec: `Ø ${params.encoderDiskDiameterMm} mm · ranuras ${params.encoderSlotWidthMm} mm · esp. ${params.encoderDiskThicknessMm} mm · N = ${params.slotsGiroN ?? 'POR CONFIRMAR'} / ${params.slotsCarroN ?? 'POR CONFIRMAR'} / ${params.slotsGanchoN ?? 'POR CONFIRMAR'}`,
      pending: !params.slotsGiroN || !params.slotsCarroN || !params.slotsGanchoN,
    },
    {
      zone: 'Z5',
      part: 'Carro + placa reflectora US-H + soporte Hall KY-003',
      qty: 1,
      spec: `Placa plana perpendicular a US-H + bloque gancho ${params.hookBlockHeightCm} cm + margen Hall ${params.hallMarginCm} cm`,
      pending: false,
    },
    {
      zone: 'Z2/Z3',
      part: 'Manguera Tramo A (22 hilos) con rizo de giro',
      qty: 1,
      spec: baseTramoACm
        ? `${baseTramoACm} cm base (${params.mastHeightCm} mástil + ${params.rizoReserveCm} rizo + 30 extremos)`
        : `POR CONFIRMAR (falta altura mástil) + ${params.rizoReserveCm} cm rizo + 30 cm`,
      pending: baseTramoACm === null,
    },
  ];

  const handleRestoreDefaults = () => {
    onUpdateParams({
      mastHeightCm: DEFAULT_EDITABLE_PARAMS.mastHeightCm,
      mastInnerSideMm: DEFAULT_EDITABLE_PARAMS.mastInnerSideMm,
      harnessOuterDiameterMm: DEFAULT_EDITABLE_PARAMS.harnessOuterDiameterMm,
      boomLengthCm: DEFAULT_EDITABLE_PARAMS.boomLengthCm,
      r0MinCm: DEFAULT_EDITABLE_PARAMS.r0MinCm,
      rMaxUsefulCm: DEFAULT_EDITABLE_PARAMS.rMaxUsefulCm,
      warehouseRadiusCm: DEFAULT_EDITABLE_PARAMS.warehouseRadiusCm,
      counterBoomLengthCm: DEFAULT_EDITABLE_PARAMS.counterBoomLengthCm,
      counterweightDistDcpCm: DEFAULT_EDITABLE_PARAMS.counterweightDistDcpCm,
      hookBlockHeightCm: DEFAULT_EDITABLE_PARAMS.hookBlockHeightCm,
      hallMarginCm: DEFAULT_EDITABLE_PARAMS.hallMarginCm,
      controlBoxLengthCm: DEFAULT_EDITABLE_PARAMS.controlBoxLengthCm,
      controlBoxWidthCm: DEFAULT_EDITABLE_PARAMS.controlBoxWidthCm,
      controlBoxHeightCm: DEFAULT_EDITABLE_PARAMS.controlBoxHeightCm,
      headWidthMm: DEFAULT_EDITABLE_PARAMS.headWidthMm,
      headDepthMm: DEFAULT_EDITABLE_PARAMS.headDepthMm,
      rizoReserveCm: DEFAULT_EDITABLE_PARAMS.rizoReserveCm,
      drumDiameterCarroCm: DEFAULT_EDITABLE_PARAMS.drumDiameterCarroCm,
      drumDiameterGanchoCm: DEFAULT_EDITABLE_PARAMS.drumDiameterGanchoCm,
      slotsGiroN: DEFAULT_EDITABLE_PARAMS.slotsGiroN,
      slotsCarroN: DEFAULT_EDITABLE_PARAMS.slotsCarroN,
      slotsGanchoN: DEFAULT_EDITABLE_PARAMS.slotsGanchoN,
      encoderDiskDiameterMm: DEFAULT_EDITABLE_PARAMS.encoderDiskDiameterMm,
      encoderSlotWidthMm: DEFAULT_EDITABLE_PARAMS.encoderSlotWidthMm,
      encoderDiskThicknessMm: DEFAULT_EDITABLE_PARAMS.encoderDiskThicknessMm,
      geometryConfirmed: false,
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <StatusChip
              status={
                params.mastHeightCm !== null &&
                params.slotsGiroN &&
                params.slotsCarroN &&
                params.slotsGanchoN &&
                params.drumDiameterCarroCm &&
                params.drumDiameterGanchoCm &&
                effectiveRatioI > 0 &&
                params.r0MinCm !== null &&
                params.counterweightDistDcpCm !== null
                  ? 'CONFIRMADO'
                  : 'POR CONFIRMAR'
              }
            />
            <span className="text-xs text-slate-400">
              Dimensiones libres definidas por el usuario · Sincronizadas con Informe UIS y Manguera
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Grúa Física, Dimensiones Editables y Simulador Cinemático (Z1–Z8)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Define libremente las dimensiones de tu maqueta en el panel derecho (sin validaciones restrictivas). Completa N, D e i marcados POR CONFIRMAR para obtener resoluciones exactas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-[#080E1A] border border-slate-800 shrink-0 self-start">
          <button
            onClick={() => setView('sim3d')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              view === 'sim3d' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Move3d className="w-4 h-4" />
            Simulador 3D y Operación
          </button>
          <button
            onClick={() => setView('blueprints')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              view === 'blueprints' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Ruler className="w-4 h-4" />
            Planos Acotados (Alzado / Planta)
          </button>
          <button
            onClick={() => setView('cutlist')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
              view === 'cutlist' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
            }`}
          >
            <Scissors className="w-4 h-4" />
            Despiece de Corte
          </button>
        </div>
      </div>

      {/* Layout principal: Escenario visual (65%) + Panel de Dimensiones Editables (35%) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: Vistas interactivas */}
        <div className="xl:col-span-8 space-y-5">
          {view === 'sim3d' && (
            <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
              {/* Barra de control de simulación */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 rounded-lg bg-[#080E1A] border border-slate-800">
                  <button
                    onClick={() => {
                      setOpMode('auto');
                      setAutoRunning(false);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
                      opMode === 'auto' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Modo Automático (Tablet WiFi)
                  </button>
                  <button
                    onClick={() => {
                      setAutoRunning(false);
                      setOpMode('manual');
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
                      opMode === 'manual' ? 'bg-sky-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Modo Manual (Mando BT)
                  </button>
                </div>

                {opMode === 'auto' ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleStartAuto}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold whitespace-nowrap transition"
                    >
                      {autoRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {autoRunning ? 'Pausar ciclo' : 'TRABAJAR (Ciclo completo)'}
                    </button>
                    <button
                      onClick={handleResetSimulation}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#080E1A] border border-slate-700 text-slate-300 hover:text-white text-xs font-medium whitespace-nowrap"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      HOME (0°)
                    </button>
                    <button
                      onClick={() => setSimSpeed((s) => (s === 1 ? 2 : 1))}
                      className="px-2.5 py-1.5 rounded-lg bg-[#080E1A] border border-slate-700 text-xs font-mono text-slate-200"
                    >
                      {simSpeed}×
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setSim((p) => ({ ...p, magnetOn: !p.magnetOn }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap ${
                        magnetOn
                          ? 'bg-amber-600 border-amber-500 text-white'
                          : 'bg-[#080E1A] border-slate-700 text-slate-300'
                      }`}
                    >
                      Electroimán M2: {magnetOn ? 'ON (12 V)' : 'OFF'}
                    </button>
                    <button
                      onClick={() => setSim((p) => ({ ...p, bulbOn: !p.bulbOn }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition whitespace-nowrap ${
                        bulbOn
                          ? 'bg-yellow-500/20 border-yellow-400 text-yellow-200'
                          : 'bg-[#080E1A] border-slate-700 text-slate-300'
                      }`}
                    >
                      Bombillo Z8 (M3): {bulbOn ? 'ON' : 'OFF'}
                    </button>
                  </div>
                )}
              </div>

              {/* Regla obligatoria de contrapeso colocado */}
              {opMode === 'auto' && (
                <div className="rounded-lg bg-[#080E1A] border border-slate-800 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="text-slate-300">
                    Contrapeso mínimo requerido en Z4 (d_cp = {dCp} cm):{' '}
                    <strong className="font-mono text-amber-300 tabular-nums">
                      {minCounterweightG ? `${minCounterweightG.toFixed(1)} g` : 'POR CONFIRMAR'}
                    </strong>
                  </div>
                  <label className="inline-flex items-center gap-2 text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={params.counterweightPlaced}
                      onChange={(e) => {
                        onUpdateParams({ counterweightPlaced: e.target.checked });
                        if (e.target.checked) setSafetyAlert(null);
                      }}
                      className="rounded border-slate-600 bg-slate-900 text-emerald-500"
                    />
                    <span>Confirmo contrapeso colocado físicamente en la contrapluma</span>
                  </label>
                </div>
              )}

              {safetyAlert && (
                <div className="rounded-lg bg-rose-950/60 border border-rose-500 px-3.5 py-2.5 text-xs text-rose-100 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{safetyAlert}</span>
                </div>
              )}

              {/* Escenario 3D interactivo (arrastrar para rotar cámara) */}
              <div
                className="relative rounded-xl bg-[#070B14] border border-slate-800 overflow-hidden cursor-grab active:cursor-grabbing select-none"
                onPointerDown={(e) => {
                  dragRef.current = {
                    x: e.clientX,
                    y: e.clientY,
                    yaw: camYaw,
                    pitch: camPitch,
                  };
                }}
                onPointerMove={(e) => {
                  if (!dragRef.current) return;
                  const dx = e.clientX - dragRef.current.x;
                  const dy = e.clientY - dragRef.current.y;
                  setCamYaw(dragRef.current.yaw + dx * 0.45);
                  setCamPitch(Math.max(5, Math.min(82, dragRef.current.pitch + dy * 0.35)));
                }}
                onPointerUp={() => {
                  dragRef.current = null;
                }}
                onPointerLeave={() => {
                  dragRef.current = null;
                }}
              >
                <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
                  {[
                    { label: 'Vista 3D', yaw: 36, pitch: 24 },
                    { label: 'Alzado', yaw: 0, pitch: 6 },
                    { label: 'Planta', yaw: 0, pitch: 82 },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCamYaw(p.yaw);
                        setCamPitch(p.pitch);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-200 font-medium"
                    >
                      {p.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCamZoom((z) => (z >= 1.3 ? 1 : +(z + 0.15).toFixed(2)));
                    }}
                    className="px-2 py-1 rounded bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-300 font-mono"
                  >
                    {Math.round(camZoom * 100)}%
                  </button>
                </div>

                <div className="absolute top-3 right-3 z-10 text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800">
                  Arrastra para rotar en 3D
                </div>

                <svg viewBox="0 0 900 470" className="w-full h-auto block">
                  <defs>
                    <radialGradient id="floorGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#1e293b" stopOpacity="0.65" />
                      <stop offset="100%" stopColor="#070b14" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  <ellipse cx="450" cy="340" rx="340" ry="95" fill="url(#floorGlow)" />

                  {/* Tabla base de la maqueta */}
                  <polygon
                    points={pBoard.map((p) => `${p.sx},${p.sy}`).join(' ')}
                    fill="#111827"
                    stroke="#334155"
                    strokeWidth="2"
                  />

                  {/* Círculo de alcance útil en la base */}
                  {(() => {
                    const ringPts: string[] = [];
                    for (let a = 0; a <= 360; a += 10) {
                      const ar = (a * Math.PI) / 180;
                      const pt = project3D({
                        x: params.rMaxUsefulCm * Math.cos(ar),
                        y: params.rMaxUsefulCm * Math.sin(ar),
                        z: 0.2,
                      });
                      ringPts.push(`${pt.sx.toFixed(1)},${pt.sy.toFixed(1)}`);
                    }
                    return (
                      <polygon
                        points={ringPts.join(' ')}
                        fill="none"
                        stroke="#38bdf8"
                        strokeOpacity="0.28"
                        strokeDasharray="6 4"
                        strokeWidth="1.5"
                      />
                    );
                  })()}

                  {/* Tope HOME θ = 0° en Z2 */}
                  {(() => {
                    const pHome = project3D({ x: 8, y: 0, z: 0.5 });
                    return (
                      <g>
                        <line x1={pMastBot.sx} y1={pMastBot.sy} x2={pHome.sx} y2={pHome.sy} stroke="#10b981" strokeWidth="2" />
                        <text x={pHome.sx + 6} y={pHome.sy + 4} fill="#6ee7b7" fontSize="9.5" fontWeight="700">
                          HOME 0°
                        </text>
                      </g>
                    );
                  })()}

                  {/* Caja de Control Z1 separada sobre la tabla base (NUNCA en contrapluma) */}
                  <g>
                    <polygon
                      points={boxBasePts.map((p) => `${p.sx},${p.sy}`).join(' ')}
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                    />
                    {[0, 1, 2, 3].map((i) => {
                      const j = (i + 1) % 4;
                      return (
                        <polygon
                          key={i}
                          points={`${boxBasePts[i].sx},${boxBasePts[i].sy} ${boxBasePts[j].sx},${boxBasePts[j].sy} ${boxTopPts[j].sx},${boxTopPts[j].sy} ${boxTopPts[i].sx},${boxTopPts[i].sy}`}
                          fill="#1e293b"
                          fillOpacity="0.88"
                          stroke="#38bdf8"
                          strokeWidth="1.2"
                        />
                      );
                    })}
                    <polygon
                      points={boxTopPts.map((p) => `${p.sx},${p.sy}`).join(' ')}
                      fill="#0c4a6e"
                      stroke="#7dd3fc"
                      strokeWidth="1.6"
                    />
                    <text
                      x={(boxTopPts[0].sx + boxTopPts[2].sx) / 2}
                      y={(boxTopPts[0].sy + boxTopPts[2].sy) / 2}
                      textAnchor="middle"
                      fill="#e0f2fe"
                      fontSize="9"
                      fontWeight="700"
                    >
                      Z1 CAJA ({boxL}×{boxW}×{boxH})
                    </text>

                    {/* Manguera Tramo A (22 hilos) desde Caja Z1 hasta interior del mástil Z2 */}
                    <path
                      d={`M ${pBoxCableExit.sx} ${pBoxCableExit.sy} Q ${(pBoxCableExit.sx + pMastBot.sx) / 2} ${Math.max(pBoxCableExit.sy, pMastBot.sy) + 12} ${pMastBot.sx} ${pMastBot.sy}`}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="3.5"
                      strokeDasharray="6 3"
                    />
                  </g>

                  {/* Bodega Z7 (tira LED PIR + batería litio autónoma) */}
                  <g>
                    <polygon
                      points={whPts.map((p) => `${p.sx},${p.sy}`).join(' ')}
                      fill={warehousePirLit ? '#713f12' : '#1e293b'}
                      stroke={warehousePirLit ? '#fde047' : '#eab308'}
                      strokeWidth={warehousePirLit ? 2.8 : 1.8}
                    />
                    <text
                      x={(whPts[0].sx + whPts[2].sx) / 2}
                      y={(whPts[0].sy + whPts[2].sy) / 2 + 16}
                      textAnchor="middle"
                      fill="#fde047"
                      fontSize="9.5"
                      fontWeight="700"
                    >
                      Z7 BODEGA (r={params.warehouseRadiusCm} cm) {warehousePirLit ? '· PIR ON' : ''}
                    </text>
                  </g>

                  {/* Cargas activas sobre el suelo o colgadas del gancho */}
                  {sortedLoads.map((load, idx) => {
                    const isDelivered = deliveredIds.includes(load.id);
                    const isCarried = carriedLoadId === load.id;
                    let lx = load.rCm * Math.cos((load.thetaDeg * Math.PI) / 180);
                    let ly = load.rCm * Math.sin((load.thetaDeg * Math.PI) / 180);
                    let lz = 0.5;
                    if (isCarried) {
                      lx = hookBottom.x;
                      ly = hookBottom.y;
                      lz = Math.max(0.5, hookHeightZCm - 2.4);
                    } else if (isDelivered) {
                      lx = whCenter.x + (idx % 2 === 0 ? -2.2 : 2.2);
                      ly = whCenter.y;
                      lz = 0.8;
                    }
                    const pLoad = project3D({ x: lx, y: ly, z: lz });
                    const pLoadTop = project3D({ x: lx, y: ly, z: lz + 3 });
                    return (
                      <g key={load.id}>
                        <circle
                          cx={pLoad.sx}
                          cy={pLoad.sy}
                          r="9"
                          fill={isCarried ? '#f97316' : isDelivered ? '#10b981' : '#3b82f6'}
                          stroke="#e2e8f0"
                          strokeWidth="1.5"
                        />
                        <circle cx={pLoadTop.sx} cy={pLoadTop.sy} r="5.5" fill="#e2e8f0" />
                        <text x={pLoad.sx} y={pLoad.sy - 13} textAnchor="middle" fill="#f8fafc" fontSize="8.5" fontWeight="700">
                          #{load.order} ({load.massG}g)
                        </text>
                      </g>
                    );
                  })}

                  {/* Mástil hueco Z2 (con manguera verde por dentro) */}
                  <line x1={pMastBot.sx} y1={pMastBot.sy} x2={pMastTop.sx} y2={pMastTop.sy} stroke="#475569" strokeWidth="14" strokeLinecap="round" />
                  <line x1={pMastBot.sx} y1={pMastBot.sy} x2={pMastTop.sx} y2={pMastTop.sy} stroke="#0f172a" strokeWidth="8" strokeLinecap="round" />
                  <line x1={pMastBot.sx} y1={pMastBot.sy} x2={pMastTop.sx} y2={pMastTop.sy} stroke="#22c55e" strokeWidth="2.4" strokeDasharray="5 3" />

                  {/* Rizo en la parte superior del mástil */}
                  <ellipse
                    cx={pMastTop.sx}
                    cy={pMastTop.sy + 10}
                    rx={12 - (thetaDeg / 360) * 3}
                    ry="5"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                  />

                  {/* Cabeza giratoria Z3 */}
                  <rect
                    x={pMastTop.sx - 15}
                    y={pMastTop.sy - 8}
                    width="30"
                    height="16"
                    rx="3"
                    fill="#0284c7"
                    stroke="#bae6fd"
                    strokeWidth="1.5"
                  />

                  {/* Corona Z8 + tirantes */}
                  <line x1={pMastTop.sx - 9} y1={pMastTop.sy - 8} x2={pCoronaTop.sx} y2={pCoronaTop.sy} stroke="#94a3b8" strokeWidth="2" />
                  <line x1={pMastTop.sx + 9} y1={pMastTop.sy - 8} x2={pCoronaTop.sx} y2={pCoronaTop.sy} stroke="#94a3b8" strokeWidth="2" />
                  <line x1={pCoronaTop.sx} y1={pCoronaTop.sy} x2={pBoomEnd.sx} y2={pBoomEnd.sy} stroke="#64748b" strokeWidth="1.5" />
                  <line x1={pCoronaTop.sx} y1={pCoronaTop.sy} x2={pCounterEnd.sx} y2={pCounterEnd.sy} stroke="#64748b" strokeWidth="1.5" />
                  <circle
                    cx={pCoronaTop.sx}
                    cy={pCoronaTop.sy - 4}
                    r={bulbOn ? 7.5 : 5}
                    fill={bulbOn ? '#fde047' : '#713f12'}
                    stroke="#f97316"
                    strokeWidth="2"
                  />

                  {/* Contrapluma + Contrapeso (Z4) */}
                  <line x1={pMastTop.sx} y1={pMastTop.sy} x2={pCounterEnd.sx} y2={pCounterEnd.sy} stroke="#cbd5e1" strokeWidth="5.5" strokeLinecap="round" />
                  <rect
                    x={pCounterweight.sx - 12}
                    y={pCounterweight.sy - 6}
                    width="24"
                    height="16"
                    rx="2"
                    fill={params.counterweightPlaced ? '#475569' : '#7f1d1d'}
                    stroke={params.counterweightPlaced ? '#e2e8f0' : '#f87171'}
                    strokeWidth="1.8"
                  />

                  {/* Pluma principal Z4 */}
                  <line x1={pMastTop.sx} y1={pMastTop.sy} x2={pBoomEnd.sx} y2={pBoomEnd.sy} stroke="#e2e8f0" strokeWidth="6" strokeLinecap="round" />

                  {/* Haz del US-H desde raíz Z3 hasta placa reflectora del carro Z5 */}
                  <line
                    x1={pMastTop.sx}
                    y1={pMastTop.sy + 4}
                    x2={pTrolley.sx}
                    y2={pTrolley.sy}
                    stroke="#38bdf8"
                    strokeWidth="1.4"
                    strokeDasharray="3 3"
                  />

                  {/* Tramo B (9 hilos) colgando hacia Carro Z5 */}
                  <path
                    d={`M ${pMastTop.sx} ${pMastTop.sy + 6} Q ${(pMastTop.sx + pTrolley.sx) / 2} ${(pMastTop.sy + pTrolley.sy) / 2 + 18} ${pTrolley.sx} ${pTrolley.sy}`}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="2"
                  />

                  {/* Carro Z5 + Hall KY-003 */}
                  <rect
                    x={pTrolley.sx - 10}
                    y={pTrolley.sy - 6}
                    width="20"
                    height="12"
                    rx="2"
                    fill={hallTriggered ? '#10b981' : '#0ea5e9'}
                    stroke="#fff"
                    strokeWidth="1.5"
                  />

                  {/* Hilo del gancho + Bloque del gancho Z6 + Electroimán */}
                  <line x1={pTrolley.sx} y1={pTrolley.sy + 6} x2={pHookTop.sx} y2={pHookTop.sy} stroke="#e2e8f0" strokeWidth="2" />
                  <rect
                    x={pHookTop.sx - 8}
                    y={pHookTop.sy}
                    width="16"
                    height={Math.max(12, pHookBot.sy - pHookTop.sy)}
                    rx="3"
                    fill="#1e293b"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                  />
                  {/* Electroimán M2 */}
                  <ellipse
                    cx={pHookBot.sx}
                    cy={pHookBot.sy + 3}
                    rx="8"
                    ry="4"
                    fill={
                      reversePulseActive
                        ? '#ef4444'
                        : magnetOn
                          ? '#f59e0b'
                          : '#475569'
                    }
                    stroke="#fde68a"
                    strokeWidth="1.4"
                  />
                </svg>

                {/* Banner inferior de fase actual */}
                <div className="bg-[#0B1120]/95 border-t border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-emerald-300">
                    {opMode === 'auto'
                      ? PHASE_LABELS[autoPhase]
                      : 'Modo Manual activo: ajusta ángulo θ, radio r y altura z con los controles'}
                  </span>
                  <span className="font-mono text-slate-300 tabular-nums">
                    θ={thetaDeg.toFixed(1)}° · r={trolleyRCm.toFixed(1)} cm · z={hookHeightZCm.toFixed(1)} cm
                  </span>
                </div>
              </div>

              {/* Controles manuales directos cuando está en Modo Manual */}
              {opMode === 'manual' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl bg-[#080E1A] border border-slate-800 p-4 text-xs">
                  <label className="block">
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Giro Cabeza θ (0°–360°)</span>
                      <span className="font-mono text-sky-300 tabular-nums">{thetaDeg.toFixed(0)}°</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={thetaDeg}
                      onChange={(e) => setSim((p) => ({ ...p, thetaDeg: Number(e.target.value) }))}
                      className="w-full accent-sky-500"
                    />
                  </label>

                  <label className="block">
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Carro r ({r0Min}–{params.rMaxUsefulCm} cm)</span>
                      <span className="font-mono text-emerald-300 tabular-nums">{trolleyRCm.toFixed(1)} cm</span>
                    </div>
                    <input
                      type="range"
                      min={r0Min}
                      max={params.rMaxUsefulCm}
                      step="0.5"
                      value={trolleyRCm}
                      onChange={(e) => setSim((p) => ({ ...p, trolleyRCm: Number(e.target.value) }))}
                      className="w-full accent-emerald-500"
                    />
                  </label>

                  <label className="block">
                    <div className="flex justify-between text-slate-300 mb-1">
                      <span>Gancho z (0–{usefulHookH.toFixed(0)} cm)</span>
                      <span className="font-mono text-amber-300 tabular-nums">{hookHeightZCm.toFixed(1)} cm</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={usefulHookH}
                      step="0.5"
                      value={hookHeightZCm}
                      onChange={(e) => setSim((p) => ({ ...p, hookHeightZCm: Number(e.target.value) }))}
                      className="w-full accent-amber-500"
                    />
                  </label>
                </div>
              )}

              {/* Cola de cargas registradas (tablet WiFi) */}
              {sortedLoads.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="text-slate-400 font-medium">Cola de cargas (r, θ, m):</span>
                  {sortedLoads.map((l, idx) => {
                    const isDone = deliveredIds.includes(l.id);
                    const isCarried = carriedLoadId === l.id;
                    const isCurrent = opMode === 'auto' && autoRunning && activeLoadIdx === idx && !isDone;
                    return (
                      <span
                        key={l.id}
                        className={`px-2.5 py-1 rounded-md border font-mono tabular-nums ${
                          isDone
                            ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                            : isCarried || isCurrent
                              ? 'bg-amber-950/60 border-amber-400 text-amber-200'
                              : 'bg-[#080E1A] border-slate-700 text-slate-300'
                        }`}
                      >
                        #{l.order} {l.name}: ({l.rCm} cm, {l.thetaDeg}°, {l.massG} g){' '}
                        {isDone ? '✓ Z7' : isCarried ? '· en gancho' : isCurrent ? '· objetivo' : ''}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Telemetría sincronizada de sensores y consumo 12 V 2 A */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs tabular-nums">
                <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-3">
                  <div className="text-slate-400">US-H (Radio r = d_H + s_H)</div>
                  <div className="font-mono font-bold text-sky-300 mt-0.5">
                    r = {trolleyRCm.toFixed(1)} cm (d_H={usHDistanceCm.toFixed(1)})
                  </div>
                </div>
                <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-3">
                  <div className="text-slate-400">US-V (Δh = d_V − 3,5 cm)</div>
                  <div className="font-mono font-bold text-emerald-300 mt-0.5">
                    Δh = {deltaHCm.toFixed(1)} cm (d_V={usVMeasuredCm.toFixed(1)})
                  </div>
                </div>
                <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-3">
                  <div className="text-slate-400">Finales HOME / Hall</div>
                  <div className="font-mono font-bold text-slate-100 mt-0.5">
                    HOME: {homeTriggered ? 'ACTIVO' : 'libre'} · Hall: {hallTriggered ? 'TOPE' : 'libre'}
                  </div>
                </div>
                <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-3">
                  <div className="text-slate-400">Fuente 12 V (≤ 2,00 A)</div>
                  <div
                    className={`font-mono font-bold mt-0.5 ${
                      estimatedCurrentA <= 2 ? 'text-emerald-300' : 'text-rose-400'
                    }`}
                  >
                    {estimatedCurrentA.toFixed(2)} A ({activeMotorsCount}/2 motores)
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'blueprints' && (
            <div className="space-y-5">
              {/* Plano 1: Alzado Lateral Paramétrico a Escala con Cotas */}
              <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-white">
                    Plano 1. Alzado Lateral Acotado a Escala (Z1–Z8)
                  </h3>
                  <span className="text-xs font-mono text-sky-300 tabular-nums">
                    Mástil {mastH} cm · Pluma {params.boomLengthCm} cm · Contrapluma {params.counterBoomLengthCm} cm
                  </span>
                </div>

                <div className="rounded-lg bg-[#070B14] border border-slate-800 p-3 overflow-x-auto">
                  {(() => {
                    // Dynamic scale mapping cm -> SVG px inside 860x420
                    const totalSpanCm = Math.max(85, params.counterBoomLengthCm + params.boomLengthCm + 32);
                    const totalVertCm = Math.max(68, mastH + 22);
                    const pxPerCm = Math.min(720 / totalSpanCm, 310 / totalVertCm);
                    const groundY = 365;
                    const mastX = 80 + (params.counterBoomLengthCm + 26) * pxPerCm;
                    const mastTopY = groundY - mastH * pxPerCm;
                    const coronaY = groundY - (mastH + 10) * pxPerCm;
                    const boomEndX = mastX + params.boomLengthCm * pxPerCm;
                    const r0X = mastX + r0Min * pxPerCm;
                    const rMaxX = mastX + params.rMaxUsefulCm * pxPerCm;
                    const whX = mastX + params.warehouseRadiusCm * pxPerCm;
                    const counterEndX = mastX - params.counterBoomLengthCm * pxPerCm;
                    const cpX = mastX - dCp * pxPerCm;
                    const trolleyX = mastX + trolleyRCm * pxPerCm;
                    const hookBotY = groundY - Math.max(2, hookHeightZCm) * pxPerCm;
                    const hookTopY = hookBotY - params.hookBlockHeightCm * pxPerCm;

                    return (
                      <svg viewBox="0 0 860 420" className="w-full min-w-[680px] h-auto">
                        {/* Tabla base */}
                        <rect x="20" y={groundY} width="820" height="16" rx="3" fill="#1e293b" stroke="#475569" />

                        {/* Caja de control Z1 separada a la izquierda */}
                        <rect
                          x={Math.max(28, counterEndX - 115)}
                          y={groundY - params.controlBoxHeightCm * pxPerCm}
                          width={Math.min(115, params.controlBoxLengthCm * pxPerCm)}
                          height={params.controlBoxHeightCm * pxPerCm}
                          rx="3"
                          fill="#0c4a6e"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                        />
                        <text
                          x={Math.max(28, counterEndX - 115) + Math.min(115, params.controlBoxLengthCm * pxPerCm) / 2}
                          y={groundY - params.controlBoxHeightCm * pxPerCm - 6}
                          textAnchor="middle"
                          fill="#7dd3fc"
                          fontSize="9"
                          fontWeight="700"
                        >
                          Z1 Caja {params.controlBoxLengthCm}×{params.controlBoxWidthCm}×{params.controlBoxHeightCm} cm
                        </text>

                        {/* Mástil hueco Z2 */}
                        <rect
                          x={mastX - 10}
                          y={mastTopY}
                          width="20"
                          height={mastH * pxPerCm}
                          fill="#1e293b"
                          stroke="#94a3b8"
                          strokeWidth="1.5"
                        />
                        <line x1={mastX} y1={groundY} x2={mastX} y2={mastTopY} stroke="#22c55e" strokeWidth="2.5" strokeDasharray="5 3" />

                        {/* Cota altura mástil */}
                        <line x1={mastX - 28} y1={groundY} x2={mastX - 28} y2={mastTopY} stroke="#38bdf8" strokeWidth="1.2" />
                        <text x={mastX - 34} y={(groundY + mastTopY) / 2} textAnchor="end" fill="#38bdf8" fontSize="9.5" fontWeight="700">
                          h_mástil = {mastH} cm
                        </text>

                        {/* Corona Z8 */}
                        <polygon points={`${mastX},${coronaY} ${mastX - 18},${mastTopY - 8} ${mastX + 18},${mastTopY - 8}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
                        <circle cx={mastX} cy={coronaY} r="6" fill="#fde047" stroke="#f97316" strokeWidth="1.5" />
                        <line x1={mastX} y1={coronaY} x2={boomEndX - 10} y2={mastTopY} stroke="#64748b" strokeWidth="1.2" />
                        <line x1={mastX} y1={coronaY} x2={counterEndX + 8} y2={mastTopY} stroke="#64748b" strokeWidth="1.2" />

                        {/* Cabeza Z3 */}
                        <rect x={mastX - 24} y={mastTopY - 10} width="48" height="20" rx="3" fill="#0369a1" stroke="#7dd3fc" />
                        <text x={mastX} y={mastTopY + 3} textAnchor="middle" fill="#fff" fontSize="8.5" fontWeight="700">Z3</text>

                        {/* Contrapluma y Contrapeso */}
                        <rect
                          x={counterEndX}
                          y={mastTopY - 6}
                          width={Math.max(10, params.counterBoomLengthCm * pxPerCm - 24)}
                          height="12"
                          fill="#334155"
                          stroke="#94a3b8"
                        />
                        <rect x={cpX - 14} y={mastTopY + 6} width="28" height="16" rx="2" fill="#475569" stroke="#e2e8f0" />
                        <text x={cpX} y={mastTopY + 34} textAnchor="middle" fill="#cbd5e1" fontSize="8.5">
                          d_cp={dCp} cm ({minCounterweightG ? `${minCounterweightG.toFixed(0)}g` : '—'})
                        </text>
                        {/* Cota Contrapluma */}
                        <line x1={counterEndX} y1={mastTopY - 22} x2={mastX} y2={mastTopY - 22} stroke="#a78bfa" strokeWidth="1.2" />
                        <text x={(counterEndX + mastX) / 2} y={mastTopY - 27} textAnchor="middle" fill="#c4b5fd" fontSize="9">
                          Contrapluma {params.counterBoomLengthCm} cm
                        </text>

                        {/* Pluma Z4 */}
                        <rect
                          x={mastX + 24}
                          y={mastTopY - 6}
                          width={Math.max(10, params.boomLengthCm * pxPerCm - 24)}
                          height="12"
                          fill="#334155"
                          stroke="#e2e8f0"
                        />
                        <line x1={mastX} y1={mastTopY - 22} x2={boomEndX} y2={mastTopY - 22} stroke="#34d399" strokeWidth="1.2" />
                        <text x={(mastX + boomEndX) / 2} y={mastTopY - 27} textAnchor="middle" fill="#6ee7b7" fontSize="9.5" fontWeight="700">
                          Pluma {params.boomLengthCm} cm (útil r₀={r0Min} → r_máx={params.rMaxUsefulCm} cm)
                        </text>

                        {/* Marcadores r0 y rMax útil */}
                        <line x1={r0X} y1={mastTopY + 8} x2={r0X} y2={groundY} stroke="#64748b" strokeDasharray="3 3" strokeWidth="1" />
                        <text x={r0X} y={groundY + 28} textAnchor="middle" fill="#94a3b8" fontSize="8.5">r₀={r0Min}</text>
                        <line x1={rMaxX} y1={mastTopY + 8} x2={rMaxX} y2={groundY} stroke="#38bdf8" strokeDasharray="3 3" strokeWidth="1" />
                        <text x={rMaxX} y={groundY + 28} textAnchor="middle" fill="#7dd3fc" fontSize="8.5">r_máx={params.rMaxUsefulCm}</text>

                        {/* Carro Z5 y Bloque Gancho Z6 */}
                        <rect x={trolleyX - 14} y={mastTopY + 6} width="28" height="12" rx="2" fill="#0ea5e9" stroke="#fff" />
                        <line x1={trolleyX} y1={mastTopY + 18} x2={trolleyX} y2={hookTopY} stroke="#cbd5e1" strokeWidth="1.5" />
                        <rect x={trolleyX - 11} y={hookTopY} width="22" height={Math.max(14, hookBotY - hookTopY)} rx="2" fill="#1e293b" stroke="#f97316" strokeWidth="1.4" />
                        <text x={trolleyX + 16} y={(hookTopY + hookBotY) / 2 + 3} fill="#fdba74" fontSize="8.5">
                          Bloque {params.hookBlockHeightCm} cm · US-V (e=3,5 cm)
                        </text>

                        {/* Bodega Z7 */}
                        <rect x={whX - 24} y={groundY - 12} width="48" height="12" rx="2" fill="#422006" stroke="#eab308" strokeWidth="1.5" />
                        <text x={whX} y={groundY - 16} textAnchor="middle" fill="#fde047" fontSize="8.5" fontWeight="700">
                          Z7 Bodega ({params.warehouseRadiusCm} cm)
                        </text>
                      </svg>
                    );
                  })()}
                </div>
              </div>

              {/* Plano 2: Planta Polar Superior (r, θ) con Barrido Contrapluma vs Caja Z1 */}
              <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-white">
                    Plano 2. Planta Superior Polar (r, θ) — Zonas, Alcance y Verificación de Colisión
                  </h3>
                  <span className="text-xs text-slate-400">
                    Giro limitado 0°–360° (topes físicos en Z2/Z3)
                  </span>
                </div>
                <div className="rounded-lg bg-[#070B14] border border-slate-800 p-3 flex justify-center">
                  {(() => {
                    const cx = 290;
                    const cy = 200;
                    const scale = 165 / Math.max(52, params.boomLengthCm + 8);
                    const boomR = params.boomLengthCm * scale;
                    const maxUsefulR = params.rMaxUsefulCm * scale;
                    const r0Px = r0Min * scale;
                    const counterR = params.counterBoomLengthCm * scale;
                    const whPx = params.warehouseRadiusCm * scale;
                    const ang = (thetaDeg * Math.PI) / 180;
                    const whAng = (warehouseAngleDeg * Math.PI) / 180;

                    return (
                      <svg viewBox="0 0 580 400" className="w-full max-w-2xl h-auto">
                        {/* Tabla base cuadrada */}
                        <rect x="35" y="15" width="510" height="370" rx="10" fill="#0f172a" stroke="#334155" strokeWidth="1.8" />

                        {/* Caja de control Z1 fija en esquina superior izquierda de la tabla */}
                        <rect
                          x="48"
                          y="28"
                          width={Math.max(54, params.controlBoxLengthCm * scale)}
                          height={Math.max(40, params.controlBoxWidthCm * scale)}
                          rx="4"
                          fill="#0c4a6e"
                          stroke="#38bdf8"
                          strokeWidth="1.5"
                        />
                        <text
                          x={48 + Math.max(54, params.controlBoxLengthCm * scale) / 2}
                          y={28 + Math.max(40, params.controlBoxWidthCm * scale) / 2 + 3}
                          textAnchor="middle"
                          fill="#e0f2fe"
                          fontSize="8.5"
                          fontWeight="700"
                        >
                          Z1 Caja
                        </text>

                        {/* Círculos de alcance */}
                        <circle cx={cx} cy={cy} r={boomR} fill="none" stroke="#475569" strokeDasharray="6 4" strokeWidth="1.5" />
                        <circle cx={cx} cy={cy} r={maxUsefulR} fill="#0ea5e9" fillOpacity="0.06" stroke="#38bdf8" strokeWidth="1.5" />
                        <circle cx={cx} cy={cy} r={counterR} fill="none" stroke="#a855f7" strokeDasharray="4 4" strokeWidth="1.2" />
                        <circle cx={cx} cy={cy} r={r0Px} fill="#070b14" stroke="#64748b" strokeWidth="1.2" />

                        {/* Línea HOME θ = 0° */}
                        <line x1={cx} y1={cy} x2={cx + boomR + 12} y2={cy} stroke="#10b981" strokeDasharray="3 3" strokeWidth="1.2" />
                        <text x={cx + boomR + 16} y={cy + 3} fill="#6ee7b7" fontSize="9" fontWeight="700">HOME 0° / 360°</text>

                        {/* Bodega Z7 */}
                        <rect
                          x={cx + whPx * Math.cos(whAng) - 16}
                          y={cy - whPx * Math.sin(whAng) - 16}
                          width="32"
                          height="32"
                          rx="4"
                          fill="#422006"
                          stroke="#eab308"
                          strokeWidth="1.8"
                        />
                        <text
                          x={cx + whPx * Math.cos(whAng)}
                          y={cy - whPx * Math.sin(whAng) + 3}
                          textAnchor="middle"
                          fill="#fde047"
                          fontSize="8.5"
                          fontWeight="700"
                        >
                          Z7
                        </text>

                        {/* Cargas activas */}
                        {sortedLoads.map((l) => {
                          const lr = l.rCm * scale;
                          const la = (l.thetaDeg * Math.PI) / 180;
                          return (
                            <g key={l.id}>
                              <circle cx={cx + lr * Math.cos(la)} cy={cy - lr * Math.sin(la)} r="7" fill="#3b82f6" stroke="#fff" />
                              <text x={cx + lr * Math.cos(la) + 10} y={cy - lr * Math.sin(la) + 3} fill="#93c5fd" fontSize="8.5">
                                #{l.order} ({l.rCm}cm, {l.thetaDeg}°)
                              </text>
                            </g>
                          );
                        })}

                        {/* Pluma y contrapluma en planta */}
                        <line
                          x1={cx - counterR * Math.cos(ang)}
                          y1={cy + counterR * Math.sin(ang)}
                          x2={cx + boomR * Math.cos(ang)}
                          y2={cy - boomR * Math.sin(ang)}
                          stroke="#e2e8f0"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                        />
                        <circle cx={cx} cy={cy} r="10" fill="#0284c7" stroke="#bae6fd" strokeWidth="1.5" />
                        <circle
                          cx={cx + trolleyRCm * scale * Math.cos(ang)}
                          cy={cy - trolleyRCm * scale * Math.sin(ang)}
                          r="6"
                          fill="#f97316"
                          stroke="#fff"
                        />
                      </svg>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {view === 'cutlist' && (
            <div className="rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-bold text-white">
                    Despiece Estructural y Plantilla de Fabricación (según tus medidas editadas)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Cambia cualquier dimensión en el panel derecho y esta lista de corte se recalcula automáticamente para armar la maqueta en madera/MDF/cartulina.
                  </p>
                </div>
                <StatusChip
                  status={
                    cutListRows.every((r) => !r.pending) ? 'CONFIRMADO' : 'POR CONFIRMAR'
                  }
                />
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-[#0B1120] text-slate-400">
                    <tr>
                      <th className="py-2 px-3">Zona</th>
                      <th className="py-2 px-3">Pieza física</th>
                      <th className="py-2 px-3 text-center">Cant.</th>
                      <th className="py-2 px-3">Medidas exactas calculadas</th>
                      <th className="py-2 px-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-slate-200 tabular-nums">
                    {cutListRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/60">
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-300">{row.zone}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{row.part}</td>
                        <td className="py-2.5 px-3 text-center font-mono">{row.qty}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">{row.spec}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[11px] font-semibold ${
                              row.pending ? 'text-amber-300' : 'text-sky-300'
                            }`}
                          >
                            {row.pending ? 'POR CONFIRMAR' : 'Medida del usuario'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumen cinemático acoplado a las dimensiones actuales */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs tabular-nums">
                <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-3">
                  <div className="text-slate-400">Resolución Giro (FC-33 #1)</div>
                  <div className="font-mono font-bold text-emerald-300 mt-1">
                    {resGiroDeg ? `${resGiroDeg.toFixed(2)} °/pulso` : 'POR CONFIRMAR'}
                  </div>
                </div>
                <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-3">
                  <div className="text-slate-400">Resolución Carro (FC-33 #2)</div>
                  <div className="font-mono font-bold text-emerald-300 mt-1">
                    {resCarroMm ? `${resCarroMm.toFixed(2)} mm/pulso` : 'POR CONFIRMAR'}
                  </div>
                </div>
                <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-3">
                  <div className="text-slate-400">Resolución Gancho (FC-33 #3)</div>
                  <div className="font-mono font-bold text-emerald-300 mt-1">
                    {resGanchoMm ? `${resGanchoMm.toFixed(2)} mm/pulso` : 'POR CONFIRMAR'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA: Panel Completo de Dimensiones Editables */}
        <div className="xl:col-span-4 rounded-xl bg-[#0F172A] border border-slate-800 p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              Dimensiones Editables de la Grúa
            </h3>
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="text-[11px] text-slate-400 hover:text-white underline whitespace-nowrap"
            >
              Restablecer valores
            </button>
          </div>

          <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-3 text-[11px] text-slate-300 leading-relaxed">
            <span className="font-semibold text-emerald-300 inline-flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Medidas libres del constructor
            </span>
            <p className="text-slate-400 mt-0.5">
              Todas las cotas físicas las decides tú sin validación. Los campos vacíos (N, D, i, H_mástil, r₀, d_cp) quedan como <strong className="text-amber-300">POR CONFIRMAR</strong>.
            </p>
          </div>

          {/* Sub-pestañas del panel de dimensiones */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#080E1A] border border-slate-800 text-[11px]">
            <button
              onClick={() => setDimGroup('structure')}
              className={`py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1 whitespace-nowrap transition ${
                dimGroup === 'structure' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Compass className="w-3 h-3" />
              Estructura
            </button>
            <button
              onClick={() => setDimGroup('enclosures')}
              className={`py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1 whitespace-nowrap transition ${
                dimGroup === 'enclosures' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Box className="w-3 h-3" />
              Cajas Z1/Z3
            </button>
            <button
              onClick={() => setDimGroup('encoders')}
              className={`py-1.5 px-2 rounded font-medium flex items-center justify-center gap-1 whitespace-nowrap transition ${
                dimGroup === 'encoders' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sliders className="w-3 h-3" />
              Discos/Tambores
            </button>
          </div>

          {dimGroup === 'structure' && (
            <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
              <label className="block">
                <span className="text-slate-300">Altura mástil (cm)</span>
                <input
                  type="number"
                  min={1}
                  step="1"
                  placeholder="POR CONFIRMAR"
                  value={params.mastHeightCm ?? ''}
                  onChange={(e) =>
                    onUpdateParams({ mastHeightCm: e.target.value ? Number(e.target.value) : null })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Lado int. mástil (mm)</span>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={params.mastInnerSideMm}
                  onChange={(e) =>
                    onUpdateParams({ mastInnerSideMm: Number(e.target.value) || 20 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Largo pluma (cm)</span>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={params.boomLengthCm}
                  onChange={(e) =>
                    onUpdateParams({ boomLengthCm: Number(e.target.value) || 20 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Radio máx. útil (cm)</span>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={params.rMaxUsefulCm}
                  onChange={(e) =>
                    onUpdateParams({ rMaxUsefulCm: Number(e.target.value) || 15 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Radio mín. r₀ (cm)</span>
                <input
                  type="number"
                  min={1}
                  step="0.5"
                  placeholder="POR CONFIRMAR"
                  value={params.r0MinCm ?? ''}
                  onChange={(e) =>
                    onUpdateParams({ r0MinCm: e.target.value ? Number(e.target.value) : null })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Radio bodega Z7 (cm)</span>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={params.warehouseRadiusCm}
                  onChange={(e) =>
                    onUpdateParams({ warehouseRadiusCm: Number(e.target.value) || 10 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Contrapluma (cm)</span>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={params.counterBoomLengthCm}
                  onChange={(e) =>
                    onUpdateParams({ counterBoomLengthCm: Number(e.target.value) || 15 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Dist. contrapeso d_cp (cm)</span>
                <input
                  type="number"
                  min={1}
                  step="0.5"
                  placeholder="POR CONFIRMAR"
                  value={params.counterweightDistDcpCm ?? ''}
                  onChange={(e) =>
                    onUpdateParams({
                      counterweightDistDcpCm: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Bloque gancho Z6 (cm)</span>
                <input
                  type="number"
                  min={3}
                  step="0.5"
                  value={params.hookBlockHeightCm}
                  onChange={(e) =>
                    onUpdateParams({ hookBlockHeightCm: Number(e.target.value) || 5 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Margen Hall (cm)</span>
                <input
                  type="number"
                  min={2}
                  step="0.5"
                  value={params.hallMarginCm}
                  onChange={(e) =>
                    onUpdateParams({ hallMarginCm: Number(e.target.value) || 3 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block col-span-2">
                <span className="text-slate-300">Ángulo visual de Bodega Z7 en simulador (°)</span>
                <input
                  type="number"
                  min={0}
                  max={359}
                  value={warehouseAngleDeg}
                  onChange={(e) => setWarehouseAngleDeg(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
            </div>
          )}

          {dimGroup === 'enclosures' && (
            <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
              <label className="block">
                <span className="text-slate-300">Caja Z1 Largo (cm)</span>
                <input
                  type="number"
                  min={18}
                  step="0.5"
                  value={params.controlBoxLengthCm}
                  onChange={(e) =>
                    onUpdateParams({ controlBoxLengthCm: Number(e.target.value) || 20 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Caja Z1 Ancho (cm)</span>
                <input
                  type="number"
                  min={14}
                  step="0.5"
                  value={params.controlBoxWidthCm}
                  onChange={(e) =>
                    onUpdateParams({ controlBoxWidthCm: Number(e.target.value) || 15 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Caja Z1 Alto (cm)</span>
                <input
                  type="number"
                  min={6}
                  step="0.5"
                  value={params.controlBoxHeightCm}
                  onChange={(e) =>
                    onUpdateParams({ controlBoxHeightCm: Number(e.target.value) || 8 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Ø haz 22 hilos (mm)</span>
                <input
                  type="number"
                  min={6}
                  step="0.5"
                  value={params.harnessOuterDiameterMm}
                  onChange={(e) =>
                    onUpdateParams({ harnessOuterDiameterMm: Number(e.target.value) || 10 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Cabeza Z3 Ancho (mm)</span>
                <input
                  type="number"
                  min={90}
                  step="5"
                  value={params.headWidthMm}
                  onChange={(e) =>
                    onUpdateParams({ headWidthMm: Number(e.target.value) || 100 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Cabeza Z3 Fondo (mm)</span>
                <input
                  type="number"
                  min={70}
                  step="5"
                  value={params.headDepthMm}
                  onChange={(e) =>
                    onUpdateParams({ headDepthMm: Number(e.target.value) || 80 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block col-span-2">
                <span className="text-slate-300">Reserva rizo giro (≥ 40 cm)</span>
                <input
                  type="number"
                  min={30}
                  step="1"
                  value={params.rizoReserveCm}
                  onChange={(e) =>
                    onUpdateParams({ rizoReserveCm: Number(e.target.value) || 40 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
            </div>
          )}

          {dimGroup === 'encoders' && (
            <div className="grid grid-cols-2 gap-3 text-xs tabular-nums">
              <label className="block">
                <span className="text-slate-300">Ø Tambor Carro (cm)</span>
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  placeholder="POR CONFIRMAR"
                  value={params.drumDiameterCarroCm ?? ''}
                  onChange={(e) =>
                    onUpdateParams({
                      drumDiameterCarroCm: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Ø Tambor Gancho (cm)</span>
                <input
                  type="number"
                  step="0.1"
                  min={0.1}
                  placeholder="POR CONFIRMAR"
                  value={params.drumDiameterGanchoCm ?? ''}
                  onChange={(e) =>
                    onUpdateParams({
                      drumDiameterGanchoCm: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Ranuras N Giro</span>
                <input
                  type="number"
                  min={1}
                  placeholder="POR CONFIRMAR"
                  value={params.slotsGiroN ?? ''}
                  onChange={(e) =>
                    onUpdateParams({ slotsGiroN: e.target.value ? Number(e.target.value) : null })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Ranuras N Carro / Gancho</span>
                <div className="grid grid-cols-2 gap-1 mt-1">
                  <input
                    type="number"
                    min={1}
                    placeholder="POR CONFIRMAR"
                    aria-label="N carro"
                    value={params.slotsCarroN ?? ''}
                    onChange={(e) =>
                      onUpdateParams({
                        slotsCarroN: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2 py-1.5 text-white"
                  />
                  <input
                    type="number"
                    min={1}
                    placeholder="POR CONFIRMAR"
                    aria-label="N gancho"
                    value={params.slotsGanchoN ?? ''}
                    onChange={(e) =>
                      onUpdateParams({
                        slotsGanchoN: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2 py-1.5 text-white"
                  />
                </div>
              </label>
              <label className="block">
                <span className="text-slate-300">Ø Disco FC-33 (mm)</span>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={params.encoderDiskDiameterMm}
                  onChange={(e) =>
                    onUpdateParams({ encoderDiskDiameterMm: Number(e.target.value) || 30 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block">
                <span className="text-slate-300">Ancho ranura (mm)</span>
                <input
                  type="number"
                  min={1}
                  step="0.5"
                  value={params.encoderSlotWidthMm}
                  onChange={(e) =>
                    onUpdateParams({ encoderSlotWidthMm: Number(e.target.value) || 4 })
                  }
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block col-span-2">
                <span className="text-slate-300">Opción transmisión de giro</span>
                <select
                  value={params.gearOptionGiro}
                  onChange={(e) => {
                    const opt = e.target.value as UserEditableParams['gearOptionGiro'];
                    onUpdateParams({
                      gearOptionGiro: opt,
                      gearRatioGiroI:
                        opt === 'A_PINON_CORONA' && params.pinionDiameterMm > 0
                          ? Number((params.crownDiameterMm / params.pinionDiameterMm).toFixed(2))
                          : null,
                    });
                  }}
                  className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                >
                  <option value="B_RUEDA_FRICCION">Opción B: Rueda fricción + seguidora</option>
                  <option value="A_PINON_CORONA">Opción A: Piñón / Corona</option>
                </select>
              </label>
              {params.gearOptionGiro === 'A_PINON_CORONA' ? (
                <>
                  <label className="block">
                    <span className="text-slate-300">Ø Piñón (mm)</span>
                    <input
                      type="number"
                      min={1}
                      step="0.5"
                      value={params.pinionDiameterMm}
                      onChange={(e) =>
                        onUpdateParams({ pinionDiameterMm: Number(e.target.value) || 10 })
                      }
                      className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-slate-300">Ø Corona (mm)</span>
                    <input
                      type="number"
                      min={1}
                      step="1"
                      value={params.crownDiameterMm}
                      onChange={(e) =>
                        onUpdateParams({ crownDiameterMm: Number(e.target.value) || 36 })
                      }
                      className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                    />
                  </label>
                </>
              ) : (
                <label className="block col-span-2">
                  <span className="text-slate-300">Relación efectiva i (Opción B)</span>
                  <input
                    type="number"
                    step="0.1"
                    min={0.1}
                    placeholder="POR CONFIRMAR"
                    value={params.gearRatioGiroI ?? ''}
                    onChange={(e) =>
                      onUpdateParams({
                        gearRatioGiroI: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="mt-1 w-full rounded-lg bg-[#0B1120] border border-slate-700 px-2.5 py-1.5 text-white"
                  />
                </label>
              )}
            </div>
          )}

          {/* Resumen instantáneo debajo del editor de dimensiones */}
          <div className="rounded-lg bg-[#080E1A] border border-slate-800 p-3.5 space-y-1.5 text-xs tabular-nums">
            <div className="font-semibold text-slate-200">Resumen calculado en vivo</div>
            <div className="flex justify-between text-slate-400">
              <span>Altura útil gancho:</span>
              <strong className="font-mono text-emerald-300">
                {params.mastHeightCm !== null ? `${usefulHookH.toFixed(1)} cm` : 'POR CONFIRMAR'}
              </strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Ocupación mástil hueco:</span>
              <strong className="font-mono text-sky-300">
                {mastFillPct.toFixed(1)} %
              </strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Longitud manguera Tramo A:</span>
              <strong className="font-mono text-sky-300">
                {baseTramoACm ? `${baseTramoACm} cm` : 'POR CONFIRMAR'}
              </strong>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Contrapeso mínimo Z4:</span>
              <strong className="font-mono text-amber-300">
                {minCounterweightG ? `${minCounterweightG.toFixed(1)} g` : 'POR CONFIRMAR'}
              </strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
