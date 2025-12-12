
import type { TrackCategory, PrizeTable, CatalogItem } from './types';

export const MAX_PLAYS = 200;

// --- LOGO MAPPING (REMOVED - USING SVG COMPONENTS NOW) ---
export const LOTTERY_LOGOS: { [key: string]: string } = {};

// --- UNIFIED RESULTS CATALOG (Single Source of Truth) ---
export const RESULTS_CATALOG: CatalogItem[] = [
    { id:'usa/ny/Midday',  section:'usa', lottery:'New York', draw:'Midday',  drawTime:'14:30', closeTime:'14:10', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/ny/Evening', section:'usa', lottery:'New York', draw:'Evening', drawTime:'22:30', closeTime:'22:10', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/nj/Midday',  section:'usa', lottery:'New Jersey', draw:'Midday',  drawTime:'12:59', closeTime:'12:39', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/nj/Evening', section:'usa', lottery:'New Jersey', draw:'Evening', drawTime:'22:57', closeTime:'22:37', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/ct/Day', section:'usa', lottery:'Connecticut', draw:'Day', drawTime:'13:57', closeTime:'13:37', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/ct/Night', section:'usa', lottery:'Connecticut', draw:'Night', drawTime:'22:29', closeTime:'22:09', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/fl/Midday', section:'usa', lottery:'Florida', draw:'Midday', drawTime:'13:30', closeTime:'13:10', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/fl/Evening', section:'usa', lottery:'Florida', draw:'Evening', drawTime:'21:45', closeTime:'21:25', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/flp2/AM', section:'usa', lottery:'Florida Pick 2', draw:'AM', drawTime:'13:30', closeTime:'13:10', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/flp2/PM', section:'usa', lottery:'Florida Pick 2', draw:'PM', drawTime:'21:45', closeTime:'21:25', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/ga/Midday',  section:'usa', lottery:'Georgia', draw:'Midday',  drawTime:'12:29', closeTime:'12:09', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/ga/Evening', section:'usa', lottery:'Georgia', draw:'Evening', drawTime:'18:59', closeTime:'18:39', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/ga/Night',  section:'usa', lottery:'Georgia', draw:'Night',  drawTime:'23:59', closeTime:'23:39', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/pa/Day',  section:'usa', lottery:'Pennsylvania', draw:'Day',  drawTime:'13:35', closeTime:'13:15', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/pa/Evening', section:'usa', lottery:'Pennsylvania', draw:'Evening', drawTime:'18:59', closeTime:'18:39', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/de/Day', section:'usa', lottery:'Delaware', draw:'Day', drawTime:'13:58', closeTime:'13:38', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/de/Night', section:'usa', lottery:'Delaware', draw:'Night', drawTime:'19:57', closeTime:'19:37', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/md/AM', section:'usa', lottery:'Maryland', draw:'AM', drawTime:'12:28', closeTime:'12:08', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/md/PM', section:'usa', lottery:'Maryland', draw:'PM', drawTime:'19:56', closeTime:'19:36', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/ma/Midday', section:'usa', lottery:'Massachusetts', draw:'Midday', drawTime:'14:00', closeTime:'13:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/ma/Evening', section:'usa', lottery:'Massachusetts', draw:'Evening', drawTime:'21:00', closeTime:'20:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/mi/Day', section:'usa', lottery:'Michigan', draw:'Day', drawTime:'12:59', closeTime:'12:39', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/mi/Night', section:'usa', lottery:'Michigan', draw:'Night', drawTime:'19:29', closeTime:'19:09', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/va/Day', section:'usa', lottery:'Virginia', draw:'Day', drawTime:'13:59', closeTime:'13:39', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/va/Night', section:'usa', lottery:'Virginia', draw:'Night', drawTime:'23:00', closeTime:'22:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/nc/Day', section:'usa', lottery:'North Carolina', draw:'Day', drawTime:'15:00', closeTime:'14:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/nc/Evening', section:'usa', lottery:'North Carolina', draw:'Evening', drawTime:'23:22', closeTime:'23:02', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/sc/Midday', section:'usa', lottery:'South Carolina', draw:'Midday', drawTime:'12:59', closeTime:'12:39', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/sc/Evening', section:'usa', lottery:'South Carolina', draw:'Evening', drawTime:'18:59', closeTime:'18:39', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/tx/Morning', section:'usa', lottery:'Texas', draw:'Morning', drawTime:'10:00', closeTime:'09:40', days:[1,2,3,4,5,6], visible:true },
    { id:'usa/tx/Day', section:'usa', lottery:'Texas', draw:'Day', drawTime:'12:27', closeTime:'12:07', days:[1,2,3,4,5,6], visible:true },
    { id:'usa/tx/Evening', section:'usa', lottery:'Texas', draw:'Evening', drawTime:'18:00', closeTime:'17:40', days:[1,2,3,4,5,6], visible:true },
    { id:'usa/tx/Night', section:'usa', lottery:'Texas', draw:'Night', drawTime:'22:12', closeTime:'21:52', days:[1,2,3,4,5,6], visible:true },
    { id:'usa/tn/Midday', section:'usa', lottery:'Tennessee', draw:'Midday', drawTime:'12:28', closeTime:'12:08', days:[0,1,2,3,4,5,6], visible:true },
    { id:'usa/tn/Evening', section:'usa', lottery:'Tennessee', draw:'Evening', drawTime:'18:28', closeTime:'18:08', days:[0,1,2,3,4,5,6], visible:true },

    // RD
    { id:'rd/real/Mediodía',   section:'rd', lottery:'Lotería Real',      draw:'Mediodía', drawTime:'12:55', closeTime:'12:35', days:[0,1,2,3,4,5,6], visible:true },
    { id:'rd/ganamas/Tarde',   section:'rd', lottery:'Gana Más',          draw:'Tarde',    drawTime:'14:30', closeTime:'14:10', days:[0,1,2,3,4,5,6], visible:true },
    { id:'rd/loteka/Noche',    section:'rd', lottery:'Loteka',            draw:'Noche',    drawTime:'19:55', closeTime:'19:35', days:[0,1,2,3,4,5,6], visible:true },
    { id:'rd/nacional/Tarde',  section:'rd', lottery:'Lotería Nacional',  draw:'Tarde',    drawTime:'14:30', closeTime:'14:10', days:[0,1,2,3,4,5,6], visible:true },
    { id:'rd/nacional/Noche',  section:'rd', lottery:'Lotería Nacional',  draw:'Noche',    drawTime:'21:00', closeTime:'20:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'rd/nacional/Domingo',section:'rd', lottery:'Lotería Nacional',  draw:'Domingo',  drawTime:'18:00', closeTime:'17:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'rd/quiniela/Diario', section:'rd', lottery:'Quiniela Palé',     draw:'Diario',   drawTime:'20:55', closeTime:'20:35', days:[0,1,2,3,4,5,6], visible:true },
    { id:'rd/quiniela/Domingo',section:'rd', lottery:'Quiniela Palé',     draw:'Domingo',  drawTime:'15:55', closeTime:'15:35', days:[0,1,2,3,4,5,6], visible:true },
    { id:'rd/primer/AM',       section:'rd', lottery:'La Primera',        draw:'AM',       drawTime:'12:00', closeTime:'11:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'rd/primer/PM',       section:'rd', lottery:'La Primera',        draw:'PM',       drawTime:'20:00', closeTime:'19:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'rd/suerte/AM',       section:'rd', lottery:'La Suerte',         draw:'AM',    drawTime:'12:30', closeTime:'12:10', days:[0,1,2,3,4,5,6], visible:true },
    { id:'rd/suerte/PM',       section:'rd', lottery:'La Suerte',         draw:'PM',    drawTime:'18:00', closeTime:'17:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'rd/lotedom/Tarde',   section:'rd', lottery:'LoteDom',           draw:'Tarde',    drawTime:'13:55', closeTime:'13:35', days:[0,1,2,3,4,5,6], visible:true },

    // Special
    { id:'special/extra/Midday', section:'special', lottery:'Extra', draw:'Midday', drawTime:'13:00', closeTime:'12:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/extra/Night', section:'special', lottery:'Extra', draw:'Night', drawTime:'22:00', closeTime:'21:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/anguilla/10AM', section:'special', lottery:'Anguilla', draw:'10AM', drawTime:'10:00', closeTime:'09:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/anguilla/1PM', section:'special', lottery:'Anguilla', draw:'1PM', drawTime:'13:00', closeTime:'12:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/anguilla/6PM', section:'special', lottery:'Anguilla', draw:'6PM', drawTime:'18:00', closeTime:'17:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/anguilla/9PM', section:'special', lottery:'Anguilla', draw:'9PM', drawTime:'21:00', closeTime:'20:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/ny-bk/AM', section:'special', lottery:'NY-BK', draw:'AM', drawTime:'12:00', closeTime:'11:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/ny-bk/PM', section:'special', lottery:'NY-BK', draw:'PM', drawTime:'22:00', closeTime:'21:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/ny-fp/AM', section:'special', lottery:'NY-FP', draw:'AM', drawTime:'12:00', closeTime:'11:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/ny-fp/PM', section:'special', lottery:'NY-FP', draw:'PM', drawTime:'22:00', closeTime:'21:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/ny-bp/AM', section:'special', lottery:'NY-BP', draw:'AM', drawTime:'12:00', closeTime:'11:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/ny-bp/PM', section:'special', lottery:'NY-BP', draw:'PM', drawTime:'22:00', closeTime:'21:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/ny-horses/R1', section:'special', lottery:'NY Horses', draw:'R1', drawTime:'14:00', closeTime:'13:40', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/ny-horses/R2', section:'special', lottery:'NY Horses', draw:'R2', drawTime:'18:30', closeTime:'18:10', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/ny-horses/R3', section:'special', lottery:'NY Horses', draw:'R3', drawTime:'21:30', closeTime:'21:10', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/bk-paper/AM', section:'special', lottery:'BK Paper', draw:'AM', drawTime:'11:30', closeTime:'11:10', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/bk-paper/PM', section:'special', lottery:'BK Paper', draw:'PM', drawTime:'21:30', closeTime:'21:10', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/357/Main', section:'special', lottery:'3-5-7', draw:'Main', drawTime:'20:30', closeTime:'20:10', days:[0,1,2,3,4,5,6], visible:true },
    // ADDED: Explicit entries for Pulito and Venezuela to allow Admin Result Management
    { id:'special/pulito', section:'special', lottery:'Pulito', draw:'Diario', drawTime:'23:59', closeTime:'23:50', days:[0,1,2,3,4,5,6], visible:true },
    { id:'special/venezuela', section:'special', lottery:'Venezuela', draw:'Diario', drawTime:'23:59', closeTime:'23:50', days:[0,1,2,3,4,5,6], visible:true },
];

export const TRACK_CATEGORIES: TrackCategory[] = [
  {
    name: 'USA Regular States',
    tracks: [
      // NY
      { name: 'New York AM', id: 'New York AM' },
      { name: 'New York PM', id: 'New York PM' },
      // GA
      { name: 'Georgia Midday', id: 'Georgia Midday' },
      { name: 'Georgia Evening', id: 'Georgia Evening' },
      { name: 'Georgia Night', id: 'Georgia Night' },
      // NJ
      { name: 'New Jersey AM', id: 'New Jersey AM' },
      { name: 'New Jersey PM', id: 'New Jersey PM' },
      // FL
      { name: 'Florida AM', id: 'Florida AM' },
      { name: 'Florida PM', id: 'Florida PM' },
      // CT
      { name: 'Connect AM', id: 'Connect AM' },
      { name: 'Connect PM', id: 'Connect PM' },
      // PA
      { name: 'Pennsylvania AM', id: 'Pennsylvania AM' },
      { name: 'Pennsylvania PM', id: 'Pennsylvania PM' },
      // Legacy / Specials (Kept as requested)
      { name: 'Brooklyn Midday', id: 'Brooklyn Midday' },
      { name: 'Brooklyn Evening', id: 'Brooklyn Evening' },
      { name: 'Front Midday', id: 'Front Midday' },
      { name: 'Front Evening', id: 'Front Evening' },
      { name: 'New York Horses', id: 'New York Horses' },
      { name: 'Pulito', id: 'Pulito' },
      { name: 'Venezuela', id: 'Venezuela' },
    ],
  },
  {
    name: 'USA New States',
    tracks: [
      // TX
      { name: 'Texas Morning', id: 'Texas Morning' },
      { name: 'Texas Day', id: 'Texas Day' },
      { name: 'Texas Evening', id: 'Texas Evening' },
      { name: 'Texas Night', id: 'Texas Night' },
      // MD
      { name: 'Maryland AM', id: 'Maryland AM' },
      { name: 'Maryland PM', id: 'Maryland PM' },
      // SC
      { name: 'South C Midday', id: 'South C Midday' },
      { name: 'South C Evening', id: 'South C Evening' },
      // MI
      { name: 'Michigan Day', id: 'Michigan Day' },
      { name: 'Michigan Night', id: 'Michigan Night' },
      // DE
      { name: 'Delaware AM', id: 'Delaware AM' },
      { name: 'Delaware PM', id: 'Delaware PM' },
      // TN
      { name: 'Tennessee Midday', id: 'Tennessee Midday' },
      { name: 'Tennessee Evening', id: 'Tennessee Evening' },
      // MA
      { name: 'Massachusetts Midday', id: 'Massachusetts Midday' },
      { name: 'Massachusetts Evening', id: 'Massachusetts Evening' },
      // VA
      { name: 'Virginia Day', id: 'Virginia Day' },
      { name: 'Virginia Night', id: 'Virginia Night' },
      // NC
      { name: 'North Carolina AM', id: 'North Carolina AM' },
      { name: 'North Carolina PM', id: 'North Carolina PM' },
      // COPIES (Requested)
      { name: 'Pulito', id: 'Pulito' },
      { name: 'Venezuela', id: 'Venezuela' },
    ],
  },
  {
    name: 'Santo Domingo',
    tracks: [
      { name: 'La Primera', id: 'La Primera' },
      { name: 'Lotedom', id: 'Lotedom' },
      { name: 'La Suerte', id: 'La Suerte' },
      { name: 'Loteria Real', id: 'Loteria Real' },
      { name: 'Gana Mas', id: 'Gana Mas' },
      { name: 'La Suerte PM', id: 'La Suerte PM' },
      { name: 'Loteka', id: 'Loteka' },
      { name: 'Quiniela Pale', id: 'Quiniela Pale' },
      { name: 'Nacional', id: 'Nacional' },
    ],
  },
];

export const CUTOFF_TIMES: { [key: string]: string } = {
    // USA Regular
    "New York AM": "14:18",
    "New York PM": "22:18",
    "Georgia Midday": "12:02",
    "Georgia Evening": "18:32",
    "Georgia Night": "23:00",
    "New Jersey AM": "12:47",
    "New Jersey PM": "22:45",
    "Florida AM": "13:23",
    "Florida PM": "21:33",
    "Connect AM": "13:33",
    "Connect PM": "22:02",
    "Pennsylvania AM": "12:58",
    "Pennsylvania PM": "18:48",
    // Legacy
    "Brooklyn Midday": "14:20", 
    "Brooklyn Evening": "22:00", 
    "Front Midday": "14:20", 
    "Front Evening": "22:00", 
    "New York Horses": "16:00",
    "Pulito": "23:59",
    "Venezuela": "23:59",

    // USA New
    "Texas Morning": "10:38",
    "Texas Day": "13:05",
    "Texas Evening": "18:38",
    "Texas Night": "22:50",
    "Maryland AM": "12:06",
    "Maryland PM": "19:34",
    "South C Midday": "12:43",
    "South C Evening": "18:48",
    "Michigan Day": "12:43",
    "Michigan Night": "19:13",
    "Delaware AM": "13:31",
    "Delaware PM": "19:30",
    "Tennessee Midday": "13:01",
    "Tennessee Evening": "19:01",
    "Massachusetts Midday": "13:38",
    "Massachusetts Evening": "20:38",
    "Virginia Day": "13:38",
    "Virginia Night": "22:43",
    "North Carolina AM": "14:38",
    "North Carolina PM": "23:00",

    // Santo Domingo
    "La Primera": "10:48",
    "Lotedom": "11:18",
    "La Suerte": "11:18",
    "Loteria Real": "11:48",
    "Gana Mas": "14:18",
    "La Suerte PM": "16:48",
    "Loteka": "19:13",
    "Quiniela Pale": "19:43",
    "Nacional": "19:43",
};

export const WAGER_LIMITS: { [key: string]: { straight: number | null, box: number | null, combo: number | null } } = {
  'Win 4': { straight: 10, box: 30, combo: 10 },
  'Pick 3': { straight: 35, box: 105, combo: 35 },
  'Pick 2': { straight: 100, box: 100, combo: null },
  'RD-Quiniela': { straight: 100, box: 100, combo: null },
  'Venezuela': { straight: 100, box: 100, combo: null },
  'Single Action': { straight: 600, box: null, combo: null },
  'Palé': { straight: 35, box: 105, combo: null },
  'Pale-RD': { straight: 20, box: 105, combo: null },
  'Pulito': { straight: 100, box: 100, combo: null }, // Base limits for Pulito plays
};

export const TERMINAL_GAME_MODES = ['Win 4', 'Palé', 'Pale-RD'];

export const GAME_MODE_LENGTHS: { [key: string]: number } = {
  'Single Action': 1,
  'Pick 2': 2,
  'RD-Quiniela': 2,
  'Venezuela': 2,
  'Pulito': 2, // The bet number itself is 2 digits
  'Pick 3': 3,
  'Win 4': 4,
  'Palé': 5, // e.g., 12-34
  'Pale-RD': 5, // e.g., 12-34
};

// --- PRIZE PAYOUT DEFAULTS (Per $1 Wager) ---
export const DEFAULT_PRIZE_TABLE: PrizeTable = {
    'Pick 3': {
        'STRAIGHT': 700,
        'STRAIGHT_TRIPLE': 500, // Rule: Strictly 500 for triples
        // BOX values are placeholders. The Calculator code handles 700/3 and 700/6 exact logic.
        'BOX_3WAY': 233.33,  
        'BOX_6WAY': 116.66,  
    },
    'Win 4': {
        'STRAIGHT': 5000,
        'BOX_4WAY': 1200, 
        'BOX_6WAY': 800,  
        'BOX_12WAY': 400, 
        'BOX_24WAY': 200  
    },
    'Pick 2': {
        'STRAIGHT': 60,
        'BOX': 30
    },
    'RD-Quiniela': {
        'FIRST': 56,
        'SECOND': 12,
        'THIRD': 4,
        'FIRST_BOX': 28, // 50%
        'SECOND_BOX': 6, // 50%
        'THIRD_BOX': 2   // 50%
    },
    'Venezuela': {
        'FIRST': 55,
        'SECOND': 15,
        'THIRD': 10,
        'FIRST_BOX': 27.5, // 50%
        'SECOND_BOX': 7.5, // 50%
        'THIRD_BOX': 5,    // 50%
    },
    'Palé': {
        'WIN_FULL': 700, // USA Pale Full (Any 2 positions of the 3)
        'WIN_BOX': 175   // USA Pale Box (Permutations)
    },
    'Pale-RD': {
        'WIN_FULL': 1300,   // STRICT: 1st + 2nd
        'WIN_PARCIAL': 200, // STRICT: 1st + 3rd OR 2nd + 3rd
        'BOX_FULL': 325,    // Box match for Full
        'BOX_PARCIAL': 50   // Box match for Parcial
    },
    'Pulito': {
        'STRAIGHT': 80,
        'BOX': 40
    },
    'Single Action': {
        'STRAIGHT': 9
    }
};

export const GAME_RULES_TEXT = [
    {
        title: "Peak 3 (Pick 3)",
        content: `Modalidad de juego de 3 dígitos.
        \n• Straight (Exact Order) New York: $700. (Ej: Juegas 123, sale 123).
        \n• Box (Doble) 3-Way: $700 / 3 (Exacto).
        \n• Box (Sencillo) 6-Way: $700 / 6 (Exacto).
        \n• Straight Triple (000-999): $500 FIJO.
        \n• Combo: Juega todas las combinaciones como Straight.`
    },
    {
        title: "Win Four (Win 4)",
        content: `Modalidad de juego de 4 dígitos.
        \n• Straight (New York): $5,000.
        \n• Box 24-Way: $200.
        \n• Box 12-Way: $400.
        \n• Box 6-Way: $800.
        \n• Box 4-Way: $1,200.
        \n• Combo: Juega todas las combinaciones como Straight.
        \n• Otros Estados: Pagan la MITAD de lo que paga New York.`
    },
    {
        title: "Venezuela",
        content: `Apuestas de 2 dígitos.
        \n• 1era (Pick3 Last 2): $55 (Box $27.5).
        \n• 2da (Win4 First 2): $15 (Box $7.5).
        \n• 3ra (Win4 Last 2): $10 (Box $5).`
    },
    {
        title: "Palé USA (Venezuela Positions)",
        content: `Combinación de dos números (Quinielas).
        \n• Straight ($700): Si tus dos números salen en CUALQUIERA de las 3 posiciones (1+2, 1+3, 2+3).
        \n• Box ($175): Si tus números (o sus inversos) salen en dos posiciones.`
    },
    {
        title: "Pulito (4 Posiciones)",
        content: `Apuesta a posición específica (1-4).
        \n• 1: Pick3 First 2.
        \n• 2: Pick3 Last 2.
        \n• 3: Win4 First 2.
        \n• 4: Win4 Last 2.
        \n• Straight: $80.
        \n• Box: $40.`
    },
    {
        title: "Lotería Santo Domingo (RD)",
        content: `Quinielas y Palés Dominicanos.
        \n• Quiniela: 1era $56 | 2da $12 | 3ra $4. (Box paga 50%).
        \n• Palé Full ($1,300): EXACTO 1era + 2da.
        \n• Palé Parcial ($200): EXACTO (1era + 3ra) Ó (2da + 3ra).
        \n• Palé Box Full ($325) / Parcial ($50).`
    },
    {
        title: "Single Action (Sing. Act.)",
        content: `Apuesta de 1 dígito.
        \n• USA: 7 Posiciones (P3: 1-3, W4: 1-4).
        \n• Horses: 10 Posiciones (Caballos 0-9).
        \n• Pago: $9.`
    }
];
