import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  GoogleGenAI,
  ThinkingLevel,
  Type,
  type Content,
  type FunctionDeclaration,
} from '@google/genai';
import {
  toolBuscarPaso,
  toolCompatibilidadVoltaje,
  toolConexionesDe,
  toolConsultarPin,
  toolContrapeso,
  toolResolucion,
} from './src/utils/advisorTools.ts';
import type { CraneProjectJson } from './src/types/crane.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

const ADVISOR_TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'consultar_pin',
    description: 'Consulta la asignación exacta de un pin en ESP32 o Arduino UNO dentro de project.json y verifica si está reservado por el Shield L293D.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        placa: { type: Type.STRING, description: 'Nombre de placa: ESP32 o UNO' },
        pin: { type: Type.STRING, description: 'Pin exacto, ej. D18, D33, A1, D12' },
      },
      required: ['placa', 'pin'],
    },
  },
  {
    name: 'conexiones_de',
    description: 'Devuelve todas las conexiones, pines, divisores de tensión, coordenadas de protoboard y colores de cable de un componente (ej. Hall, US-V, US-H, L298N, OLED A, LCD 1602, PARO).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        componente: { type: Type.STRING, description: 'Nombre o código del componente' },
      },
      required: ['componente'],
    },
  },
  {
    name: 'resolucion',
    description: 'Calcula la resolución exacta de un encoder FC-33 con interrupciones CHANGE (2 * N flancos por vuelta).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        N: { type: Type.NUMBER, description: 'Número de ranuras del disco' },
        D: { type: Type.NUMBER, description: 'Diámetro del tambor en cm (opcional, para lineal carro/gancho)' },
        i: { type: Type.NUMBER, description: 'Relación de transmisión/engranajes (opcional, para giro)' },
      },
      required: ['N'],
    },
  },
  {
    name: 'contrapeso',
    description: 'Calcula el contrapeso mínimo seguro m_cp = 1.1 * max(m_i * r_i) / d_cp.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        masas: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'Masas en gramos' },
        radios: { type: Type.ARRAY, items: { type: Type.NUMBER }, description: 'Radios en cm' },
        d_cp: { type: Type.NUMBER, description: 'Distancia del contrapeso en contrapluma en cm' },
      },
      required: ['masas', 'radios', 'd_cp'],
    },
  },
  {
    name: 'compatibilidad_voltaje',
    description: 'Verifica si conectar un origen eléctrico a un destino es seguro o si requiere divisor de tensión 1 kΩ + 2 kΩ.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        origen: { type: Type.STRING, description: 'Origen y voltaje, ej. US-V ECHO 5V' },
        destino: { type: Type.STRING, description: 'Destino, ej. ESP32 D18' },
      },
      required: ['origen', 'destino'],
    },
  },
  {
    name: 'buscar_paso',
    description: 'Busca pasos exactos en la guía de montaje E0–E12 con origen, destino, coordenada P1/P2 y lectura de multímetro.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        texto: { type: Type.STRING, description: 'Palabra clave a buscar, ej. Divisor #4, Hall, OLED B, M1' },
      },
      required: ['texto'],
    },
  },
];

function executeAdvisorTool(name: string, args: Record<string, unknown>, project: CraneProjectJson) {
  switch (name) {
    case 'consultar_pin':
      return toolConsultarPin(project, String(args.placa ?? 'ESP32'), String(args.pin ?? ''));
    case 'conexiones_de':
      return toolConexionesDe(project, String(args.componente ?? ''));
    case 'resolucion':
      return toolResolucion(
        Number(args.N ?? 0),
        args.D != null ? Number(args.D) : null,
        args.i != null ? Number(args.i) : null
      );
    case 'contrapeso':
      return toolContrapeso(
        Array.isArray(args.masas) ? args.masas.map(Number) : [],
        Array.isArray(args.radios) ? args.radios.map(Number) : [],
        Number(args.d_cp ?? 0)
      );
    case 'compatibilidad_voltaje':
      return toolCompatibilidadVoltaje(String(args.origen ?? ''), String(args.destino ?? ''));
    case 'buscar_paso':
      return toolBuscarPaso(String(args.texto ?? ''));
    default:
      return { error: `Herramienta desconocida: ${name}` };
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, geminiConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

app.post('/api/advisor', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: 'El servicio de Asesor IA no está disponible en este momento porque falta configurar la clave en el entorno del servidor.',
      });
    }

    const {
      message,
      mode = 'sencillo',
      activeTab = 'home',
      activeStepTitle = '',
      history = [],
      projectJson,
      imageBase64,
      imageMimeType,
    } = req.body as {
      message: string;
      mode?: 'sencillo' | 'tecnico';
      activeTab?: string;
      activeStepTitle?: string;
      history?: { role: 'user' | 'assistant'; text: string }[];
      projectJson: CraneProjectJson;
      imageBase64?: string;
      imageMimeType?: string;
    };

    if (!message || !projectJson) {
      return res.status(400).json({ error: 'Falta el mensaje o el estado project.json.' });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const systemInstruction = `Eres «Asesor Crane», el ingeniero mecatrónico asistente integrado en Crane Studio.
REGLAS ESTRICTAS:
1. Idioma: Español claro. Modo activo: ${mode === 'sencillo' ? 'SENCILLO (explica cada término técnico entre paréntesis la primera vez, como para una persona sin experiencia)' : 'TÉCNICO (preciso y directo para ingeniería)'}.
2. Fuente única de verdad: usa SIEMPRE las herramientas (consultar_pin, conexiones_de, resolucion, contrapeso, compatibilidad_voltaje, buscar_paso) y el JSON del proyecto adjunto. NUNCA inventes datos ni versiones de librerías. Si algo falta o es null, di explícitamente "no lo sé con certeza" o marca "POR CONFIRMAR" indicando qué medir o fotografiar.
3. Cita SIEMPRE la fuente en tu respuesta (ej. "Fuente: Lámina 5, Paso E6.3, Calibración").
4. Si la pregunta toca 12 V, 5 V cerca del ESP32, polaridad o alimentación por USB + R2 simultánea, empieza con una advertencia clara de seguridad eléctrica.
5. Si sugieres cambiar un parámetro o pin en project.json, nunca apliques cambios por tu cuenta: describe el cambio y opcionalmente añade al final un bloque JSON exactamente así:
\`\`\`patch
{"description":"...","paramsPatch":{},"pinPatches":[{"id":"PA..","pin":"D.."}]}
\`\`\`
6. Si recibes una foto del usuario, compárala con el paso o circuito activo ("${activeStepTitle || activeTab}"), indica qué ves bien, qué está sospechoso, tu nivel de confianza (Alto/Medio/Bajo) y recuerda al usuario que la inspección por foto no es exhaustiva y debe verificarse con multímetro.
7. NUNCA uses frases como "ver arriba", "como antes" o "según corresponda".

Resumen rápido de calibración y red actual (project.json):
- Pestaña activa: ${activeTab} ${activeStepTitle ? `| Paso activo: ${activeStepTitle}` : ''}
- Red WiFi AP: ${projectJson.network.wifiSsid} (${projectJson.network.apIp})
- Offset US-V: e = ${projectJson.calibration.usVOffsetECm} cm (lateral 2.5 cm)
- Arduino UNO Shield reservados: D3–D8, D11, D12
- ESP32 pines con divisor 3×1 kΩ (5V->3,33V): ECHO US-H (Div #1), ECHO US-V (Div #2), UNO A1->D2 (Div #3 + jumper desmontable), Hall KY-003 S (Div #4).
- Librerías Arduino UNO: Adafruit Motor Shield library (V1, AFMotor.h) + LiquidCrystal I2C (Frank de Brabander) + integradas SoftwareSerial y Wire.`;

    const contents: Content[] = [];
    for (const h of history.slice(-6)) {
      contents.push({
        role: h.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: h.text }],
      });
    }

    const userParts: Content['parts'] = [{ text: message }];
    if (imageBase64 && imageMimeType) {
      userParts.push({
        inlineData: {
          mimeType: imageMimeType,
          data: imageBase64,
        },
      });
    }
    contents.push({ role: 'user', parts: userParts });

    const toolsUsed: string[] = [];
    let finalText = '';

    for (let turn = 0; turn < 5; turn++) {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          tools: [{ functionDeclarations: ADVISOR_TOOL_DECLARATIONS }],
        },
      });

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        const modelContent = response.candidates?.[0]?.content;
        if (modelContent) {
          contents.push(modelContent);
        }
        const responseParts = functionCalls.map((fc) => {
          const fnName = fc.name || '';
          toolsUsed.push(fnName);
          const result = executeAdvisorTool(
            fnName,
            (fc.args as Record<string, unknown>) || {},
            projectJson
          );
          return {
            functionResponse: {
              name: fnName,
              id: fc.id,
              response: result,
            },
          };
        });
        contents.push({ role: 'user', parts: responseParts });
        continue;
      }

      finalText = response.text || '';
      break;
    }

    if (!finalText) {
      finalText = 'No pude completar la respuesta con los datos recibidos. Por favor reformula tu consulta.';
    }

    return res.json({
      text: finalText,
      toolCallsUsed: Array.from(new Set(toolsUsed)),
    });
  } catch (err) {
    console.error('Error en /api/advisor:', err);
    return res.status(500).json({
      error: 'Ocurrió un error al consultar al Asesor Crane. Verifica tu conexión o intenta de nuevo.',
    });
  }
});

async function startServer() {
  const PORT = Number(process.env.PORT || 3000);
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Crane Engineering Studio escuchando en http://0.0.0.0:${PORT}`);
  });
}

startServer();
