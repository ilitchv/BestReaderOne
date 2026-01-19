
import type { TrackCategory, PrizeTable, CatalogItem } from './types';

export const MAX_PLAYS = 200;

// --- LOGO MAPPING (REMOVED - USING SVG COMPONENTS NOW) ---
export const LOTTERY_LOGOS: { [key: string]: string } = {};

// --- UNIFIED RESULTS CATALOG (Single Source of Truth) ---
// --- UNIFIED RESULTS CATALOG (Single Source of Truth) ---
export const RESULTS_CATALOG: CatalogItem[] = [
    // USA Regular States & User List Mappings
    { id: 'usa/tx/Morning', section: 'usa', lottery: 'Texas', draw: 'Morning', drawTime: '10:44', closeTime: '10:44:33', days: [1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/tx/Day', section: 'usa', lottery: 'Texas', draw: 'Day', drawTime: '13:11', closeTime: '13:11:33', days: [1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/tx/Evening', section: 'usa', lottery: 'Texas', draw: 'Evening', drawTime: '18:44', closeTime: '18:44:33', days: [1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/tx/Night', section: 'usa', lottery: 'Texas', draw: 'Night', drawTime: '22:56', closeTime: '22:56:33', days: [1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/ga/Midday', section: 'usa', lottery: 'Georgia', draw: 'Midday', drawTime: '12:29', closeTime: '12:15:00', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/ga/Evening', section: 'usa', lottery: 'Georgia', draw: 'Evening', drawTime: '18:59', closeTime: '18:28:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/ga/Night', section: 'usa', lottery: 'Georgia', draw: 'Night', drawTime: '23:59', closeTime: '23:03:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    // Maryland (AM -> Midday, PM -> Evening as per preference)
    { id: 'usa/md/Midday', section: 'usa', lottery: 'Maryland', draw: 'Midday', drawTime: '12:28', closeTime: '12:12:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/md/Evening', section: 'usa', lottery: 'Maryland', draw: 'Evening', drawTime: '19:56', closeTime: '19:40:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/sc/Midday', section: 'usa', lottery: 'South Carolina', draw: 'Midday', drawTime: '12:59', closeTime: '12:39:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/sc/Evening', section: 'usa', lottery: 'South Carolina', draw: 'Evening', drawTime: '18:59', closeTime: '18:39:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/mi/Day', section: 'usa', lottery: 'Michigan', draw: 'Day', drawTime: '12:59', closeTime: '12:39:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/mi/Night', section: 'usa', lottery: 'Michigan', draw: 'Night', drawTime: '19:29', closeTime: '19:09:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/nj/Midday', section: 'usa', lottery: 'New Jersey', draw: 'Midday', drawTime: '12:59', closeTime: '12:43:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/nj/Evening', section: 'usa', lottery: 'New Jersey', draw: 'Evening', drawTime: '22:57', closeTime: '22:41:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    // New York (Synced with Horses)
    { id: 'usa/ny/Midday', section: 'usa', lottery: 'New York', draw: 'Midday', drawTime: '14:30', closeTime: '14:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/ny-horses', section: 'special', lottery: 'New York Horses', draw: 'Midday', drawTime: '14:30', closeTime: '14:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    // Legacy mapping for NY Race / Horses if needed, but primary is special/ny-horses
    { id: 'usa/ny/Evening', section: 'usa', lottery: 'New York', draw: 'Evening', drawTime: '22:30', closeTime: '22:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/pa/Midday', section: 'usa', lottery: 'Pennsylvania', draw: 'Midday', drawTime: '13:35', closeTime: '12:54:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/pa/Evening', section: 'usa', lottery: 'Pennsylvania', draw: 'Evening', drawTime: '18:59', closeTime: '18:44:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/tn/Midday', section: 'usa', lottery: 'Tennessee', draw: 'Midday', drawTime: '12:57', closeTime: '12:57:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/tn/Evening', section: 'usa', lottery: 'Tennessee', draw: 'Evening', drawTime: '18:57', closeTime: '18:57:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    // Morning kept for completeness if needed, but not in user list explicitly aside from "Tennessee Midday" context impling coverage
    { id: 'usa/tn/Morning', section: 'usa', lottery: 'Tennessee', draw: 'Morning', drawTime: '09:59', closeTime: '09:39', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/fl/Midday', section: 'usa', lottery: 'Florida', draw: 'Midday', drawTime: '13:30', closeTime: '13:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/fl/Evening', section: 'usa', lottery: 'Florida', draw: 'Evening', drawTime: '21:45', closeTime: '21:29:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/ct/Midday', section: 'usa', lottery: 'Connecticut', draw: 'Midday', drawTime: '13:57', closeTime: '13:26:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/ct/Night', section: 'usa', lottery: 'Connecticut', draw: 'Night', drawTime: '22:29', closeTime: '21:58:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/de/Day', section: 'usa', lottery: 'Delaware', draw: 'Day', drawTime: '13:58', closeTime: '13:27:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/de/Night', section: 'usa', lottery: 'Delaware', draw: 'Night', drawTime: '19:57', closeTime: '19:26:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/ma/Midday', section: 'usa', lottery: 'Massachusetts', draw: 'Midday', drawTime: '14:00', closeTime: '13:34:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/ma/Evening', section: 'usa', lottery: 'Massachusetts', draw: 'Evening', drawTime: '21:00', closeTime: '20:34:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/va/Day', section: 'usa', lottery: 'Virginia', draw: 'Day', drawTime: '13:59', closeTime: '13:39:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/va/Night', section: 'usa', lottery: 'Virginia', draw: 'Night', drawTime: '23:00', closeTime: '22:39:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/nc/Day', section: 'usa', lottery: 'North Carolina', draw: 'Day', drawTime: '15:00', closeTime: '14:44:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/nc/Evening', section: 'usa', lottery: 'North Carolina', draw: 'Evening', drawTime: '23:22', closeTime: '23:06:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    // Derived / Special
    { id: 'special/bk/Midday', section: 'special', lottery: 'Brooklyn', draw: 'Midday', drawTime: '14:30', closeTime: '14:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/bk/Evening', section: 'special', lottery: 'Brooklyn', draw: 'Evening', drawTime: '22:30', closeTime: '22:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/front/Midday', section: 'special', lottery: 'Win-4 Front', draw: 'Midday', drawTime: '14:30', closeTime: '14:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/front/Evening', section: 'special', lottery: 'Win-4 Front', draw: 'Evening', drawTime: '22:30', closeTime: '22:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    // RD
    { id: 'rd/real/Mediodía', section: 'rd', lottery: 'Lotería Real', draw: 'Mediodía', drawTime: '12:55', closeTime: '12:35', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/ganamas/Tarde', section: 'rd', lottery: 'Gana Más', draw: 'Tarde', drawTime: '14:30', closeTime: '14:10', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/loteka/Noche', section: 'rd', lottery: 'Loteka', draw: 'Noche', drawTime: '19:55', closeTime: '19:35', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/leidsa/Noche', section: 'rd', lottery: 'Leidsa Quiniela Palé', draw: 'Noche', drawTime: '20:55', closeTime: '20:35', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/nacional/Noche', section: 'rd', lottery: 'Lotería Nacional', draw: 'Noche', drawTime: '21:00', closeTime: '20:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    // Consolidate: Quiniela Palé Removed
    { id: 'rd/primer/AM', section: 'rd', lottery: 'La Primera', draw: 'AM', drawTime: '12:00', closeTime: '11:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/primer/Noche', section: 'rd', lottery: 'La Primera', draw: 'PM', drawTime: '20:00', closeTime: '19:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/suerte/AM', section: 'rd', lottery: 'La Suerte', draw: 'AM', drawTime: '12:30', closeTime: '12:10', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/suerte/PM', section: 'rd', lottery: 'La Suerte', draw: 'PM', drawTime: '18:00', closeTime: '17:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/lotedom/Tarde', section: 'rd', lottery: 'LoteDom', draw: 'Tarde', drawTime: '13:55', closeTime: '13:35', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    // King Lottery
    { id: 'rd/king/Dia', section: 'rd', lottery: 'King Lottery', draw: 'Dia', drawTime: '12:30', closeTime: '12:10', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/king/Noche', section: 'rd', lottery: 'King Lottery', draw: 'Noche', drawTime: '19:30', closeTime: '19:10', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    // Anguilla (Moved to RD Section)
    { id: 'rd/anguila/10', section: 'rd', lottery: 'Anguilla', draw: '10 AM', drawTime: '10:00', closeTime: '09:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/anguila/13', section: 'rd', lottery: 'Anguilla', draw: '1 PM', drawTime: '13:00', closeTime: '12:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/anguila/18', section: 'rd', lottery: 'Anguilla', draw: '6 PM', drawTime: '18:00', closeTime: '17:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/anguila/21', section: 'rd', lottery: 'Anguilla', draw: '9 PM', drawTime: '21:00', closeTime: '20:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    // Special
    { id: 'special/extra/Midday', section: 'special', lottery: 'Extra', draw: 'Midday', drawTime: '13:00', closeTime: '12:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/extra/Night', section: 'special', lottery: 'Extra', draw: 'Night', drawTime: '22:00', closeTime: '21:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    // NY Horses / Races Legacy & Special
    // Replaced generic 'NY Horses' with the Unified 'special/ny-horses' above. Keeping special/bk-paper for legacy.
    { id: 'special/bk-paper/AM', section: 'special', lottery: 'BK Paper', draw: 'AM', drawTime: '11:30', closeTime: '11:10', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/bk-paper/PM', section: 'special', lottery: 'BK Paper', draw: 'PM', drawTime: '21:30', closeTime: '21:10', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/357/Main', section: 'special', lottery: '3-5-7', draw: 'Main', drawTime: '20:30', closeTime: '20:10', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/pulito', section: 'special', lottery: 'Pulito', draw: 'Diario', drawTime: '23:59', closeTime: '23:50', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/venezuela', section: 'special', lottery: 'Venezuela', draw: 'Diario', drawTime: '23:59', closeTime: '23:50', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
];

export const TRACK_CATEGORIES: TrackCategory[] = [
    {
        name: 'USA Regular States',
        tracks: [
            // NY
            { name: 'New York Midday', id: 'usa/ny/Midday' },
            { name: 'New York Evening', id: 'usa/ny/Evening' },
            // NY Horses (Added)
            { name: 'New York Horses', id: 'special/ny-horses' },

            // GA
            { name: 'Georgia Midday', id: 'usa/ga/Midday' },
            { name: 'Georgia Evening', id: 'usa/ga/Evening' },
            { name: 'Georgia Night', id: 'usa/ga/Night' },
            // NJ
            { name: 'New Jersey Midday', id: 'usa/nj/Midday' },
            { name: 'New Jersey Evening', id: 'usa/nj/Evening' },
            // FL
            { name: 'Florida Midday', id: 'usa/fl/Midday' },
            { name: 'Florida Evening', id: 'usa/fl/Evening' },
            // CT
            { name: 'Connecticut Midday', id: 'usa/ct/Midday' },
            { name: 'Connecticut Night', id: 'usa/ct/Night' },
            // PA
            { name: 'Pennsylvania Midday', id: 'usa/pa/Midday' },
            { name: 'Pennsylvania Evening', id: 'usa/pa/Evening' },

            // DERIVED / SPECIALS (Brooklyn & Front) - Kept accessible
            { name: 'Brooklyn Midday', id: 'special/bk/Midday' },
            { name: 'Brooklyn Evening', id: 'special/bk/Evening' },
            { name: 'Win-4 Front AM', id: 'special/front/Midday' },
            { name: 'Win-4 Front PM', id: 'special/front/Evening' },

            // SPECIAL MODES (Hidden from Dashboard)
            { name: 'Pulito', id: 'special/pulito', hideInDashboard: true },
            { name: 'Venezuela', id: 'special/venezuela', hideInDashboard: true },
        ],
    },
    {
        name: 'USA New States',
        tracks: [
            // TX
            { name: 'Texas Morning', id: 'usa/tx/Morning' },
            { name: 'Texas Day', id: 'usa/tx/Day' },
            { name: 'Texas Evening', id: 'usa/tx/Evening' },
            { name: 'Texas Night', id: 'usa/tx/Night' },

            // MD
            { name: 'Maryland Midday', id: 'usa/md/Midday' },
            { name: 'Maryland Evening', id: 'usa/md/Evening' },
            // SC
            { name: 'South C Midday', id: 'usa/sc/Midday' },
            { name: 'South C Evening', id: 'usa/sc/Evening' },
            // MI
            { name: 'Michigan Day', id: 'usa/mi/Day' },
            { name: 'Michigan Night', id: 'usa/mi/Night' },
            // DE
            { name: 'Delaware Day', id: 'usa/de/Day' },
            { name: 'Delaware Night', id: 'usa/de/Night' },
            // TN
            { name: 'Tennessee Morning', id: 'usa/tn/Morning' },
            { name: 'Tennessee Midday', id: 'usa/tn/Midday' },
            { name: 'Tennessee Evening', id: 'usa/tn/Evening' },
            // MA
            { name: 'Mass Midday', id: 'usa/ma/Midday' },
            { name: 'Mass Evening', id: 'usa/ma/Evening' },
            // VA
            { name: 'Virginia Day', id: 'usa/va/Day' },
            { name: 'Virginia Night', id: 'usa/va/Night' },
            // NC
            { name: 'North C Day', id: 'usa/nc/Day' },
            { name: 'North C Evening', id: 'usa/nc/Evening' },

            // SPECIAL MODES (Moved to end)
            { name: 'Pulito', id: 'special/pulito', hideInDashboard: true },
            { name: 'Venezuela', id: 'special/venezuela', hideInDashboard: true },
        ],
    },
    {
        name: 'Santo Domingo',
        tracks: [
            { name: 'La Primera AM', id: 'rd/primer/AM' },
            { name: 'La Primera PM', id: 'rd/primer/Noche' },
            { name: 'La Suerte AM', id: 'rd/suerte/AM' },
            { name: 'La Suerte PM', id: 'rd/suerte/PM' },
            { name: 'Lotería Real', id: 'rd/real/Mediodía' },
            { name: 'Gana Más', id: 'rd/ganamas/Tarde' },
            { name: 'LoteDom', id: 'rd/lotedom/Tarde' },
            { name: 'Loteka', id: 'rd/loteka/Noche' },
            { name: 'Leidsa Quiniela Palé', id: 'rd/leidsa/Noche' },
            { name: 'Nacional Noche', id: 'rd/nacional/Noche' },
            { name: 'KING LOTTERY AM', id: 'rd/king/Dia' },
            { name: 'KING LOTTERY PM', id: 'rd/king/Noche' },
            { name: 'Anguilla 10AM', id: 'rd/anguila/10' },
            { name: 'Anguilla 1PM', id: 'rd/anguila/13' },
            { name: 'Anguilla 6PM', id: 'rd/anguila/18' },
            { name: 'Anguilla 9PM', id: 'rd/anguila/21' }
        ],
    },
    {
        name: 'High Frequency Games',
        tracks: [
            // Logic handled by HighFrequencySelector, but we list a base set for validation or Fallback
            // Note: The UI will dynamically generate these, but having them in ID map helps.
            // Actuall listing them here ensures they show up if we reverted to Grid view.
            { name: 'Top Pick', id: 'special/top-pick' },
            { name: 'Instant Cash', id: 'special/instant-cash' }
        ]
    }
];

export const CUTOFF_TIMES: { [key: string]: string } = {
    // USA Regular
    "New York AM": "14:18",
    "New York PM": "22:18",
    "Georgia Midday": "12:15",
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
    "Nacional": "19:43"
};

export const WAGER_LIMITS: Record<string, { STRAIGHT: number; BOX: number; COMBO: number }> = {
    "Pick 3": { "STRAIGHT": 35, "BOX": 105, "COMBO": 35 },
    "Win 4": { "STRAIGHT": 10, "BOX": 30, "COMBO": 10 },
    "Pick 2": { "STRAIGHT": 100, "BOX": 100, "COMBO": 100 },
    "Palé": { "STRAIGHT": 35, "BOX": 105, "COMBO": 35 },
    "Palé-RD": { "STRAIGHT": 20, "BOX": 105, "COMBO": 20 },
    "Venezuela": { "STRAIGHT": 100, "BOX": 100, "COMBO": 100 },
    "RD-Quiniela": { "STRAIGHT": 100, "BOX": 100, "COMBO": 100 },
    "Pulito": { "STRAIGHT": 100, "BOX": 100, "COMBO": 100 },
    "Single Action": { "STRAIGHT": 600, "BOX": 0, "COMBO": 0 },
};

export const TERMINAL_GAME_MODES = ['Win 4', 'Palé', 'Palé-RD'];

export const GAME_MODE_LENGTHS: { [key: string]: number } = {
    'Single Action': 1,
    'Pick 2': 2,
    'RD-Quiniela': 2,
    'Venezuela': 2,
    'Pulito': 2, // The bet number itself is 2 digits
    'Pick 3': 3,
    'Win 4': 4,
    'Palé': 5, // e.g., 12-34
    'Palé-RD': 5, // e.g., 12-34
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
        'STRAIGHT_QUAD': 3000, // Rule: 3000 for quadruples
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
    },
    'Top Pick': {
        'P2_STR': 95,
        'P2_BOX': 47.5,
        'P3_STR': 900,
        'P3_BOX': 300,
        'P3_BOX6': 150,
        'P4_STR': 7000,
        'P4_STR_QUAD': 3000,
        'P4_BOX4': 1800,
        'P4_BOX6': 1175,
        'P4_BOX12': 600,
        'P4_BOX24': 300,
        'P5_STR': 50000,
        'P5_BOX5': 10000,
        'P5_BOX10': 5000,
        'P5_BOX20': 2500,
        'P5_BOX30': 1175,
        'P5_BOX60': 830,
        'P5_BOX120': 416,
        'VEN_1ST': 75,
        'VEN_2ND': 15,
        'VEN_3RD': 10,
        'PALE': 2000
    },
    'Instant Cash': {
        'P2_STR': 95,
        'P2_BOX': 47.5,
        'P3_STR': 900,
        'P3_BOX': 300,
        'P3_BOX6': 150,
        'P4_STR': 7000,
        'P4_STR_QUAD': 3000,
        'P4_BOX4': 1800,
        'P4_BOX6': 1175,
        'P4_BOX12': 600,
        'P4_BOX24': 300,
        'P5_STR': 50000,
        'P5_BOX5': 10000,
        'P5_BOX10': 5000,
        'P5_BOX20': 2500,
        'P5_BOX30': 1175,
        'P5_BOX60': 830,
        'P5_BOX120': 416,
        'VEN_1ST': 75,
        'VEN_2ND': 15,
        'VEN_3RD': 10,
        'PALE': 2000
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
        content: `Quiniela: 1era $56 | 2da $12 | 3ra $4. (Box paga 50%).
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
