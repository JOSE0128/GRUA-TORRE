import type { AssemblyStage } from '../types/crane.ts';

export const ASSEMBLY_STAGES: AssemblyStage[] = [
  {
    id: 'E0',
    code: 'E0',
    title: 'E0. Preparación, retiro de puentes y medición previa',
    objective:
      'Retirar los puentes físicos obligatorios del Shield L293D y del L298N, y medir con multímetro las 13 resistencias de 1 kΩ, los 4 pulsadores y el interruptor antes de cablear.',
    simpleSummary:
      'Antes de conectar cables, quitamos cuatro capuchones de plástico que no deben estar puestos y probamos que todas las piezas pequeñas funcionen bien.',
    connectList: [
      'Retirar jumper PWR del Shield L293D',
      'Retirar jumpers 5V-EN, ENA y ENB del L298N',
      'Medir 13 resistencias de 1 kΩ, 4 pulsadores e interruptor',
    ],
    doNotConnectYet: [
      'NO enchufes ninguna fuente a la pared.',
      'NO conectes el ESP32 ni el Arduino UNO al computador ni a las protoboards.',
    ],
    stageTest:
      'Comprobar con multímetro en ohmios/continuidad que cada resistencia mide 0,95–1,05 kΩ y que cada pulsador solo cierra al oprimirse.',
    ifFails:
      'Si un pulsador pita todo el tiempo sin presionarlo, prueba con el par de patas en diagonal.',
    steps: [
      {
        id: 'E0-S1',
        stepNumber: 1,
        title: 'Retirar el puente plástico «PWR» del Shield L293D',
        tableItems: [{ item: 'Shield de motores L293D', qty: '1' }],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Extrae con los dedos o pinza el capuchón plástico negro marcado «PWR» junto a la bornera EXT_PWR del Shield L293D y guárdalo en la bolsa de repuestos.',
        origin: 'Shield L293D — Pin header «PWR»',
        destination: 'Bolsa de repuestos (quitar puente)',
        jumperType: 'Verificación física',
        wireColor: 'Sin cable (acción mecánica)',
        simpleExplanation:
          'Quitamos este taponcito negro para que la corriente fuerte de 12 V de los motores no se meta dentro del Arduino de 5 V.',
        highlightZone: 'Z1',
        highlightNodes: ['SHIELD PWR', 'BOLSA REPUESTO'],
        multimeterTest: {
          probes: 'Con el shield suelto, coloca las puntas en los 2 pines donde estaba el capuchón PWR',
          scale: 'Continuidad (pitido)',
          expected: 'OL (circuito abierto, sin pitido)',
          ifFails: 'Revisa que no haya quedado otro puente o rebaba metálica tocando los dos pines de PWR.',
        },
      },
      {
        id: 'E0-S2',
        stepNumber: 2,
        title: 'Retirar los 3 puentes del L298N («5V-EN», «ENA» y «ENB»)',
        tableItems: [{ item: 'Módulo puente H L298N rojo', qty: '1' }],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Extrae del módulo L298N los tres capuchones plásticos marcados «5V-EN», «ENA» y «ENB» para dejar libres los pines de control PWM y aislar el regulador interno.',
        origin: 'L298N — Pines 5V-EN, ENA y ENB',
        destination: 'Bolsa de repuestos (3 capuchones retirados)',
        jumperType: 'Verificación física',
        wireColor: 'Sin cable (acción mecánica)',
        simpleExplanation:
          'Quitamos tres tapitas del módulo rojo para poder controlar la velocidad de los motores desde el ESP32 y usar nuestra propia fuente de 5 V.',
        highlightZone: 'Z1',
        highlightNodes: ['L298N 5V-EN/ENA/ENB', 'PINES LIBRES'],
        multimeterTest: {
          probes: 'Inspección visual de los 3 pares de pines (5V-EN detrás de bornera, ENA y ENB en fila frontal)',
          scale: 'Continuidad (pitido)',
          expected: 'Pines descubiertos y sin puente entre sí (OL en ENA/ENB respecto a 5V)',
          ifFails: 'Tira suavemente hacia arriba de cada capuchón plástico hasta descubrir ambos pines metálicos.',
        },
      },
      {
        id: 'E0-S3',
        stepNumber: 3,
        title: 'Medir las 13 resistencias de 1 kΩ, 4 pulsadores e interruptor',
        tableItems: [
          { item: 'Resistencias de 1 kΩ (marrón-negro-rojo-dorado)', qty: '13' },
          { item: 'Pulsadores táctiles de 4 patas', qty: '4' },
          { item: 'Interruptor basculante rojo (I/O)', qty: '1' },
          { item: 'Multímetro digital', qty: '1' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Mide las 13 resistencias de 1 kΩ en escala de 2 kΩ y comprueba en cada pulsador el par de patas en diagonal que cierra al presionar.',
        origin: 'Puntas del multímetro',
        destination: '13 resistencias de 1 kΩ, 4 pulsadores e interruptor I/O',
        jumperType: 'Verificación física',
        wireColor: 'Sin cable (medición previa)',
        simpleExplanation:
          'Probamos todas las piezas pequeñas con el medidor antes de montarlas para evitar buscar fallas después.',
        highlightZone: 'Z1',
        highlightNodes: ['MULTÍMETRO', '13×1kΩ + BOTONES'],
        multimeterTest: {
          probes: 'Punta roja y negra en extremos de cada resistencia; luego en patas diagonales de cada pulsador y terminales del interruptor',
          scale: 'Ohmios (2 kΩ) y Continuidad',
          expected: 'Cada R: 0,95–1,05 kΩ; Pulsador: OL suelto y < 1 Ω presionado; Interruptor: OL en «O» y < 1 Ω en «I»',
          ifFails: 'Si alguna resistencia marca otro valor (p. ej. 10 kΩ), sepárala y busca bandas marrón-negro-rojo-dorado.',
        },
      },
    ],
  },
  {
    id: 'E1',
    code: 'E1',
    title: 'E1. Potencia y rieles en vacío (R1 GND, R2 +5 V y línea 12 V)',
    objective:
      'Unir la masa común R1 entre P1 y P2, conectar la fuente de 5 V 3 A a P1 y cablear la línea de 12 V 2 A a través del interruptor general en serie hacia L298N y Shield.',
    simpleSummary:
      'Construimos las autopistas de energía y verificamos los voltajes exactos de 5 V y 12 V antes de conectar ningún cerebro.',
    connectList: [
      'Jumper negro P1(R1) → P2(R1)',
      'Fuente 5 V 3 A → P1(R2 + / R1 −)',
      'Fuente 12 V 2 A (−) → P1(R1 −)',
      'Fuente 12 V 2 A (+) → Interruptor → L298N 12V y Shield +M',
    ],
    doNotConnectYet: [
      'NO conectes todavía el ESP32, el Arduino UNO, los motores ni ningún sensor.',
    ],
    stageTest:
      'Medir +5,00 V ± 0,15 V en P1(R2) y +12,0 V ± 0,5 V en bornes de potencia solo cuando el interruptor está en «I».',
    ifFails:
      'Si el multímetro muestra signo negativo (−5 V o −12 V), desenchufa de inmediato e invierte los cables positivo y negativo.',
    steps: [
      {
        id: 'E1-S1',
        stepNumber: 1,
        title: 'Unir riel R1 (−) de P1 con riel R1 (−) de P2 (masa única)',
        tableItems: [
          { item: 'Protoboard P1 (830 pts)', qty: '1' },
          { item: 'Protoboard P2 (830 pts)', qty: '1' },
          { item: 'Jumper M-M negro', qty: '1' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta el riel superior azul R1 (−) de la protoboard P1 hacia el riel superior azul R1 (−) de la protoboard P2 con 1 jumper M-M negro.',
        origin: 'Protoboard P1 — Riel R1 (−)',
        destination: 'Protoboard P2 — Riel R1 (−)',
        jumperType: 'M-M',
        wireColor: 'Negro (GND)',
        breadboardCoord: 'P1(R1 −) → P2(R1 −)',
        simpleExplanation:
          'Unimos las carreteras negras de las dos placas blancas para que todo el circuito tenga el mismo punto cero (0 V).',
        highlightZone: 'Z1',
        highlightNodes: ['P1 R1 (−)', 'P2 R1 (−)'],
        multimeterTest: {
          probes: 'Punta negra en extremo izquierdo de P1(R1) y punta roja en extremo derecho de P2(R1)',
          scale: 'Continuidad (pitido)',
          expected: 'Pitido continuo (< 1 Ω). Entre R2 (P1) y R3 (P2) debe marcar OL.',
          ifFails: 'Presiona firmemente ambas puntas del jumper dentro de la línea marcada con signo menos (−).',
        },
      },
      {
        id: 'E1-S2',
        stepNumber: 2,
        title: 'Conectar fuente 5 V 3 A a P1 (rieles R2 + y R1 −)',
        tableItems: [
          { item: 'Fuente de alimentación 5 V 3 A', qty: '1' },
          { item: 'Cables bornera AWG 20-22 (1 rojo, 1 negro)', qty: '2' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta el cable positivo (+) de la fuente 5 V 3 A al riel inferior rojo R2 (+) de P1 (cable rojo) y su negativo (−) al riel R1 (−) de P1 (cable negro).',
        origin: 'Fuente 5 V 3 A (+ y −)',
        destination: 'Protoboard P1 — Riel R2 (+) y Riel R1 (−)',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Rojo (+5V / +12V) y Negro (GND)',
        breadboardCoord: 'P1(R2 +) y P1(R1 −)',
        simpleExplanation:
          'Metemos la energía suave de 5 V en la línea roja de la primera placa para alimentar los cerebros más adelante.',
        highlightZone: 'Z1',
        highlightNodes: ['FUENTE 5V 3A', 'P1 (R2 +5V / R1 GND)'],
        multimeterTest: {
          probes: 'Enchufa SOLO la fuente 5 V: punta negra en P2(R1 −) y punta roja en P1(R2 +)',
          scale: 'Voltios DC (20 V)',
          expected: '+4,90 V a +5,15 V DC',
          ifFails: 'Si marca negativo o > 5,3 V, desenchufa de inmediato y revisa la polaridad de la fuente.',
        },
      },
      {
        id: 'E1-S3',
        stepNumber: 3,
        title: 'Conectar negativo (−) de la fuente 12 V 2 A a P1(R1 −)',
        tableItems: [
          { item: 'Adaptador 12 V 2 A (desenchufado)', qty: '1' },
          { item: 'Cable bornera negro AWG 20-22', qty: '1' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta el cable negativo (−) del adaptador de 12 V 2 A hacia el riel R1 (−) de la protoboard P1 usando un cable negro.',
        origin: 'Adaptador 12 V 2 A — Terminal negativo (−)',
        destination: 'Protoboard P1 — Riel R1 (−)',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Negro (GND)',
        breadboardCoord: 'P1(R1 −)',
        simpleExplanation:
          'Juntamos el cable negro de la fuente de 12 V en el mismo carril negro común que ya tiene el cable negro de 5 V.',
        highlightZone: 'Z1',
        highlightNodes: ['FUENTE 12V (−)', 'P1 R1 (−)'],
        multimeterTest: {
          probes: 'Todo desconectado: punta negra en negativo del conector 12 V y punta roja en P2(R1)',
          scale: 'Continuidad (pitido)',
          expected: 'Pitido continuo (< 1 Ω)',
          ifFails: 'Comprueba con el voltímetro cuál es el terminal negativo exterior de tu adaptador 12 V antes de fijarlo.',
        },
      },
      {
        id: 'E1-S4',
        stepNumber: 4,
        title: 'Conectar positivo (+) de 12 V al Terminal 1 del Interruptor General',
        tableItems: [
          { item: 'Interruptor general (en posición «O» apagado)', qty: '1' },
          { item: 'Cable bornera naranja AWG 20-22', qty: '1' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta el cable positivo (+) del adaptador de 12 V 2 A hacia el Terminal 1 del interruptor general (verificando que esté en «O»).',
        origin: 'Adaptador 12 V 2 A — Terminal positivo (+)',
        destination: 'Interruptor General — Terminal 1',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Naranja (+3.3V / +12V rotulado)',
        simpleExplanation:
          'Llevamos los 12 V primero al botón interruptor rojo para poder cortar la fuerza de los motores en cualquier emergencia.',
        highlightZone: 'Z1',
        highlightNodes: ['FUENTE 12V (+)', 'INTERRUPTOR T1'],
        multimeterTest: {
          probes: 'Con fuente desenchufada: continuidad entre Terminal 1 y Terminal 2 del interruptor en «O» y en «I»',
          scale: 'Continuidad (pitido)',
          expected: 'OL en posición «O»; pitido (< 1 Ω) en posición «I»',
          ifFails: 'Si tu interruptor tiene 3 patas (luz piloto), usa las dos patas plateadas laterales que cierran en «I».',
        },
      },
      {
        id: 'E1-S5',
        stepNumber: 5,
        title: 'Cablear salida del interruptor (Terminal 2) y GND hacia el L298N',
        tableItems: [
          { item: 'Módulo L298N (sin puentes 5V-EN/ENA/ENB)', qty: '1' },
          { item: 'Cables bornera AWG 20-22 (1 naranja, 1 negro)', qty: '2' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta Terminal 2 del interruptor general hacia el borne «12V» del L298N (cable naranja), y conecta el borne «GND» del L298N hacia P1(R1 −) (cable negro).',
        origin: 'Interruptor Terminal 2 y P1(R1 −)',
        destination: 'L298N — Borne «12V» y Borne «GND»',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Naranja (+3.3V / +12V rotulado) y Negro (GND)',
        breadboardCoord: 'P1(R1 −) → L298N GND',
        simpleExplanation:
          'Llevamos la fuerza de 12 V desde el interruptor hasta el módulo L298N que moverá los dos motores grandes.',
        highlightZone: 'Z1',
        highlightNodes: ['INTERRUPTOR T2', 'L298N (12V / GND)'],
        multimeterTest: {
          probes: 'Enchufa 5 V y luego 12 V; pasa interruptor a «I» y mide entre tornillo 12V y tornillo GND del L298N',
          scale: 'Voltios DC (20 V)',
          expected: '+12,0 V ± 0,5 V en «I»; 0,0 V al pasar interruptor a «O»',
          ifFails: 'Apaga 12 V y revisa que el tornillo del L298N muerda el cobre pelado y no el plástico aislante.',
        },
      },
      {
        id: 'E1-S6',
        stepNumber: 6,
        title: 'Cablear salida del interruptor (Terminal 2) y GND hacia Shield L293D EXT_PWR',
        tableItems: [
          { item: 'Shield L293D (sin jumper PWR)', qty: '1' },
          { item: 'Cables bornera AWG 20-22 (1 naranja, 1 negro)', qty: '2' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta Terminal 2 del interruptor general hacia el borne «+M» (EXT_PWR) del Shield L293D (cable naranja), y conecta el borne «GND» de EXT_PWR hacia P1(R1 −) (cable negro).',
        origin: 'Interruptor Terminal 2 y P1(R1 −)',
        destination: 'Shield L293D — Bornera EXT_PWR (+M y GND)',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Naranja (+3.3V / +12V rotulado) y Negro (GND)',
        breadboardCoord: 'P1(R1 −) → Shield EXT_PWR GND',
        simpleExplanation:
          'Llevamos los mismos 12 V del interruptor hasta la bornera azul del Shield para alimentar el motor del carro, el imán y el bombillo.',
        highlightZone: 'Z1',
        highlightNodes: ['INTERRUPTOR T2', 'SHIELD +M / GND'],
        multimeterTest: {
          probes: 'Enchufa 5 V y luego 12 V; interruptor en «I», mide en tornillos +M y GND del Shield L293D',
          scale: 'Voltios DC (20 V)',
          expected: '+12,0 V ± 0,5 V en «I»; 0,0 V en «O»',
          ifFails: 'Apaga primero 12 V (interruptor «O»), verifica polaridad en +M / GND de la bornera azul.',
        },
      },
    ],
  },
  {
    id: 'E2',
    code: 'E2',
    title: 'E2. Alimentación lógica de 5 V del L298N',
    objective:
      'Alimentar la sección lógica de 5 V del puente H L298N desde el riel P1(R2) con el puente 5V-EN retirado y comprobar el LED indicador.',
    simpleSummary:
      'Le damos 5 V suaves al módulo de motores grandes para que encienda su luz roja antes de conectarlo al ESP32.',
    connectList: ['P1(R2 +5 V) → L298N borne «+5V»'],
    doNotConnectYet: [
      'NO conectes todavía el ESP32.',
      'No vuelvas a colocar el puente 5V-EN.',
    ],
    stageTest: 'LED rojo del L298N encendido al alimentar 5 V y 5,0 V medidos en su borne +5V.',
    ifFails: 'Apaga todo si el chip L298N se calienta sin carga; revisa que el jumper 5V-EN siga quitado.',
    steps: [
      {
        id: 'E2-S1',
        stepNumber: 1,
        title: 'Conectar riel P1(R2 +5 V) al borne «+5V» del L298N',
        tableItems: [
          { item: 'Módulo L298N ya cableado a 12 V / GND', qty: '1' },
          { item: 'Cable bornera rojo AWG 20-22', qty: '1' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta el riel R2 (+5 V) de la protoboard P1 hacia el borne «+5V» del L298N usando un cable rojo.',
        origin: 'Protoboard P1 — Riel R2 (+5 V)',
        destination: 'L298N — Borne «+5V»',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Rojo (+5V / +12V)',
        breadboardCoord: 'P1(R2 +5V) → L298N (+5V)',
        simpleExplanation:
          'Conectamos los 5 V suaves al borne del L298N para encender sus circuitos lógicos internos.',
        highlightZone: 'Z1',
        highlightNodes: ['P1 R2 (+5V)', 'L298N +5V'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: punta negra en borne GND del L298N y punta roja en borne +5V',
          scale: 'Voltios DC (20 V)',
          expected: '5,00 V ± 0,15 V DC y LED rojo del L298N encendido',
          ifFails: 'Revisa que el jumper 5V-EN esté retirado y que P1(R2) tenga 5 V.',
        },
      },
    ],
  },
  {
    id: 'E3',
    code: 'E3',
    title: 'E3. ESP32, riel R3 (+3,3 V), OLED A, OLED B, Potenciómetro 1 y PARO',
    objective:
      'Alimentar el ESP32 en P2, crear el riel R3 (+3,3 V), conectar OLED A (D21/D22), OLED B (D16/D17), Pot 1 (D36) y Pulsador PARO (D12 sin R externa), uno por uno.',
    simpleSummary:
      'Instalamos el cerebro principal (ESP32), creamos la carretera de 3,3 V y conectamos sus dos pantallitas, la primera perilla y el botón rojo de paro.',
    connectList: [
      'P1(R2) → ESP32 VIN y P2(R1) → ESP32 GND',
      'ESP32 3V3 → P2(R3 +3,3 V)',
      'OLED A (D21/D22)',
      'OLED B (D16/D17)',
      'Potenciómetro 1 (D36)',
      'Pulsador PARO (D12 a GND, sin resistencia externa)',
    ],
    doNotConnectYet: [
      'NO conectes todavía el Arduino UNO ni sensores de 5 V sin divisores.',
      'NO conectes el cable USB mientras P1(R2) esté conectado a ESP32 VIN.',
    ],
    stageTest:
      'Medir 3,30 V ± 0,10 V en P2(R3), 0–3,3 V en D36 al girar Pot 1 y continuidad en D12 solo al oprimir PARO.',
    ifFails: 'Apaga 5 V si P2(R3) supera 3,5 V o si D12 tiene algún cable hacia 3,3 V.',
    steps: [
      {
        id: 'E3-S1',
        stepNumber: 1,
        title: 'Alimentar el ESP32 desde P1(R2 +5 V) y P2(R1 GND)',
        tableItems: [
          { item: 'ESP32 DevKit 30 pines', qty: '1' },
          { item: 'Jumpers M-M (1 rojo, 1 negro)', qty: '2' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta P1(R2 +5V) hacia el pin «VIN» del ESP32 con 1 jumper M-M rojo (retirar este cable antes de usar USB) y P2(R1 −) hacia el pin «GND» del ESP32 con 1 jumper M-M negro.',
        origin: 'P1(R2 +5V) y P2(R1 −)',
        destination: 'ESP32 — Pines «VIN» y «GND»',
        jumperType: 'M-M',
        wireColor: 'Rojo (+5V / +12V) y Negro (GND)',
        breadboardCoord: 'P1(R2)→VIN · P2(R1)→GND',
        simpleExplanation:
          'Le damos energía de 5 V al cerebro principal (ESP32); recuerda desconectar ese cable rojo cuando vayas a programar por USB.',
        highlightZone: 'Z1',
        highlightNodes: ['P1(R2) / P2(R1)', 'ESP32 VIN/GND'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: punta negra en pin GND del ESP32 y roja en pin VIN',
          scale: 'Voltios DC (20 V)',
          expected: '5,00 V ± 0,15 V DC y LED de encendido del ESP32 iluminado',
          ifFails: 'Apaga 5 V y verifica que el pin sea exactamente VIN (no 3V3).',
        },
      },
      {
        id: 'E3-S2',
        stepNumber: 2,
        title: 'Crear el riel R3 (+3,3 V) en la protoboard P2',
        tableItems: [{ item: 'Jumper M-M naranja', qty: '1' }],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta el pin «3V3» del ESP32 hacia el riel inferior rojo R3 (+) de la protoboard P2 usando 1 jumper M-M naranja (verificando que R3 nunca toque R2 de P1).',
        origin: 'ESP32 — Pin «3V3»',
        destination: 'Protoboard P2 — Riel R3 (+3,3 V)',
        jumperType: 'M-M',
        wireColor: 'Naranja (+3.3V / +12V rotulado)',
        breadboardCoord: 'ESP32 3V3 → P2(R3 +)',
        simpleExplanation:
          'El ESP32 fabrica 3,3 V seguros y los enviamos al riel naranja de la segunda placa para las piezas delicadas.',
        highlightZone: 'Z1',
        highlightNodes: ['ESP32 3V3', 'P2 R3 (+3,3 V)'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: punta negra en P2(R1 −) y punta roja en P2(R3 +)',
          scale: 'Voltios DC (20 V)',
          expected: '3,30 V ± 0,10 V DC',
          ifFails: 'Apaga 5 V de inmediato si marca > 3,5 V; revisa que P2(R3) esté aislado de P1(R2).',
        },
      },
      {
        id: 'E3-S3',
        stepNumber: 3,
        title: 'Conectar OLED A al Bus I2C #1 del ESP32 (D21 / D22)',
        tableItems: [
          { item: 'Pantalla OLED 0,96" I2C (OLED A)', qty: '1' },
          { item: 'Jumpers M-H (1 naranja, 1 negro, 2 amarillos)', qty: '4' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta los 4 pines de OLED A: «VCC» → P2(R3 +3,3V) naranja, «GND» → P2(R1 −) negro, «SDA» → ESP32 «D21» amarillo y «SCL» → ESP32 «D22» amarillo.',
        origin: 'P2(R3), P2(R1) y ESP32 (D21, D22)',
        destination: 'OLED A — VCC, GND, SDA, SCL',
        jumperType: 'M-H',
        wireColor: 'Naranja, Negro y Amarillo / Blanco (I2C / Datos)',
        breadboardCoord: 'P2(R3) y P2(R1)',
        simpleExplanation:
          'Conectamos la primera pantallita OLED por su propio camino de 2 hilos de datos (D21 y D22).',
        highlightZone: 'Z1',
        highlightNodes: ['ESP32 D21/D22', 'OLED A (0x3C)'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide entre los pines VCC y GND directamente en la tarjeta de OLED A',
          scale: 'Voltios DC (20 V)',
          expected: '3,30 V ± 0,10 V DC',
          ifFails: 'Algunas OLED traen GND antes que VCC; lee la serigrafía impresa en el borde de tu módulo.',
        },
      },
      {
        id: 'E3-S4',
        stepNumber: 4,
        title: 'Conectar OLED B al Bus I2C #2 del ESP32 (D16 / D17)',
        tableItems: [
          { item: 'Pantalla OLED 0,96" I2C (OLED B)', qty: '1' },
          { item: 'Jumpers M-H (1 naranja, 1 negro, 2 amarillos)', qty: '4' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta los 4 pines de OLED B: «VCC» → P2(R3 +3,3V) naranja, «GND» → P2(R1 −) negro, «SDA» → ESP32 «D16» amarillo y «SCL» → ESP32 «D17» amarillo.',
        origin: 'P2(R3), P2(R1) y ESP32 (D16, D17)',
        destination: 'OLED B — VCC, GND, SDA, SCL',
        jumperType: 'M-H',
        wireColor: 'Naranja, Negro y Amarillo / Blanco (I2C / Datos)',
        breadboardCoord: 'P2(R3) y P2(R1)',
        simpleExplanation:
          'Conectamos la segunda pantallita en otros dos pines (D16 y D17) para que las dos pantallas no choquen.',
        highlightZone: 'Z1',
        highlightNodes: ['ESP32 D16/D17', 'OLED B (0x3C)'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide entre los pines VCC y GND en la tarjeta de OLED B',
          scale: 'Voltios DC (20 V)',
          expected: '3,30 V ± 0,10 V DC',
          ifFails: 'Verifica orden VCC/GND impreso en OLED B y firmeza en R3 y R1.',
        },
      },
      {
        id: 'E3-S5',
        stepNumber: 5,
        title: 'Conectar Potenciómetro 1 al pin analógico ESP32 D36 (VP)',
        tableItems: [
          { item: 'Potenciómetro B10K #1', qty: '1' },
          { item: 'Jumpers M-H (1 naranja, 1 negro, 1 azul)', qty: '3' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta una pata lateral del Potenciómetro 1 a P2(R3 +3,3V) (naranja), la otra pata lateral a P2(R1 −) (negro) y la pata central (cursor) hacia ESP32 «D36 (VP)» (azul).',
        origin: 'Potenciómetro 1 (extremos + cursor)',
        destination: 'P2(R3), P2(R1) y ESP32 «D36 (VP)»',
        jumperType: 'M-H',
        wireColor: 'Naranja, Negro y Azul (Señal)',
        breadboardCoord: 'P2(R3) y P2(R1)',
        simpleExplanation:
          'La primera perilla gira y entrega entre 0 V y 3,3 V al pin D36 del ESP32.',
        highlightZone: 'Z1',
        highlightNodes: ['POTENCIÓMETRO 1', 'ESP32 D36 (VP)'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: punta negra en P2(R1), punta roja en pata central de Pot 1 mientras giras la perilla',
          scale: 'Voltios DC (20 V)',
          expected: 'Varía de forma continua entre 0,00 V y 3,30 V ± 0,10 V',
          ifFails: 'Si queda fijo en 0 o 3,3 V, asegúrate de que el cable azul esté en la pata del centro.',
        },
      },
      {
        id: 'E3-S6',
        stepNumber: 6,
        title: 'Conectar Pulsador PARO a ESP32 D12 (SIN resistencia externa)',
        tableItems: [
          { item: 'Pulsador táctil (PARO)', qty: '1' },
          { item: 'Jumpers M-H (1 azul, 1 negro)', qty: '2' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta una pata diagonal del Pulsador PARO hacia ESP32 «D12» (azul) y su pata opuesta hacia P2(R1 −) (negro), SIN añadir ninguna resistencia externa.',
        origin: 'Pulsador PARO (par diagonal verificado)',
        destination: 'ESP32 «D12» y P2(R1 −)',
        jumperType: 'M-H',
        wireColor: 'Azul (Señal) y Negro (GND)',
        breadboardCoord: 'P2(R1 −)',
        simpleExplanation:
          'El botón de paro une el pin D12 con tierra al presionarlo; prohibido ponerle resistencia externa porque afectaría el encendido del ESP32.',
        highlightZone: 'Z1',
        highlightNodes: ['PULSADOR PARO', 'ESP32 D12'],
        multimeterTest: {
          probes: 'TODO DESCONECTADO: punta negra en P2(R1), roja en pin D12 del ESP32',
          scale: 'Continuidad (pitido)',
          expected: 'OL con botón suelto; pitido (< 1 Ω) al presionar PARO',
          ifFails: 'Verifica en la lista de E0-S3 que estés usando las dos patas diagonales que cierran al presionar.',
        },
      },
    ],
  },
  {
    id: 'E4',
    code: 'E4',
    title: 'E4. Arduino UNO + Shield L293D y periféricos de 5 V',
    objective:
      'Acoplar el Shield L293D sobre el Arduino UNO y conectar por separado la LCD 1602, Pot 2, Botón A, Botón B, los 3 Buzzers KY-012 y el Kit LED por sonido.',
    simpleSummary:
      'Armamos el segundo cerebro (Arduino UNO con su escudo encima) y conectamos cada pantalla, botón y pito uno por uno.',
    connectList: [
      'Acoplar Shield sobre UNO + P1(R2)→5V / P1(R1)→GND',
      'LCD 1602 (A4/A5)',
      'Potenciómetro 2 (A2)',
      'Botón A (D2) y Botón B (D9)',
      'Buzzers 1, 2 y 3 (D10, D13, A3)',
      'Kit LED por sonido (probar 3,3 V R3 -> si no, 5 V R2)',
    ],
    doNotConnectYet: [
      'NO uses pines D3–D8, D11, D12 del UNO (reservados por el Shield L293D).',
      'NO conectes todavía el enlace UART hacia el ESP32.',
    ],
    stageTest:
      'LED ON del UNO encendido, LCD iluminada a 5 V, Pot 2 varía 0–5 V en A2 y Kit LED probado.',
    ifFails:
      'Si la LCD enciende la luz azul pero no se ven cuadros, gira suavemente el potenciómetro azul en la espalda de la LCD.',
    steps: [
      {
        id: 'E4-S1',
        stepNumber: 1,
        title: 'Acoplar Shield L293D sobre Arduino UNO y conectar 5 V / GND',
        tableItems: [
          { item: 'Arduino UNO R3', qty: '1' },
          { item: 'Shield L293D (sin jumper PWR)', qty: '1' },
          { item: 'Jumpers M-M (1 rojo, 1 negro)', qty: '2' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Acopla con cuidado el Shield L293D encima del Arduino UNO alineando todas las patas; luego conecta P1(R2 +5V) → pin «5V» (rojo, quitar al usar USB) y P1(R1 −) → pin «GND» (negro).',
        origin: 'P1(R2 +5V) y P1(R1 −)',
        destination: 'Arduino UNO + Shield — Pines «5V» y «GND»',
        jumperType: 'M-M',
        wireColor: 'Rojo (+5V / +12V) y Negro (GND)',
        breadboardCoord: 'P1(R2)→5V · P1(R1)→GND',
        simpleExplanation:
          'Encajamos las dos placas como un sándwich y les damos sus 5 V desde la protoboard P1.',
        highlightZone: 'Z1',
        highlightNodes: ['P1 (R2/R1)', 'UNO + SHIELD L293D'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide entre el pin 5V y el pin GND en la fila superior del shield',
          scale: 'Voltios DC (20 V)',
          expected: '5,00 V ± 0,15 V DC y LED verde ON encendido en el UNO',
          ifFails: 'Apaga 5 V y revisa que ninguna pata metálica del shield haya quedado doblada fuera del zócalo.',
        },
      },
      {
        id: 'E4-S2',
        stepNumber: 2,
        title: 'Conectar LCD 1602 I2C al Arduino UNO (A4 / A5)',
        tableItems: [
          { item: 'Pantalla LCD 1602 con módulo I2C', qty: '1' },
          { item: 'Jumpers M-H (1 rojo, 1 negro, 2 amarillos)', qty: '4' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta los 4 pines de la LCD 1602: «VCC» → P1(R2 +5V) rojo, «GND» → P1(R1 −) negro, «SDA» → UNO «A4» amarillo y «SCL» → UNO «A5» amarillo.',
        origin: 'P1(R2), P1(R1) y UNO (A4, A5)',
        destination: 'LCD 1602 — VCC, GND, SDA, SCL',
        jumperType: 'M-H',
        wireColor: 'Rojo, Negro y Amarillo / Blanco (I2C / Datos)',
        breadboardCoord: 'P1(R2) y P1(R1)',
        simpleExplanation:
          'Conectamos la pantalla grande de texto al Arduino UNO con 2 cables de energía y 2 de datos.',
        highlightZone: 'Z1',
        highlightNodes: ['UNO A4/A5 + P1', 'LCD 1602 I2C'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide en pines VCC y GND de la mochila trasera de la LCD',
          scale: 'Voltios DC (20 V)',
          expected: '5,00 V ± 0,15 V DC y luz de fondo de la LCD encendida',
          ifFails: 'Si la luz trasera no enciende, revisa el pequeño puente azul LED en el costado del adaptador I2C.',
        },
      },
      {
        id: 'E4-S3',
        stepNumber: 3,
        title: 'Conectar Potenciómetro 2 al pin analógico UNO A2',
        tableItems: [
          { item: 'Potenciómetro B10K #2', qty: '1' },
          { item: 'Jumpers M-H (1 rojo, 1 negro, 1 azul)', qty: '3' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta un extremo lateral del Potenciómetro 2 a P1(R2 +5V) (rojo), el otro extremo a P1(R1 −) (negro) y el pin central hacia Arduino UNO «A2» (azul).',
        origin: 'Potenciómetro 2 (extremos + cursor)',
        destination: 'P1(R2), P1(R1) y UNO «A2»',
        jumperType: 'M-H',
        wireColor: 'Rojo, Negro y Azul (Señal)',
        breadboardCoord: 'P1(R2) y P1(R1)',
        simpleExplanation:
          'La segunda perilla le dice al Arduino qué tan lento debe bajar el gancho cuando se acerca a la carga.',
        highlightZone: 'Z1',
        highlightNodes: ['POTENCIÓMETRO 2', 'UNO A2'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide entre pin A2 del UNO y P1(R1 −) mientras giras el Pot 2',
          scale: 'Voltios DC (20 V)',
          expected: 'Varía continuamente de 0,00 V a 5,00 V ± 0,15 V',
          ifFails: 'Confirma que el jumper azul esté en la pata central del potenciómetro.',
        },
      },
      {
        id: 'E4-S4',
        stepNumber: 4,
        title: 'Conectar Botón Pestaña A al pin UNO D2',
        tableItems: [
          { item: 'Pulsador táctil (Pestaña A)', qty: '1' },
          { item: 'Jumpers M-H (1 azul, 1 negro)', qty: '2' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta una pata diagonal del Botón Pestaña A hacia Arduino UNO «D2» (azul) y la pata diagonal opuesta hacia P1(R1 −) (negro).',
        origin: 'Botón Pestaña A',
        destination: 'UNO «D2» y P1(R1 −)',
        jumperType: 'M-H',
        wireColor: 'Azul (Señal) y Negro (GND)',
        breadboardCoord: 'P1(R1 −)',
        simpleExplanation:
          'Este botón servirá para cambiar las páginas de información en la pantallita OLED A.',
        highlightZone: 'Z1',
        highlightNodes: ['BOTÓN PESTAÑA A', 'UNO D2'],
        multimeterTest: {
          probes: 'TODO DESCONECTADO: punta negra en P1(R1) y roja en pin D2 del header del Shield/UNO',
          scale: 'Continuidad (pitido)',
          expected: 'OL suelto; pitido (< 1 Ω) al oprimir Botón A',
          ifFails: 'Verifica que el cable esté en D2 y no en D3 (reservado por el shield).',
        },
      },
      {
        id: 'E4-S5',
        stepNumber: 5,
        title: 'Conectar Botón Pestaña B al pin UNO D9',
        tableItems: [
          { item: 'Pulsador táctil (Pestaña B)', qty: '1' },
          { item: 'Jumpers M-H (1 azul, 1 negro)', qty: '2' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta una pata diagonal del Botón Pestaña B hacia Arduino UNO «D9» (azul) y la pata diagonal opuesta hacia P1(R1 −) (negro).',
        origin: 'Botón Pestaña B',
        destination: 'UNO «D9» y P1(R1 −)',
        jumperType: 'M-H',
        wireColor: 'Azul (Señal) y Negro (GND)',
        breadboardCoord: 'P1(R1 −)',
        simpleExplanation:
          'Este segundo botón cambiará las páginas de la pantallita OLED B.',
        highlightZone: 'Z1',
        highlightNodes: ['BOTÓN PESTAÑA B', 'UNO D9'],
        multimeterTest: {
          probes: 'TODO DESCONECTADO: punta negra en P1(R1) y roja en pin D9 del UNO/Shield',
          scale: 'Continuidad (pitido)',
          expected: 'OL suelto; pitido (< 1 Ω) al oprimir Botón B',
          ifFails: 'Revisa que el pin usado sea D9 (libre en el shield, no D8).',
        },
      },
      {
        id: 'E4-S6',
        stepNumber: 6,
        title: 'Conectar Buzzer 1 (Movimiento) al pin UNO D10',
        tableItems: [
          { item: 'Módulo Buzzer KY-012 #1', qty: '1' },
          { item: 'Jumpers M-H (1 rojo, 1 negro, 1 azul)', qty: '3' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta Buzzer 1: pin «+» → P1(R2 +5V) rojo, pin «−» → P1(R1 −) negro y pin «S» → Arduino UNO «D10» azul.',
        origin: 'P1(R2), P1(R1) y UNO «D10»',
        destination: 'Buzzer 1 KY-012 (+, −, S)',
        jumperType: 'M-H',
        wireColor: 'Rojo, Negro y Azul (Señal)',
        breadboardCoord: 'P1(R2) y P1(R1)',
        simpleExplanation:
          'Conectamos el primer pito que avisará cuando la grúa empiece a moverse.',
        highlightZone: 'Z1',
        highlightNodes: ['UNO D10 + P1', 'BUZZER 1 (MOV.)'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide entre pines + y − del Buzzer 1',
          scale: 'Voltios DC (20 V)',
          expected: '5,00 V ± 0,15 V DC',
          ifFails: 'Verifica en la placa KY-012 cuál pata es «S» y cuál es «−» (algunos módulos invierten el orden).',
        },
      },
      {
        id: 'E4-S7',
        stepNumber: 7,
        title: 'Conectar Buzzer 2 (Alarma → D13) y Buzzer 3 (Confirmación → A3)',
        tableItems: [
          { item: 'Módulos Buzzer KY-012 (#2 y #3)', qty: '2' },
          { item: 'Jumpers M-H (2 rojos, 2 negros, 2 azules)', qty: '6' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta los 2 buzzers restantes idénticos: ambos «+» → P1(R2 +5V) rojo, ambos «−» → P1(R1 −) negro, Buzzer 2 «S» → UNO «D13» azul y Buzzer 3 «S» → UNO «A3» azul.',
        origin: 'P1(R2), P1(R1) y UNO (D13, A3)',
        destination: 'Buzzer 2 y Buzzer 3 KY-012 (+, −, S)',
        jumperType: 'M-H',
        wireColor: 'Rojo, Negro y Azul (Señal)',
        breadboardCoord: 'P1(R2) y P1(R1)',
        simpleExplanation:
          'Conectamos los otros dos pitos: uno para alarmas y otro para confirmar órdenes.',
        highlightZone: 'Z1',
        highlightNodes: ['UNO D13 / A3', 'BUZZER 2 Y 3'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide tensión entre + y − de Buzzer 2 y Buzzer 3',
          scale: 'Voltios DC (20 V)',
          expected: '5,00 V ± 0,15 V DC en ambos',
          ifFails: 'Revisa que estén en R2 (+5 V) y R1 (GND) y que D13 / A3 queden bien insertados.',
        },
      },
      {
        id: 'E4-S8',
        stepNumber: 8,
        title: 'Conectar y probar Kit LED por sonido (primero 3,3 V R3; si no, 5 V R2)',
        tableItems: [
          { item: 'Kit LED por sonido (7 LEDs)', qty: '1' },
          { item: 'Jumpers M-M/M-H (1 naranja o rojo, 1 negro)', qty: '2' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta el negativo (−) del Kit LED por sonido hacia P1(R1 −) (negro) y su positivo (+) primero hacia P2(R3 +3,3V) (naranja); si en prueba de sonido no ilumina, apaga 5 V y cámbialo a P1(R2 +5V).',
        origin: 'P2(R3 +3,3V) / P1(R2 +5V) y P1(R1 −)',
        destination: 'Kit LED por sonido (+ y −)',
        jumperType: 'M-M',
        wireColor: 'Naranja (+3.3V) o Rojo (+5V) y Negro (GND)',
        breadboardCoord: 'P2(R3) o P1(R2) · P1(R1)',
        simpleExplanation:
          'La fila de luces LED se enciende cuando escucha ruido; probamos primero si le basta con 3,3 V y si no le subimos a 5 V.',
        highlightZone: 'Z1',
        highlightNodes: ['P2(R3) / P1(R2)', 'KIT LED SONIDO'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide voltaje en bornes del Kit LED y da una palmada cerca del micrófono',
          scale: 'Voltios DC (20 V)',
          expected: '3,30 V (en R3) o 5,00 V (en R2) y LEDs parpadean al aplaudir',
          ifFails: 'Apaga 5 V, mueve el cable positivo de P2(R3) a P1(R2 +5V) y registra el voltaje definitivo en Inicio/Biblioteca.',
        },
      },
    ],
  },
  {
    id: 'E5',
    code: 'E5',
    title: 'E5. Enlace UART ESP32 ↔ UNO con Divisor #3 (P2 cols 29–38)',
    objective:
      'Construir el Divisor #3 en P2 (columnas 29–38), verificar 3,33 V ± 0,10 V en el nodo (32,c) antes de conectarlo al ESP32, completar el enlace desmontable en D2 y conectar D15 → A0.',
    simpleSummary:
      'Armamos un puente seguro de 3 resistencias para que el Arduino (5 V) le pueda hablar al ESP32 (3,3 V) sin lastimar su pin D2.',
    connectList: [
      'Divisor #3 en P2 columnas 29–38 (3×1 kΩ)',
      'Prueba de 3,33 V en P2(32,c) sin conectar D2',
      'P2(32,c) → ESP32 D2 (jumper desmontable)',
      'ESP32 D15 (TX) → Arduino UNO A0 (RX)',
    ],
    doNotConnectYet: [
      'PROHIBIDO conectar el jumper desde P2(32,c) hasta ESP32 D2 sin haber medido primero 3,33 V ± 0,10 V.',
    ],
    stageTest:
      'Con +5 V de prueba en (29,a), medir 3,33 V ± 0,10 V en (32,c) y continuidad en D15 ↔ A0.',
    ifFails: 'Si en (32,c) mide 5,0 V, falta el cable negro de GND en (38,a) hacia P2(R1).',
    steps: [
      {
        id: 'E5-S1',
        stepNumber: 1,
        title: 'Armar Divisor #3 en P2 (columnas 29, 32, 35, 38) sin conectar D2',
        tableItems: [
          { item: 'Resistencias de 1 kΩ (marrón-negro-rojo-dorado)', qty: '3' },
          { item: 'Jumpers M-M (1 amarillo, 1 negro)', qty: '2' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'En P2: conecta UNO «A1» → (29,a) (amarillo); Res A de (29,b) a (32,b); Res B de (32,d) a (35,d); Res C de (35,b) a (38,b); y (38,a) → P2(R1 −) (negro). NO conectes todavía el cable hacia D2.',
        origin: 'Arduino UNO «A1 (TX)» y P2 cols 29–38',
        destination: 'P2(29,a)..(38,a) → P2(R1 −)',
        jumperType: 'Resistencia 1 kΩ',
        wireColor: 'Amarillo / Blanco (I2C / Datos) y Negro (GND)',
        breadboardCoord: 'P2: (29,a), (29,b)-(32,b), (32,d)-(35,d), (35,b)-(38,b), (38,a)->R1',
        simpleExplanation:
          'Ponemos tres resistencias de 1 kΩ en escalera en la segunda placa blanca: una arriba y dos abajo hacia tierra para bajar los 5 V a 3,33 V.',
        highlightZone: 'Z1',
        highlightNodes: ['UNO A1 (TX)', 'P2 DIVISOR #3 (29–38)'],
        multimeterTest: {
          probes: 'TODO DESCONECTADO (o desconecta A1 temporalmente): mide resistencia entre (32,c) y P2(R1 −) y entre (29,a) y (32,c)',
          scale: 'Ohmios (20 kΩ)',
          expected: '(29,a)↔(32,c) ≈ 1,00 kΩ · (32,c)↔R1 ≈ 2,00 kΩ',
          ifFails: 'Revisa que las patas de las resistencias estén en las columnas exactas 29, 32, 35 y 38.',
        },
      },
      {
        id: 'E5-S2',
        stepNumber: 2,
        title: 'Medir 3,33 V en P2(32,c) y conectar jumper desmontable a ESP32 D2',
        tableItems: [{ item: 'Jumper M-M amarillo (desmontable)', qty: '1' }],
        powerState: 'SOLO 5 V ENCENDIDO',
        actionSentence:
          'Mide 3,33 V ± 0,10 V en P2(32,c) aplicando temporalmente +5 V de P1(R2) en (29,a); luego apaga 5 V, devuelve UNO A1 a (29,a) y conecta P2(32,c) → ESP32 «D2» con 1 jumper M-M amarillo desmontable.',
        origin: 'Nodo P2(32,c)',
        destination: 'ESP32 «D2 (RX)» (desmontable para USB)',
        jumperType: 'M-M',
        wireColor: 'Amarillo / Blanco (I2C / Datos)',
        breadboardCoord: 'P2(32,c) → ESP32 D2',
        simpleExplanation:
          'Comprobamos con el medidor que la salida del divisor da exactamente 3,33 V seguros antes de enchufar el cable al pin D2 del ESP32.',
        highlightZone: 'Z1',
        highlightNodes: ['P2 NODO (32,c) 3,33V', 'ESP32 D2 (RX)'],
        multimeterTest: {
          probes: 'Con 5 V de prueba en (29,a) y D2 desconectado: punta negra en P2(R1), roja en P2(32,c)',
          scale: 'Voltios DC (20 V)',
          expected: '3,23 V – 3,43 V (nominal 3,33 V)',
          ifFails: 'Si marca 5,0 V, falta el jumper negro de (38,a) a P2(R1 −).',
        },
      },
      {
        id: 'E5-S3',
        stepNumber: 3,
        title: 'Conectar UART directo ESP32 D15 (TX) → Arduino UNO A0 (RX)',
        tableItems: [{ item: 'Jumper M-M amarillo', qty: '1' }],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta el pin «D15 (TX)» del ESP32 directamente hacia el pin «A0 (RX)» del Arduino UNO con 1 jumper M-M amarillo.',
        origin: 'ESP32 — Pin «D15»',
        destination: 'Arduino UNO — Pin «A0»',
        jumperType: 'M-M',
        wireColor: 'Amarillo / Blanco (I2C / Datos)',
        simpleExplanation:
          'Este cable lleva mensajes desde el ESP32 (3,3 V) hacia el Arduino UNO (5 V), que sí entiende 3,3 V sin necesitar resistencias.',
        highlightZone: 'Z1',
        highlightNodes: ['ESP32 D15 (TX)', 'UNO A0 (RX)'],
        multimeterTest: {
          probes: 'TODO DESCONECTADO: punta negra en D15 del ESP32 y punta roja en A0 del UNO',
          scale: 'Continuidad (pitido)',
          expected: 'Pitido continuo (< 1 Ω)',
          ifFails: 'Verifica que el cable cruce de D15 a A0 y no quede flojo en el header del Shield.',
        },
      },
    ],
  },
  {
    id: 'E6',
    code: 'E6',
    title: 'E6. Sensores uno por uno (Divisores #1, #2, #4, Pull-up HOME y 3 × FC-33)',
    objective:
      'Armar y verificar individualmente los divisores #1 (c=5), #2 (c=17) y #4 (c=41), el pull-up de HOME (cols 53–55), los sensores US-H, US-V, Hall KY-003 y cada uno de los 3 FC-33.',
    simpleSummary:
      'Construimos las tres escaleritas de resistencias que faltan y conectamos cada sensor uno por uno, probándolo antes de pasar al siguiente.',
    connectList: [
      'Divisor #1 (c=5) + US-H (D19, D23)',
      'Divisor #2 (c=17) + US-V (D5, D18)',
      'Divisor #4 (c=41) + Hall KY-003 (D33)',
      'Pull-up HOME (cols 53–55) → D39',
      'FC-33 Giro → D34 · FC-33 Carro → D35 · FC-33 Gancho → D32',
    ],
    doNotConnectYet: [
      'NO conectes un nodo (c+3,c) al ESP32 hasta medir 3,33 V ± 0,10 V en ese divisor.',
      'NO conectes ningún FC-33 a +5 V (R2); van siempre a +3,3 V (R3).',
    ],
    stageTest:
      'Los 3 divisores miden 3,33 V ± 0,10 V; los 3 FC-33 conmutan 0 V ↔ 3,3 V al tapar la ranura; HOME cambia 3,3 V → 0 V al oprimir.',
    ifFails:
      'Si un FC-33 queda fijo en 3,3 V o 0 V, verifica que la tarjeta de cartulina opaque el haz dentro de la U o gira el pequeño potenciómetro azul del FC-33.',
    steps: [
      {
        id: 'E6-S1',
        stepNumber: 1,
        title: 'Armar y probar Divisor #1 (ECHO US-H) en P2 columnas 5–14',
        tableItems: [
          { item: 'Resistencias de 1 kΩ', qty: '3' },
          { item: 'Jumper M-M negro (GND)', qty: '1' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'En P2 (c=5): inserta Res A de (5,b) a (8,b), Res B de (8,d) a (11,d), Res C de (11,b) a (14,b) y conecta (14,a) → P2(R1 −) con jumper negro; mide 3,33 V en (8,c) aplicando 5 V temporales en (5,a) antes de conectar D23.',
        origin: 'P2 columnas 5, 8, 11, 14',
        destination: 'Nodo P2(8,c) → P2(R1 −) (sin cable a D23 todavía)',
        jumperType: 'Resistencia 1 kΩ',
        wireColor: 'Negro (GND)',
        breadboardCoord: 'P2: (5,b)-(8,b), (8,d)-(11,d), (11,b)-(14,b), (14,a)->R1',
        simpleExplanation:
          'Construimos la primera escalerita de 3 resistencias en las columnas 5 a 14 y medimos que baje 5 V a 3,33 V.',
        highlightZone: 'Z1',
        highlightNodes: ['P2 DIVISOR #1 (5–14)', 'PRUEBA 3,33V (8,c)'],
        multimeterTest: {
          probes: 'Aplica temporalmente +5 V de P1(R2) en (5,a) y mide entre (8,c) y P2(R1 −); luego retira el +5 V de prueba',
          scale: 'Voltios DC (20 V)',
          expected: '3,23 V – 3,43 V (3,33 V nominal)',
          ifFails: 'Revisa que las patas compartan columna en 8 y 11 y que (14,a) llegue a R1 (−).',
        },
      },
      {
        id: 'E6-S2',
        stepNumber: 2,
        title: 'Conectar Sensor Ultrasónico US-H (D19 TRIG y D23 ECHO vía Divisor #1)',
        tableItems: [
          { item: 'Módulo HC-SR04 (US-H)', qty: '1' },
          { item: 'Jumpers M-H (1 rojo, 1 negro, 2 azules) + 1 M-M azul', qty: '5' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta US-H «VCC» → P1(R2 +5V) (rojo), «GND» → P1(R1 −) (negro), «TRIG» → ESP32 «D19» (azul), «ECHO» → P2(5,a) (azul) y del nodo probado P2(8,c) → ESP32 «D23» (azul M-M).',
        origin: 'US-H (VCC, GND, TRIG, ECHO) y P2(8,c)',
        destination: 'P1(R2/R1), ESP32 «D19», P2(5,a) y ESP32 «D23»',
        jumperType: 'M-H',
        wireColor: 'Rojo (+5V), Negro (GND), Azul (Señal)',
        breadboardCoord: 'P2(5,a) y P2(8,c) → D23',
        simpleExplanation:
          'Conectamos el medidor de distancia horizontal del carro pasando su cable de regreso (ECHO) por el divisor de la columna 5.',
        highlightZone: 'Z3',
        highlightNodes: ['US-H (RAÍZ PLUMA)', 'DIV #1 → ESP32 D23/D19'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide entre pines VCC y GND del US-H y comprueba en (8,c) ≤ 3,4 V',
          scale: 'Voltios DC (20 V)',
          expected: '5,00 V ± 0,15 V en VCC del US-H; 0–3,33 V en D23',
          ifFails: 'Desconecta D23 inmediatamente si alguna vez supera 3,5 V y revisa Divisor #1.',
        },
      },
      {
        id: 'E6-S3',
        stepNumber: 3,
        title: 'Armar y probar Divisor #2 (ECHO US-V) en P2 columnas 17–26',
        tableItems: [
          { item: 'Resistencias de 1 kΩ', qty: '3' },
          { item: 'Jumper M-M negro (GND)', qty: '1' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'En P2 (c=17): inserta Res A de (17,b) a (20,b), Res B de (20,d) a (23,d), Res C de (23,b) a (26,b) y conecta (26,a) → P2(R1 −) (negro); mide 3,33 V en (20,c) antes de conectar D18.',
        origin: 'P2 columnas 17, 20, 23, 26',
        destination: 'Nodo P2(20,c) → P2(R1 −)',
        jumperType: 'Resistencia 1 kΩ',
        wireColor: 'Negro (GND)',
        breadboardCoord: 'P2: (17,b)-(20,b), (20,d)-(23,d), (23,b)-(26,b), (26,a)->R1',
        simpleExplanation:
          'Construimos la segunda escalerita protectora en las columnas 17 a 26 y medimos 3,33 V antes de enchufar el ESP32.',
        highlightZone: 'Z1',
        highlightNodes: ['P2 DIVISOR #2 (17–26)', 'PRUEBA 3,33V (20,c)'],
        multimeterTest: {
          probes: 'Aplica temporalmente +5 V en (17,a) y mide entre (20,c) y P2(R1 −); luego retira la prueba',
          scale: 'Voltios DC (20 V)',
          expected: '3,23 V – 3,43 V (3,33 V nominal)',
          ifFails: 'Comprueba continuidad desde (26,a) hasta P2(R1 −) y orden de columnas 17, 20, 23, 26.',
        },
      },
      {
        id: 'E6-S4',
        stepNumber: 4,
        title: 'Conectar Sensor Ultrasónico US-V (D5 TRIG y D18 ECHO vía Divisor #2)',
        tableItems: [
          { item: 'Módulo HC-SR04 (US-V)', qty: '1' },
          { item: 'Jumpers M-H (1 rojo, 1 negro, 2 azules) + 1 M-M azul', qty: '5' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta US-V «VCC» → P1(R2 +5V) (rojo), «GND» → P1(R1 −) (negro), «TRIG» → ESP32 «D5» (azul), «ECHO» → P2(17,a) (azul) y del nodo probado P2(20,c) → ESP32 «D18» (azul M-M).',
        origin: 'US-V (VCC, GND, TRIG, ECHO) y P2(20,c)',
        destination: 'P1(R2/R1), ESP32 «D5», P2(17,a) y ESP32 «D18»',
        jumperType: 'M-H',
        wireColor: 'Rojo (+5V), Negro (GND), Azul (Señal)',
        breadboardCoord: 'P2(17,a) y P2(20,c) → D18',
        simpleExplanation:
          'Conectamos el medidor de altura del gancho pasando su señal de regreso por el divisor de la columna 17.',
        highlightZone: 'Z6',
        highlightNodes: ['US-V (GANCHO Z6)', 'DIV #2 → ESP32 D18/D5'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide tensión entre VCC y GND del US-V',
          scale: 'Voltios DC (20 V)',
          expected: '5,00 V ± 0,15 V DC',
          ifFails: 'Verifica en P1 los cables rojo y negro hacia el US-V.',
        },
      },
      {
        id: 'E6-S5',
        stepNumber: 5,
        title: 'Armar y probar Divisor #4 (Hall S) en P2 columnas 41–50',
        tableItems: [
          { item: 'Resistencias de 1 kΩ', qty: '3' },
          { item: 'Jumper M-M negro (GND)', qty: '1' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'En P2 (c=41): inserta Res A de (41,b) a (44,b), Res B de (44,d) a (47,d), Res C de (47,b) a (50,b) y conecta (50,a) → P2(R1 −) (negro); mide 3,33 V en (44,c) antes de conectar D33.',
        origin: 'P2 columnas 41, 44, 47, 50',
        destination: 'Nodo P2(44,c) → P2(R1 −)',
        jumperType: 'Resistencia 1 kΩ',
        wireColor: 'Negro (GND)',
        breadboardCoord: 'P2: (41,b)-(44,b), (44,d)-(47,d), (47,b)-(50,b), (50,a)->R1',
        simpleExplanation:
          'Armamos la cuarta escalerita en las columnas 41 a 50 para proteger al ESP32 de los 5 V del sensor magnético del gancho.',
        highlightZone: 'Z1',
        highlightNodes: ['P2 DIVISOR #4 (41–50)', 'PRUEBA 3,33V (44,c)'],
        multimeterTest: {
          probes: 'Aplica temporalmente +5 V en (41,a) y mide entre (44,c) y P2(R1 −); luego retira la prueba',
          scale: 'Voltios DC (20 V)',
          expected: '3,23 V – 3,43 V (3,33 V nominal)',
          ifFails: 'Revisa que todas las patas de las 3 resistencias queden firmes en 41, 44, 47 y 50.',
        },
      },
      {
        id: 'E6-S6',
        stepNumber: 6,
        title: 'Conectar Sensor Hall KY-003 al pin ESP32 D33 vía Divisor #4',
        tableItems: [
          { item: 'Módulo Hall KY-003 + imán pequeño', qty: '1' },
          { item: 'Jumpers M-H (1 rojo, 1 negro, 1 azul) + 1 M-M azul', qty: '4' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta KY-003 «+» (centro) → P1(R2 +5V) rojo, «−» → P1(R1 −) negro, «S» → P2(41,a) azul, y del nodo probado P2(44,c) → ESP32 «D33» azul M-M.',
        origin: 'Hall KY-003 (+, −, S) y P2(44,c)',
        destination: 'P1(R2/R1), P2(41,a) y ESP32 «D33»',
        jumperType: 'M-H',
        wireColor: 'Rojo (+5V), Negro (GND), Azul (Señal)',
        breadboardCoord: 'P2(41,a) y P2(44,c) → D33',
        simpleExplanation:
          'Este sensor magnético avisa cuando el gancho llega arriba del todo para que no siga subiendo y choque.',
        highlightZone: 'Z5',
        highlightNodes: ['HALL KY-003 (Z5)', 'DIV #4 → ESP32 D33'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide entre P2(44,c) y P2(R1 −) acercando y alejando el imán por ambas caras',
          scale: 'Voltios DC (20 V)',
          expected: '3,33 V ± 0,10 V sin imán; ≈ 0,0 V al acercar el polo correcto del imán',
          ifFails: 'Voltea el imán 180° (el KY-003 es unipolar y solo responde a un polo magnético).',
        },
      },
      {
        id: 'E6-S7',
        stepNumber: 7,
        title: 'Armar Pull-up externo de HOME en P2 (cols 53–55) y conectar a D39',
        tableItems: [
          { item: 'Resistencia de 1 kΩ (#13)', qty: '1' },
          { item: 'Pulsador táctil HOME + 2 M-M + 2 M-H', qty: '1' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'En P2: inserta la resistencia #13 de 1 kΩ de (53,b) a (55,b); conecta P2(R3 +3,3V) → (53,a) (naranja), (55,a) → ESP32 «D39 (VN)» (azul M-M), y el Pulsador HOME entre (55,c) (azul) y P2(R1 −) (negro).',
        origin: 'P2(R3), Pulsador HOME y P2 cols 53–55',
        destination: 'ESP32 «D39 (VN)» y P2(R1 −)',
        jumperType: 'Resistencia 1 kΩ',
        wireColor: 'Naranja (+3,3V), Azul (Señal), Negro (GND)',
        breadboardCoord: 'P2: R(53,b)-(55,b), R3->(53,a), D39->(55,a), HOME->(55,c)',
        simpleExplanation:
          'El pin D39 no tiene ayuda interna, así que ponemos la última resistencia de 1 kΩ entre 3,3 V y la columna 55 para leer limpio cuando el giro toque el cero.',
        highlightZone: 'Z3',
        highlightNodes: ['PULL-UP P2(53–55) + HOME', 'ESP32 D39 (VN)'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide entre ESP32 D39 y P2(R1 −) en reposo y presionando HOME',
          scale: 'Voltios DC (20 V)',
          expected: '3,30 V ± 0,10 V suelto; < 0,10 V al mantener pulsado HOME',
          ifFails: 'Si siempre marca 0 V sin presionar, usa las patas en diagonal del pulsador HOME.',
        },
      },
      {
        id: 'E6-S8',
        stepNumber: 8,
        title: 'Conectar Encoder óptico FC-33 #1 (Giro) a 3,3 V y ESP32 D34',
        tableItems: [
          { item: 'Sensor óptico FC-33 #1 (Giro)', qty: '1' },
          { item: 'Jumpers M-H (1 naranja, 1 negro, 1 azul)', qty: '3' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta el FC-33 #1 (Giro): «VCC» → P2(R3 +3,3V) (naranja), «GND» → P2(R1 −) (negro) y «OUT» (o D0) directo → ESP32 «D34» (azul).',
        origin: 'P2(R3) y P2(R1)',
        destination: 'FC-33 #1 Giro (VCC, GND) y ESP32 «D34» (OUT)',
        jumperType: 'M-H',
        wireColor: 'Naranja (+3,3V), Negro (GND), Azul (Señal)',
        breadboardCoord: 'P2(R3) y P2(R1)',
        simpleExplanation:
          'Como este ojo óptico funciona a 3,3 V desde el riel R3, su señal entra directo y segura al pin D34 para contar cuánto gira la torre.',
        highlightZone: 'Z3',
        highlightNodes: ['FC-33 #1 GIRO (3,3V)', 'ESP32 D34'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide entre D34 y P2(R1 −) con la ranura en U libre y tapándola con un papel grueso',
          scale: 'Voltios DC (20 V)',
          expected: 'Cambia limpio entre < 0,3 V (libre) y ≈ 3,3 V (tapada)',
          ifFails: 'Revisa que el FC-33 tenga LED encendido; si no cambia, ajusta el tornillo azul del módulo.',
        },
      },
      {
        id: 'E6-S9',
        stepNumber: 9,
        title: 'Conectar Encoder óptico FC-33 #2 (Carro) a 3,3 V y ESP32 D35',
        tableItems: [
          { item: 'Sensor óptico FC-33 #2 (Carro)', qty: '1' },
          { item: 'Jumpers M-H (1 naranja, 1 negro, 1 azul)', qty: '3' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta el FC-33 #2 (Carro): «VCC» → P2(R3 +3,3V) (naranja), «GND» → P2(R1 −) (negro) y «OUT» (o D0) directo → ESP32 «D35» (azul).',
        origin: 'P2(R3) y P2(R1)',
        destination: 'FC-33 #2 Carro (VCC, GND) y ESP32 «D35» (OUT)',
        jumperType: 'M-H',
        wireColor: 'Naranja (+3,3V), Negro (GND), Azul (Señal)',
        breadboardCoord: 'P2(R3) y P2(R1)',
        simpleExplanation:
          'Conectamos el segundo ojo óptico al pin D35 para contar cuántas vueltas da el tambor del carro.',
        highlightZone: 'Z3',
        highlightNodes: ['FC-33 #2 CARRO (3,3V)', 'ESP32 D35'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide entre D35 y P2(R1 −) tapando y destapando la U del FC-33 #2',
          scale: 'Voltios DC (20 V)',
          expected: 'Cambia limpio entre < 0,3 V y ≈ 3,3 V',
          ifFails: 'Confirma que el jumper esté en «OUT»/«D0» y no en el pin «A0» si tu placa trae 4 pines.',
        },
      },
      {
        id: 'E6-S10',
        stepNumber: 10,
        title: 'Conectar Encoder óptico FC-33 #3 (Gancho) a 3,3 V y ESP32 D32',
        tableItems: [
          { item: 'Sensor óptico FC-33 #3 (Gancho)', qty: '1' },
          { item: 'Jumpers M-H (1 naranja, 1 negro, 1 azul)', qty: '3' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta el FC-33 #3 (Gancho): «VCC» → P2(R3 +3,3V) (naranja), «GND» → P2(R1 −) (negro) y «OUT» (o D0) directo → ESP32 «D32» (azul).',
        origin: 'P2(R3) y P2(R1)',
        destination: 'FC-33 #3 Gancho (VCC, GND) y ESP32 «D32» (OUT)',
        jumperType: 'M-H',
        wireColor: 'Naranja (+3,3V), Negro (GND), Azul (Señal)',
        breadboardCoord: 'P2(R3) y P2(R1)',
        simpleExplanation:
          'Conectamos el tercer ojo óptico al pin D32 para medir cuánto sube o baja la cuerda del gancho.',
        highlightZone: 'Z3',
        highlightNodes: ['FC-33 #3 GANCHO (3,3V)', 'ESP32 D32'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V: mide entre D32 y P2(R1 −) tapando y destapando la U del FC-33 #3',
          scale: 'Voltios DC (20 V)',
          expected: 'Cambia limpio entre < 0,3 V y ≈ 3,3 V',
          ifFails: 'Revisa alimentación en P2(R3) y continuidad hasta D32.',
        },
      },
    ],
  },
  {
    id: 'E7',
    code: 'E7',
    title: 'E7. Señales L298N y prueba de los 3 motores uno por uno en vacío',
    objective:
      'Conectar las 6 señales del ESP32 hacia el L298N y probar por separado los motores de Cabrestante, Giro y Carro sobre la mesa sin hilo ni carga.',
    simpleSummary:
      'Conectamos los cables de orden entre el ESP32 y el driver L298N, y probamos cada motor solito sobre la mesa sin cuerdas ni peso.',
    connectList: [
      'ESP32 D25/D26/D27 → L298N ENA/IN1/IN2',
      'ESP32 D14/D13/D4 → L298N ENB/IN3/IN4',
      'Motor Cabrestante → L298N OUT1/OUT2',
      'Motor Giro → L298N OUT3/OUT4',
      'Motor Carro → Shield M1 (PWM ≤ 50 %)',
    ],
    doNotConnectYet: [
      'NO enredes hilos todavía.',
      'NO muevas los 3 motores a la vez (máximo 2 simultáneos).',
    ],
    stageTest:
      'Cada motor gira en ambos sentidos sin reiniciar las placas; corriente en Shield M1 < 0,60 A y suma total < 2,00 A.',
    ifFails: 'Si un motor gira al sentido contrario deseado, intercambia sus dos cables en OUT1/OUT2, OUT3/OUT4 o M1.',
    steps: [
      {
        id: 'E7-S1',
        stepNumber: 1,
        title: 'Conectar señales de control ESP32 → L298N (ENA, IN1, IN2, ENB, IN3, IN4)',
        tableItems: [{ item: 'Jumpers M-H (2 verdes PWM, 4 azules dirección)', qty: '6' }],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta ESP32 «D25» → L298N «ENA» (verde), «D26» → «IN1» (azul), «D27» → «IN2» (azul), «D14» → «ENB» (verde), «D13» → «IN3» (azul) y «D4» → «IN4» (azul).',
        origin: 'ESP32 (D25, D26, D27, D14, D13, D4)',
        destination: 'L298N (ENA, IN1, IN2, ENB, IN3, IN4)',
        jumperType: 'M-H',
        wireColor: 'Verde (PWM / Control) y Azul (Señal)',
        simpleExplanation:
          'Unimos los 6 cablecitos con los que el ESP32 le ordena al módulo L298N hacia dónde y qué tan rápido girar.',
        highlightZone: 'Z1',
        highlightNodes: ['ESP32 D25..D4', 'L298N ENA..IN4'],
        multimeterTest: {
          probes: 'TODO DESCONECTADO: prueba continuidad de cada pin del ESP32 hasta la punta hembra sobre el L298N',
          scale: 'Continuidad (pitido)',
          expected: 'Pitido (< 1 Ω) en los 6 pares y cero cruces entre pines vecinos',
          ifFails: 'Asegúrate de no haber dejado ningún capuchón en ENA o ENB.',
        },
      },
      {
        id: 'E7-S2',
        stepNumber: 2,
        title: 'Conectar y probar en vacío Motor de Cabrestante (L298N OUT1 / OUT2)',
        tableItems: [
          { item: 'Motor Cabrestante 12 V 4 kg·cm', qty: '1' },
          { item: 'Par de cables AWG 20-22 verdes', qty: '2' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta los dos terminales del Motor Cabrestante hacia la bornera «OUT1» y «OUT2» del L298N y prueba su giro en vacío en ambos sentidos al encender 5 V y luego 12 V.',
        origin: 'L298N — Bornes «OUT1» y «OUT2»',
        destination: 'Motor Cabrestante (Z3)',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Verde (PWM / Control)',
        simpleExplanation:
          'Conectamos el motor fuerte que sube el gancho y verificamos que gire suave antes de ponerle la cuerda.',
        highlightZone: 'Z3',
        highlightNodes: ['L298N OUT1/OUT2', 'MOTOR CABRESTANTE'],
        multimeterTest: {
          probes: 'Enciende 5 V y luego 12 V: mide voltaje en OUT1/OUT2 y corriente en serie (escala 10 A) al activar',
          scale: 'Voltios DC (20 V) / Amperios DC (10 A)',
          expected: '±10–12 V según sentido y corriente < 1,5 A en vacío',
          ifFails: 'Verifica que el interruptor general esté en «I» y que ENA reciba señal > 2 V.',
        },
      },
      {
        id: 'E7-S3',
        stepNumber: 3,
        title: 'Conectar y probar en vacío Motor de Giro GA25-370 (L298N OUT3 / OUT4)',
        tableItems: [
          { item: 'Motor Giro GA25-370 (12 V 280 rpm)', qty: '1' },
          { item: 'Par de cables AWG 20-22 verdes', qty: '2' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta los dos terminales del Motor de Giro GA25-370 hacia la bornera «OUT3» y «OUT4» del L298N y prueba su giro en vacío en ambos sentidos al encender 5 V y luego 12 V.',
        origin: 'L298N — Bornes «OUT3» y «OUT4»',
        destination: 'Motor Giro GA25-370 (Z3)',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Verde (PWM / Control)',
        simpleExplanation:
          'Conectamos el motor que hace rotar toda la cabeza de la grúa y comprobamos que gire sin trabas.',
        highlightZone: 'Z3',
        highlightNodes: ['L298N OUT3/OUT4', 'MOTOR GIRO GA25-370'],
        multimeterTest: {
          probes: 'Enciende 5 V y luego 12 V: mide voltaje en OUT3/OUT4 y corriente en serie (10 A)',
          scale: 'Voltios DC (20 V) / Amperios DC (10 A)',
          expected: '±10–12 V según sentido y corriente < 0,8 A en vacío',
          ifFails: 'Apaga 12 V primero si no responde; revisa ENB, IN3 e IN4.',
        },
      },
      {
        id: 'E7-S4',
        stepNumber: 4,
        title: 'Conectar y probar Motor del Carro JGB37-520 (Shield L293D M1, PWM ≤ 50 %)',
        tableItems: [
          { item: 'Motor Carro JGB37-520 (12 V)', qty: '1' },
          { item: 'Par de cables AWG 20-22 verdes', qty: '2' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta los dos terminales del Motor del Carro JGB37-520 hacia la bornera «M1» del Shield L293D y pruébalo en vacío con PWM ≤ 50 %.',
        origin: 'Shield L293D — Bornera «M1»',
        destination: 'Motor Carro JGB37-520 (Z3)',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Verde (PWM / Control)',
        simpleExplanation:
          'Conectamos el motor que mueve el carrito por la pluma y lo probamos a media potencia para cuidar el chip L293D.',
        highlightZone: 'Z3',
        highlightNodes: ['SHIELD L293D M1', 'MOTOR CARRO JGB37-520'],
        multimeterTest: {
          probes: 'Enciende 5 V y luego 12 V: pon el multímetro en 10 A DC en serie con un cable de M1',
          scale: 'Amperios DC (10 A)',
          expected: 'Corriente continua en M1 < 0,60 A con PWM ≤ 50 %',
          ifFails: 'Si supera 0,60 A, reduce el ciclo PWM de M1 (p. ej. de 50 % a 35 %).',
        },
      },
    ],
  },
  {
    id: 'E8',
    code: 'E8',
    title: 'E8. Calibración de Bombillo en M3 y prueba de Electroimán en M2',
    objective:
      'Ajustar el bombillo de corona en Shield M3 con PWM ≈ 40 % para medir 4–5 V efectivos y validar el electroimán de 12 V en M2 con pulso inverso ≤ 80 ms al liberar.',
    simpleSummary:
      'Probamos la luz superior de la grúa a potencia suave para no quemarla y comprobamos que el imán eléctrico agarre y suelte la tapa metálica sin pegarse.',
    connectList: [
      'Bombillo de corona (Z8) → Shield M3 (PWM ≈ 40 %)',
      'Electroimán 12 V 25 N (Z6) → Shield M2',
    ],
    doNotConnectYet: [
      'NO pongas M3 al 100 % de PWM si el bombillo es de 4–6 V o fundirás el filamento.',
    ],
    stageTest:
      'Medir 4,0–5,0 V DC en bornes M3 y ≤ 0,55 A en M2; la arandela ≥ 4 cm debe caer al instante tras pulso inverso ≤ 80 ms.',
    ifFails: 'Baja el PWM de M3 si mide > 5,2 V; ajusta el pulso inverso de M2 entre 40 ms y 80 ms si la carga queda pegada.',
    steps: [
      {
        id: 'E8-S1',
        stepNumber: 1,
        title: 'Conectar Bombillo de corona en Shield M3 y calibrar PWM ≈ 40 %',
        tableItems: [{ item: 'Bombillo con plafón y cables verdes', qty: '1' }],
        powerState: '5 V + 12 V ENCENDIDO',
        actionSentence:
          'Con 12 V apagado («O»), conecta los 2 cables del bombillo hacia la bornera «M3» del Shield L293D; luego enciende 5 V y 12 V con PWM inicial del 40 % y ajusta hasta leer 4,0–5,0 V DC en M3.',
        origin: 'Shield L293D — Bornera «M3»',
        destination: 'Bombillo con plafón (Z8)',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Verde (PWM / Control)',
        simpleExplanation:
          'Regulamos la energía del bombillo con pulsos rápidos (PWM) para que brille bien con 4 a 5 voltios y nunca se funda.',
        highlightZone: 'Z8',
        highlightNodes: ['SHIELD M3 (PWM≈40%)', 'BOMBILLO CORONA (Z8)'],
        multimeterTest: {
          probes: 'Con M3 encendido al ~40 % PWM: punta negra y roja directamente en los dos tornillos de M3',
          scale: 'Voltios DC (20 V)',
          expected: '4,00 V a 5,00 V DC efectivos y luz estable sin parpadeo brusco',
          ifFails: 'Si da > 5,1 V baja el PWM hacia 30–35 %; si da < 3,8 V súbelo ligeramente hacia 45 %.',
        },
      },
      {
        id: 'E8-S2',
        stepNumber: 2,
        title: 'Conectar Electroimán 12 V en Shield M2 y validar pulso inverso ≤ 80 ms',
        tableItems: [
          { item: 'Electroimán 12 V 25 N (cuando esté comprado)', qty: '1' },
          { item: 'Arandela/tapa ferromagnética ≥ 4 cm', qty: '1' },
        ],
        powerState: '5 V + 12 V ENCENDIDO',
        actionSentence:
          'Con 12 V en «O», conecta los 2 cables del electroimán a la bornera «M2» del Shield L293D; al energizar prueba agarre firme y verifica que un pulso de polaridad invertida ≤ 80 ms suelta la arandela al instante.',
        origin: 'Shield L293D — Bornera «M2»',
        destination: 'Electroimán 12 V (Z6)',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Verde (PWM / Control)',
        simpleExplanation:
          'Probamos que el imán eléctrico levante la pieza metálica y luego le damos un toquecito inverso muy corto para que no quede imantado al soltarla.',
        highlightZone: 'Z6',
        highlightNodes: ['SHIELD M2 (±12V)', 'ELECTROIMÁN Z6'],
        multimeterTest: {
          probes: 'Multímetro en serie (10 A DC) en uno de los cables de M2 con el electroimán activado',
          scale: 'Amperios DC (10 A)',
          expected: 'Corriente ≤ 0,55 A continuos y liberación instantánea tras pulso inverso ≤ 80 ms',
          ifFails: 'Si la arandela queda pegada, ajusta la duración del pulso inverso entre 40 ms y 80 ms (nunca > 150 ms).',
        },
      },
    ],
  },
  {
    id: 'E9',
    code: 'E9',
    title: 'E9. Manguera interna Tramo A (22 hilos), Rizo de giro y Tramo B (9 hilos)',
    objective:
      'Rotular y pasar los 22 hilos del Tramo A por el interior del mástil hueco, formar el rizo superior de giro 0–360° y enlazar los 9 hilos del Tramo B mediante bornera en Z3.',
    simpleSummary:
      'Metemos el manojo de 22 cables con etiquetas por dentro de la torre, dejamos una espiral suelta arriba para que gire sin romperse y conectamos los 9 cables que van hacia el carrito.',
    connectList: [
      '22 hilos etiquetados en Tramo A por dentro del mástil Z2',
      'Rizo Ø 6–8 cm, ≥ 1,5 vueltas, reserva ≥ 40 cm + 15 cm por extremo',
      'Bornera de paso Z3 → 9 hilos Tramo B hacia Z5 y Z6',
    ],
    doNotConnectYet: [
      'NO gires la cabeza con los motores todavía; prueba primero el giro 0°–360° con la mano y todo apagado.',
    ],
    stageTest:
      'Continuidad punta a punta en los 22 + 9 hilos y giro manual suave de 0° a 360° sin tirones ni dobleces bruscos.',
    ifFails: 'Agranda la espiral a 8 cm o añade más holgura de cable al rizo si se tensa antes de 360°.',
    steps: [
      {
        id: 'E9-S1',
        stepNumber: 1,
        title: 'Rotular y pasar los 22 hilos de Tramo A por el mástil hueco (Z2) y formar el rizo',
        tableItems: [
          { item: 'Manguera Tramo A (22 conductores rotulados)', qty: '1' },
          { item: 'Eje guía hueco (~15 mm) + cintas etiquetas', qty: '1 juego' },
        ],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Pasa los 22 hilos rotulados de Tramo A (10 potencia verdes, 9 señal azules, 3 comunes negro/naranja/rojo) desde Z1 por dentro del mástil Z2, dejando arriba ≥ 40 cm en espiral de ≥ 1,5 vueltas (Ø 6–8 cm) más 15 cm libres en cada extremo.',
        origin: 'Salida de Caja Z1 → Interior Mástil Z2',
        destination: 'Cabeza Giratoria Z3 (entrada de bornera)',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Verde (10 pot.), Azul (9 señal), Negro/Naranja/Rojo (3 comunes)',
        simpleExplanation:
          'Subimos todos los cables juntos por dentro del tubo central y dejamos arriba un resorte flojo de cables para que la grúa pueda dar la vuelta completa.',
        highlightZone: 'Z2',
        highlightNodes: ['TRAMO A (22 HILOS)', 'RIZO EN Z2/Z3'],
        multimeterTest: {
          probes: 'TODO DESCONECTADO: mide continuidad extremo a extremo de cada uno de los 22 cables etiquetados',
          scale: 'Continuidad (pitido)',
          expected: 'Pitido (< 2 Ω) en los 22 hilos siguiendo sus etiquetas fijas',
          ifFails: 'Usa el pitido para identificar y reetiquetar cualquier hilo antes de atornillar la bornera Z3.',
        },
      },
      {
        id: 'E9-S2',
        stepNumber: 2,
        title: 'Fijar bornera Z3, conectar motores/sensores de cabeza y probar giro manual 0°–360°',
        tableItems: [{ item: 'Bornera de paso en Z3', qty: '1' }],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Atornilla en la bornera de Z3 las llegadas del Tramo A y gira manualmente la cabeza de tope 0° (HOME) a tope 360° verificando cero tensión en el rizo y curvatura ≥ 5× Ø del haz.',
        origin: 'Extremo superior Tramo A (22 hilos)',
        destination: 'Bornera Z3, 3 motores, 3 FC-33, US-H, Bombillo y HOME',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Código completo de colores',
        simpleExplanation:
          'Aseguramos los cables en la regleta de arriba y giramos la grúa con la mano de esquina a esquina para estar seguros de que nada se jala.',
        highlightZone: 'Z3',
        highlightNodes: ['BORNERA Z3', 'GIRO MANUAL 0°–360°'],
        multimeterTest: {
          probes: 'Mantén la prueba mecánica manual y verifica continuidad de la bornera Z3 en los extremos 0° y 360°',
          scale: 'Continuidad (pitido)',
          expected: 'Cero desconexiones al girar entre 0° y 360°; rizo libre sin morderse',
          ifFails: 'Aumenta la reserva de cable en el rizo o suaviza bordes del tubo con cinta o buje.',
        },
      },
      {
        id: 'E9-S3',
        stepNumber: 3,
        title: 'Conectar Tramo B (9 hilos) desde Bornera Z3 hacia Carro Z5 y Gancho Z6',
        tableItems: [{ item: 'Cable flexible Tramo B (9 hilos etiquetados)', qty: '1' }],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Conecta en la bornera de Z3 los 9 hilos flexibles del Tramo B: 3 hacia Hall KY-003 en Carro Z5 (+5V, GND, S), 2 hacia Electroimán Z6 y 4 hacia US-V Z6 (+5V, GND, TRIG, ECHO).',
        origin: 'Bornera de paso en Cabeza Z3',
        destination: 'Carro Z5 (Hall KY-003) y Gancho Z6 (Electroimán + US-V)',
        jumperType: 'Cable bornera (AWG 20-22)',
        wireColor: 'Rojo (+5V), Negro (GND), Azul (Señales), Verde (Electroimán)',
        simpleExplanation:
          'Sacamos desde la regleta de arriba los 9 cablecitos flexibles que viajan hasta el carrito y bajan al gancho.',
        highlightZone: 'Z5',
        highlightNodes: ['BORNERA Z3', 'TRAMO B (Z5 HALL / Z6)'],
        multimeterTest: {
          probes: 'TODO DESCONECTADO: mide continuidad desde P1/P2 en caja Z1 hasta los extremos en Z5 y Z6',
          scale: 'Continuidad (pitido)',
          expected: '< 2 Ω en los 9 hilos del Tramo B; cero cortos entre +5V, +12V y GND',
          ifFails: 'Revisa el apriete de cada tornillo de la bornera Z3 y verifica el sentido correcto de Tramo B.',
        },
      },
    ],
  },
  {
    id: 'E10',
    code: 'E10',
    title: 'E10. Integración total en maqueta (Z1 separada, Z7 autónoma y topes)',
    objective:
      'Instalar las interfaces en la tapa de la caja de control Z1 (separada de la grúa), fijar la tira LED PIR con batería en bodega Z7 y ajustar topes físicos e imán.',
    simpleSummary:
      'Ponemos cada pantalla y botón en su agujero de la caja de control, pegamos la luz automática de la bodega y ajustamos los topes.',
    connectList: [
      'Interfaces fijadas en tapa de Caja Z1 (separada de la contrapluma)',
      'Tira LED PIR con batería instalada en Bodega Z7',
      'Verificación mecánica de tope HOME (0°) e imán frente al Hall',
    ],
    doNotConnectYet: ['NO levantes cargas todavía sin medir r₀ y colocar contrapeso.'],
    stageTest: 'Cero cortocircuitos al cerrar tapa Z1; R2 = 5,0 V, R3 = 3,3 V, R1 = 0 V.',
    ifFails: 'Abre la tapa Z1 de inmediato si al cerrarla algún voltaje cae o se apaga un LED.',
    steps: [
      {
        id: 'E10-S1',
        stepNumber: 1,
        title: 'Fijar electrónica e interfaces en Caja de Control Z1 (separada de la grúa)',
        tableItems: [{ item: 'Caja de Control Z1 con tapa perforada', qty: '1' }],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Asegura ESP32, UNO+Shield, L298N, P1 y P2 en la base de la caja Z1 (nunca en la contrapluma) y fija LCD, OLED A/B, Pot 1/2, PARO, Botones A/B, Interruptor y Kit LED en su tapa.',
        origin: 'Subconjuntos E1–E9 en mesa',
        destination: 'Caja de Control Z1 sobre la tabla base',
        jumperType: 'Verificación física',
        wireColor: 'Sin cables nuevos (fijación mecánica)',
        breadboardCoord: 'P1 y P2 fijadas en base interior de Z1 (cols 1–63, rieles R1/R2/R3 despejados)',
        simpleExplanation:
          'Acomodamos todo ordenadamente dentro de la caja aparte para que ningún cable quede apretado al cerrar la tapa.',
        highlightZone: 'Z1',
        highlightNodes: ['BASE Z1', 'TAPA Z1'],
        multimeterTest: {
          probes: 'Enciende SOLO 5 V después de cerrar la tapa: mide R2 vs R1 y R3 vs R1 en borde accesible o LEDs',
          scale: 'Voltios DC (20 V)',
          expected: 'R2 = 5,00 V ± 0,15 V y R3 = 3,30 V ± 0,10 V estables',
          ifFails: 'Apaga 5 V, abre la tapa y revisa si algún cable de la tapa se soltó o quedó pellizcado.',
        },
      },
      {
        id: 'E10-S2',
        stepNumber: 2,
        title: 'Colocar Tira LED PIR autónoma en Bodega Z7 y ajustar topes HOME / Hall',
        tableItems: [{ item: 'Tira LED con sensor PIR y batería de litio', qty: '1' }],
        powerState: 'TODO DESCONECTADO',
        actionSentence:
          'Fija la tira LED PIR autónoma dentro de la Bodega Z7 (sin conectarla a cables de la grúa) y comprueba mecánicamente que el tope 0° activa limpio el botón HOME y el imán superior activa el Hall.',
        origin: 'Tira PIR Z7 + Levas HOME e Imán Z6',
        destination: 'Bodega Z7, Tope θ = 0° y Tope superior Z5/Z6',
        jumperType: 'Verificación física',
        wireColor: 'Sin cables (autónoma Z7 y ajuste mecánico)',
        simpleExplanation:
          'Pegamos la luz automática con batería en la bodega y ajustamos los topes para que avisen justo al llegar al inicio o arriba del todo.',
        highlightZone: 'Z7',
        highlightNodes: ['TIRA PIR Z7', 'TOPES HOME / HALL'],
        multimeterTest: {
          probes: 'Con 5 V encendido, lleva manualmente la cabeza a 0° midiendo D39 y el gancho arriba midiendo D33',
          scale: 'Voltios DC (20 V)',
          expected: 'D39 pasa a < 0,1 V al tocar tope 0°; D33 pasa a < 0,1 V al subir frente al Hall',
          ifFails: 'Ajusta el tornillo/leva del tope HOME o acerca un poco más el imán del bloque del gancho al KY-003.',
        },
      },
    ],
  },
  {
    id: 'E11',
    code: 'E11',
    title: 'E11. Calibración física (r₀, s_H, e = 3,5 cm, N, D, i)',
    objective:
      'Medir físicamente r₀ con regla, ingresar N, D e i reales en la aplicación, ajustar la orientación de US-H contra la placa plana del carro y confirmar el offset de 3,5 cm en US-V.',
    simpleSummary:
      'Medimos con regla dónde arranca el carrito y cuántas ranuras y centímetros tienen los discos y tambores para que la grúa calcule con precisión.',
    connectList: [
      'Medir r₀ y guardar s_H = r₀ − d_H',
      'Ingresar N_giro, N_carro, N_gancho, D_carro, D_gancho e i en la app',
      'Confirmar e = 3,5 cm de US-V al tocar tapa plana',
    ],
    doNotConnectYet: ['NO ejecutes ciclo automático sin haber guardado r₀, N, D e i.'],
    stageTest: 'Error estático de radio Δr ≤ 5 mm comparando OLED B / app contra regla física en 3 puntos.',
    ifFails: 'Verifica que la placa reflectora en el carro Z5 sea plana, ≥ 4×4 cm y perpendicular al haz de US-H.',
    steps: [
      {
        id: 'E11-S1',
        stepNumber: 1,
        title: 'Medir r₀ con regla, ingresar N/D/i en la app y calibrar s_H en US-H',
        tableItems: [
          { item: 'Regla o flexómetro en cm/mm', qty: '1' },
          { item: 'Termómetro ambiente (°C)', qty: '1' },
        ],
        powerState: 'SOLO 5 V ENCENDIDO',
        actionSentence:
          'Coloca el carro en su tope mínimo r₀, mide la distancia real centro de mástil–gancho con regla, ingresa N, D, i y r₀ en Crane Engineering Studio y comprueba r = d_H + s_H en tres posiciones de la pluma.',
        origin: 'Regla física sobre la pluma (Z4)',
        destination: 'Inicio / Grúa Física (campos POR CONFIRMAR)',
        jumperType: 'Verificación física',
        wireColor: 'Sin cable (calibración)',
        simpleExplanation:
          'Le decimos a la aplicación las medidas exactas de tus discos, tambores y dónde empieza el carrito para que no haya errores de distancia.',
        highlightZone: 'Z4',
        highlightNodes: ['REGLA + US-H', 'PARÁMETROS N/D/i/r₀'],
        multimeterTest: {
          probes: 'Compara 3 posiciones sobre regla (cerca, medio y lejos) contra la mediana de 5 lecturas US-H',
          scale: 'Regla (mm) / Lectura OLED B',
          expected: '|r_medido − r_real| ≤ 5 mm en los tres puntos',
          ifFails: 'Recalcula s_H = r₀ − d_H y endereza la placa reflectora plana en Z5 frente al US-H.',
        },
      },
      {
        id: 'E11-S2',
        stepNumber: 2,
        title: 'Verificar offset vertical e = 3,5 cm de US-V y conteo de pulsos FC-33',
        tableItems: [
          { item: 'Tapa plana de prueba debajo del gancho', qty: '1' },
          { item: 'Regla en mm', qty: '1' },
        ],
        powerState: 'SOLO 5 V ENCENDIDO',
        actionSentence:
          'Apoya la cara del electroimán sobre una tapa plana para verificar que US-V mide d_V = 3,5 cm ± 0,2 cm (Δh = 0), y gira 1 vuelta completa cada tambor/eje contando 2·N flancos en los 3 FC-33.',
        origin: 'Gancho Z6 (US-V) y Discos FC-33 (Z3)',
        destination: 'Calibración vertical y encoders',
        jumperType: 'Verificación física',
        wireColor: 'Sin cable (calibración)',
        simpleExplanation:
          'Comprobamos que el ojo vertical sepa que está montado 3,5 cm arriba del imán y contamos las rayitas de los tres discos al girar una vuelta.',
        highlightZone: 'Z6',
        highlightNodes: ['US-V (e=3,5 cm)', '3×FC-33 (2·N FLANCOS)'],
        multimeterTest: {
          probes: 'Mide distancia física de la cara inferior del US-V a la cara del electroimán + observa cambio 0↔3,3 V en D34/D35/D32 durante 1 vuelta',
          scale: 'Regla (mm) / Voltios DC',
          expected: 'Offset físico e = 3,5 cm y exactamente N pulsos altos + N bajos por vuelta de disco',
          ifFails: 'Ajusta el soporte de US-V hasta quedar 3,5 cm arriba y 2,5 cm al costado del electroimán.',
        },
      },
    ],
  },
  {
    id: 'E12',
    code: 'E12',
    title: 'E12. Prueba en vacío, cálculo de contrapeso y prueba con carga real',
    objective:
      'Probar toda la cinemática sin peso, calcular y colocar el contrapeso mínimo m_cp en la contrapluma Z4, confirmar en tablet/app y correr el ciclo automático con carga real.',
    simpleSummary:
      'Hacemos primero un ensayo completo sin peso, luego ponemos las pesas atrás de la grúa para que no se vuelque y finalmente levantamos y guardamos las cargas reales.',
    connectList: [
      'Prueba manual y automática en vacío',
      'Pesar cargas en gramera y colocar m_cp = 1,1 × máx(mᵢ·rᵢ) ÷ d_cp en Z4',
      'Ciclo automático completo con arandela ≥ 4 cm hacia Bodega Z7',
    ],
    doNotConnectYet: ['PROHIBIDO pulsar TRABAJAR sin confirmar el contrapeso mínimo en Z4.'],
    stageTest:
      'Agarre verificado (sube 2 cm con d_V ≈ 3,5 cm), traslado suave, descenso < 1 cm, pulso inverso ≤ 80 ms y corriente total < 2,00 A.',
    ifFails: 'Presiona Interruptor General («O») o PARO si la corriente alcanza 1,9 A o la torre tiende a inclinarse.',
    steps: [
      {
        id: 'E12-S1',
        stepNumber: 1,
        title: 'Ejecutar ensayo completo en vacío (Manual + Automático sin peso)',
        tableItems: [{ item: 'Mando Bluetooth y Tablet/App', qty: '1 juego' }],
        powerState: '5 V + 12 V ENCENDIDO',
        actionSentence:
          'Con todo libre de peso, enciende primero 5 V y luego 12 V (interruptor «I»), prueba los tres ejes en Manual (máx. 2 motores a la vez) y ejecuta una secuencia completa en vacío hasta retornar a HOME θ = 0°.',
        origin: 'Control Manual / Secuencia en vacío',
        destination: 'Movimiento libre Z3, Z4, Z5, Z6',
        jumperType: 'Verificación física',
        wireColor: 'Sin cambios de cable',
        simpleExplanation:
          'Probamos que todos los motores, topes y el rizo de cables se mueven bien antes de levantar cualquier peso.',
        highlightZone: 'Z4',
        highlightNodes: ['MODO MANUAL', 'SECUENCIA EN VACÍO'],
        multimeterTest: {
          probes: 'Amperímetro en serie (10 A DC) en el cable +12 V principal antes del interruptor',
          scale: 'Amperios DC (10 A)',
          expected: 'Corriente total < 2,00 A en todo el recorrido; cero reinicios de ESP32/UNO',
          ifFails: 'Revisa atascos mecánicos en riel del carro o en el rizo del mástil.',
        },
      },
      {
        id: 'E12-S2',
        stepNumber: 2,
        title: 'Calcular/colocar contrapeso m_cp en Z4 y correr ciclo con carga real',
        tableItems: [
          { item: 'Gramera digital + masas de contrapeso', qty: '1 juego' },
          { item: 'Cargas con arandela ferromagnética ≥ 4 cm', qty: '2–3' },
        ],
        powerState: '5 V + 12 V ENCENDIDO',
        actionSentence:
          'Pesa cada carga mᵢ, calcula m_cp = 1,1 × máx(mᵢ·rᵢ) ÷ d_cp, coloca el contrapeso en la contrapluma Z4, márcalo como confirmado y pulsa TRABAJAR para trasladar las cargas en orden a Bodega Z7.',
        origin: 'Contrapluma Z4 y cargas en suelo',
        destination: 'Bodega Z7',
        jumperType: 'Verificación física',
        wireColor: 'Operación completa',
        simpleExplanation:
          'Ponemos las pesas atrás según la fórmula para equilibrar la grúa y dejamos que recoja y guarde cada carga sola en la bodega.',
        highlightZone: 'Z7',
        highlightNodes: ['CONTRAPESO m_cp (Z4)', 'TRASLADO A BODEGA Z7'],
        multimeterTest: {
          probes: 'Amperímetro en serie en línea +12 V durante el izaje y traslado simultáneo más exigente',
          scale: 'Amperios DC (10 A)',
          expected: 'Corriente pico < 2,00 A; agarre verificado (sube 2 cm con d_V ≈ 3,5 cm); entrega suave',
          ifFails: 'Usa el interruptor general («O») ante cualquier sobrecarga y aumenta el contrapeso m_cp si la torre cabecea.',
        },
      },
    ],
  },
];
