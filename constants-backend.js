// Backend Constants (CommonJS)

// --- UNIFIED RESULTS CATALOG (Single Source of Truth) ---
const RESULTS_CATALOG = [
    // USA Regular States & User List Mappings
    { id: 'usa/tx/Morning', section: 'usa', lottery: 'Texas', draw: 'Morning', drawTime: '10:44', closeTime: '10:44:33', days: [1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/tx/Day', section: 'usa', lottery: 'Texas', draw: 'Day', drawTime: '13:11', closeTime: '13:11:33', days: [1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/tx/Evening', section: 'usa', lottery: 'Texas', draw: 'Evening', drawTime: '18:44', closeTime: '18:44:33', days: [1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/tx/Night', section: 'usa', lottery: 'Texas', draw: 'Night', drawTime: '22:56', closeTime: '22:56:33', days: [1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/ga/Midday', section: 'usa', lottery: 'Georgia', draw: 'Midday', drawTime: '12:29', closeTime: '12:15:00', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/ga/Evening', section: 'usa', lottery: 'Georgia', draw: 'Evening', drawTime: '18:59', closeTime: '18:40:00', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/ga/Night', section: 'usa', lottery: 'Georgia', draw: 'Night', drawTime: '23:59', closeTime: '23:03:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/md/Midday', section: 'usa', lottery: 'Maryland', draw: 'Midday', drawTime: '12:28', closeTime: '12:12:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/md/Evening', section: 'usa', lottery: 'Maryland', draw: 'Evening', drawTime: '19:56', closeTime: '19:40:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/sc/Midday', section: 'usa', lottery: 'South Carolina', draw: 'Midday', drawTime: '12:59', closeTime: '12:39:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/sc/Evening', section: 'usa', lottery: 'South Carolina', draw: 'Evening', drawTime: '18:59', closeTime: '18:39:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/mi/Day', section: 'usa', lottery: 'Michigan', draw: 'Day', drawTime: '12:59', closeTime: '12:39:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/mi/Night', section: 'usa', lottery: 'Michigan', draw: 'Night', drawTime: '19:29', closeTime: '19:09:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/nj/Midday', section: 'usa', lottery: 'New Jersey', draw: 'Midday', drawTime: '12:59', closeTime: '12:43:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/nj/Evening', section: 'usa', lottery: 'New Jersey', draw: 'Evening', drawTime: '22:57', closeTime: '22:41:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/ny/Midday', section: 'usa', lottery: 'New York', draw: 'Midday', drawTime: '14:30', closeTime: '14:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/ny-horses', section: 'special', lottery: 'New York Horses', draw: 'Midday', drawTime: '14:30', closeTime: '14:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/ny/Evening', section: 'usa', lottery: 'New York', draw: 'Evening', drawTime: '22:30', closeTime: '22:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/pa/Midday', section: 'usa', lottery: 'Pennsylvania', draw: 'Midday', drawTime: '13:35', closeTime: '12:54:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/pa/Evening', section: 'usa', lottery: 'Pennsylvania', draw: 'Evening', drawTime: '18:59', closeTime: '18:44:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/tn/Midday', section: 'usa', lottery: 'Tennessee', draw: 'Midday', drawTime: '12:57', closeTime: '12:57:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/tn/Evening', section: 'usa', lottery: 'Tennessee', draw: 'Evening', drawTime: '18:57', closeTime: '18:57:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/tn/Morning', section: 'usa', lottery: 'Tennessee', draw: 'Morning', drawTime: '09:59', closeTime: '09:39', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'usa/fl/Midday', section: 'usa', lottery: 'Florida', draw: 'Midday', drawTime: '13:30', closeTime: '13:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/fl/Evening', section: 'usa', lottery: 'Florida', draw: 'Evening', drawTime: '21:45', closeTime: '21:29:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/flp2/AM', section: 'usa', lottery: 'Florida Pick 2', draw: 'AM', drawTime: '13:30', closeTime: '13:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'usa/flp2/PM', section: 'usa', lottery: 'Florida Pick 2', draw: 'PM', drawTime: '21:45', closeTime: '21:29:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

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

    { id: 'special/bk/Midday', section: 'special', lottery: 'Brooklyn', draw: 'Midday', drawTime: '14:30', closeTime: '14:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/bk/Evening', section: 'special', lottery: 'Brooklyn', draw: 'Evening', drawTime: '22:30', closeTime: '22:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/front/Midday', section: 'special', lottery: 'Win-4 Front', draw: 'Midday', drawTime: '14:30', closeTime: '14:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/front/Evening', section: 'special', lottery: 'Win-4 Front', draw: 'Evening', drawTime: '22:30', closeTime: '22:14:33', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'rd/real/Mediodía', section: 'rd', lottery: 'Lotería Real', draw: 'Mediodía', drawTime: '12:55', closeTime: '12:35', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/ganamas/Tarde', section: 'rd', lottery: 'Gana Más', draw: 'Tarde', drawTime: '14:30', closeTime: '14:10', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/loteka/Noche', section: 'rd', lottery: 'Loteka', draw: 'Noche', drawTime: '19:55', closeTime: '19:35', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/nacional/Tarde', section: 'rd', lottery: 'Lotería Nacional', draw: 'Tarde', drawTime: '14:30', closeTime: '14:10', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/nacional/Noche', section: 'rd', lottery: 'Lotería Nacional', draw: 'Noche', drawTime: '21:00', closeTime: '20:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/nacional/Domingo', section: 'rd', lottery: 'Lotería Nacional', draw: 'Domingo', drawTime: '18:00', closeTime: '17:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/quiniela/Diario', section: 'rd', lottery: 'Quiniela Palé', draw: 'Diario', drawTime: '20:55', closeTime: '20:35', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/quiniela/Domingo', section: 'rd', lottery: 'Quiniela Palé', draw: 'Domingo', drawTime: '15:55', closeTime: '15:35', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/primer/AM', section: 'rd', lottery: 'La Primera', draw: 'AM', drawTime: '12:00', closeTime: '11:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/primer/PM', section: 'rd', lottery: 'La Primera', draw: 'PM', drawTime: '20:00', closeTime: '19:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/suerte/AM', section: 'rd', lottery: 'La Suerte', draw: 'AM', drawTime: '12:30', closeTime: '12:10', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/suerte/PM', section: 'rd', lottery: 'La Suerte', draw: 'PM', drawTime: '18:00', closeTime: '17:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'rd/lotedom/Tarde', section: 'rd', lottery: 'LoteDom', draw: 'Tarde', drawTime: '13:55', closeTime: '13:35', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'special/extra/Midday', section: 'special', lottery: 'Extra', draw: 'Midday', drawTime: '13:00', closeTime: '12:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/extra/Night', section: 'special', lottery: 'Extra', draw: 'Night', drawTime: '22:00', closeTime: '21:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/anguilla/10AM', section: 'special', lottery: 'Anguilla', draw: '10AM', drawTime: '10:00', closeTime: '09:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/anguilla/1PM', section: 'special', lottery: 'Anguilla', draw: '1PM', drawTime: '13:00', closeTime: '12:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/anguilla/6PM', section: 'special', lottery: 'Anguilla', draw: '6PM', drawTime: '18:00', closeTime: '17:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/anguilla/9PM', section: 'special', lottery: 'Anguilla', draw: '9PM', drawTime: '21:00', closeTime: '20:40', days: [0, 1, 2, 3, 4, 5, 6], visible: true },

    { id: 'special/bk-paper/AM', section: 'special', lottery: 'BK Paper', draw: 'AM', drawTime: '11:30', closeTime: '11:10', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/bk-paper/PM', section: 'special', lottery: 'BK Paper', draw: 'PM', drawTime: '21:30', closeTime: '21:10', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/357/Main', section: 'special', lottery: '3-5-7', draw: 'Main', drawTime: '20:30', closeTime: '20:10', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/pulito', section: 'special', lottery: 'Pulito', draw: 'Diario', drawTime: '23:59', closeTime: '23:50', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
    { id: 'special/venezuela', section: 'special', lottery: 'Venezuela', draw: 'Diario', drawTime: '23:59', closeTime: '23:50', days: [0, 1, 2, 3, 4, 5, 6], visible: true },
];

const CUTOFF_TIMES = {
    "New York AM": "14:18", "New York PM": "22:18", "Georgia Midday": "12:15", "Georgia Evening": "18:40", "Georgia Night": "23:00",
    "New Jersey AM": "12:47", "New Jersey PM": "22:45", "Florida AM": "13:23", "Florida PM": "21:33", "Connect AM": "13:33", "Connect PM": "22:02",
    "Pennsylvania AM": "12:58", "Pennsylvania PM": "18:48", "Brooklyn Midday": "14:20", "Brooklyn Evening": "22:00", "Front Midday": "14:20",
    "Front Evening": "22:00", "New York Horses": "16:00", "Pulito": "23:59", "Venezuela": "23:59", "Texas Morning": "10:38", "Texas Day": "13:05",
    "Texas Evening": "18:38", "Texas Night": "22:50", "Maryland AM": "12:06", "Maryland PM": "19:34", "South C Midday": "12:43", "South C Evening": "18:48",
    "Michigan Day": "12:43", "Michigan Night": "19:13", "Delaware AM": "13:31", "Delaware PM": "19:30", "Tennessee Midday": "13:01", "Tennessee Evening": "19:01",
    "Massachusetts Midday": "13:38", "Massachusetts Evening": "20:38", "Virginia Day": "13:38", "Virginia Night": "22:43", "North Carolina AM": "14:38",
    "North Carolina PM": "23:00", "La Primera": "10:48", "Lotedom": "11:18", "La Suerte": "11:18", "Loteria Real": "11:48", "Gana Mas": "14:18",
    "La Suerte PM": "16:48", "Loteka": "19:13", "Quiniela Pale": "19:43", "Nacional": "19:43"
};

const WAGER_LIMITS = {
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

module.exports = {
    RESULTS_CATALOG,
    CUTOFF_TIMES,
    WAGER_LIMITS
};
