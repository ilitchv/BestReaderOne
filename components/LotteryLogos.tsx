
import React from 'react';

interface LogoProps {
    className?: string;
}

// --- USA STATES ---

export const LogoNY: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#005EB8"/>
        <path d="M0 60 Q50 30 100 60" stroke="#FF6600" strokeWidth="12" fill="none"/>
        <text x="50" y="85" fontSize="40" fontWeight="900" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif">NY</text>
        <text x="50" y="35" fontSize="14" fontWeight="bold" fill="#FF6600" textAnchor="middle" fontFamily="Arial, sans-serif" letterSpacing="2">LOTTERY</text>
    </svg>
);

export const LogoFL: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="flGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF9933" />
                <stop offset="100%" stopColor="#FF0066" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#flGrad)"/>
        <path d="M65 20 Q80 40 65 60 L50 90 L35 60 Q20 40 35 20 Z" fill="#FFCC00" opacity="0.9"/>
        <text x="50" y="65" fontSize="45" fontWeight="900" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif" style={{textShadow: '2px 2px 0px rgba(0,0,0,0.2)'}}>FL</text>
    </svg>
);

export const LogoNJ: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="white"/>
        <circle cx="50" cy="50" r="45" fill="#00A346"/>
        <path d="M50 50 L50 10 M50 50 L90 50 M50 50 L50 90 M50 50 L10 50" stroke="white" strokeWidth="2"/>
        <path d="M50 10 Q75 10 85 35 Q75 50 50 50 Q25 50 15 35 Q25 10 50 10" fill="#3CB043" stroke="white" strokeWidth="2"/>
        <path d="M90 50 Q90 75 65 85 Q50 75 50 50" fill="#3CB043" stroke="white" strokeWidth="2"/>
        <path d="M50 90 Q25 90 15 65 Q25 50 50 50" fill="#3CB043" stroke="white" strokeWidth="2"/>
        <text x="50" y="65" fontSize="35" fontWeight="900" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif" style={{textShadow: '1px 1px 2px black'}}>NJ</text>
    </svg>
);

export const LogoGA: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#FF6633"/>
        <path d="M50 5 Q90 5 90 40 Q90 90 50 95 Q10 90 10 40 Q10 5 50 5" fill="#FFCC33"/>
        <path d="M50 10 Q80 10 80 40 Q80 80 50 85 Q20 80 20 40 Q20 10 50 10" fill="url(#gaGrad)"/>
        <defs>
            <radialGradient id="gaGrad" cx="0.3" cy="0.3" r="0.8">
                <stop offset="0%" stopColor="#FFCC33" />
                <stop offset="100%" stopColor="#FF9900" />
            </radialGradient>
        </defs>
        <text x="50" y="62" fontSize="40" fontWeight="900" fill="#006633" textAnchor="middle" fontFamily="Arial, sans-serif">GA</text>
    </svg>
);

export const LogoTX: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="10" fill="#BF0A30"/>
        <path d="M0 0 L33 0 L33 100 L0 100 Z" fill="#002868"/>
        <path d="M33 0 L100 0 L100 50 L33 50 Z" fill="white"/>
        <path d="M16.5 20 L19 30 L30 30 L21 38 L24 48 L16.5 42 L9 48 L12 38 L3 30 L14 30 Z" fill="white"/>
        <text x="66" y="85" fontSize="40" fontWeight="900" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif">TX</text>
    </svg>
);

export const LogoPA: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#FFCC00"/>
        <text x="50" y="45" fontSize="20" fontWeight="bold" fill="#003366" textAnchor="middle">PENN</text>
        <text x="50" y="75" fontSize="30" fontWeight="900" fill="#003366" textAnchor="middle">LOTTERY</text>
    </svg>
);

export const LogoCT: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#003399" rx="15"/>
        <circle cx="50" cy="50" r="40" fill="#FFCC00"/>
        <text x="50" y="65" fontSize="50" fontWeight="900" fill="#003399" textAnchor="middle" fontFamily="Arial, sans-serif">CT</text>
    </svg>
);

// --- NEW USA LOGOS ---

export const LogoDE: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#00539F" rx="15"/>
        <circle cx="50" cy="50" r="42" fill="#FFD100"/>
        <path d="M50 15 L60 40 L85 40 L65 55 L75 80 L50 65 L25 80 L35 55 L15 40 L40 40 Z" fill="#00539F"/>
        <text x="50" y="60" fontSize="30" fontWeight="900" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif" style={{textShadow: '1px 1px 0px black'}}>DE</text>
    </svg>
);

export const LogoMD: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="black"/>
        {/* MD Flag Stylized - Top Left (Yellow/Black) */}
        <path d="M50 50 L50 5 A45 45 0 0 0 5 50 Z" fill="#FFD700"/>
        <path d="M50 50 L27.5 27.5" stroke="black" strokeWidth="10"/>
        {/* Bottom Right (Yellow/Black) */}
        <path d="M50 50 L50 95 A45 45 0 0 0 95 50 Z" fill="#FFD700"/>
        <path d="M50 50 L72.5 72.5" stroke="black" strokeWidth="10"/>
        {/* Top Right (Red/White) */}
        <path d="M50 50 L95 50 A45 45 0 0 0 50 5 Z" fill="#BF0A30"/>
        <path d="M65 20 L80 20 L80 35 L65 35 Z" fill="white"/>
        {/* Bottom Left (Red/White) */}
        <path d="M50 50 L5 50 A45 45 0 0 0 50 95 Z" fill="#BF0A30"/>
        <path d="M20 65 L35 65 L35 80 L20 80 Z" fill="white"/>
        
        <circle cx="50" cy="50" r="22" fill="white" stroke="black" strokeWidth="2"/>
        <text x="50" y="58" fontSize="22" fontWeight="900" fill="black" textAnchor="middle">MD</text>
    </svg>
);

export const LogoSC: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#003366"/> {/* Dark Blue/Green */}
        <path d="M50 10 Q30 40 40 90 L60 90 Q70 40 50 10" fill="white"/> {/* Trunk */}
        <path d="M50 10 Q20 10 10 40 Q30 40 50 20" fill="white"/> {/* Left Frond */}
        <path d="M50 10 Q80 10 90 40 Q70 40 50 20" fill="white"/> {/* Right Frond */}
        <circle cx="75" cy="25" r="8" fill="white" /> {/* Moon */}
        <circle cx="77" cy="23" r="8" fill="#003366" /> {/* Moon cutout */}
        <text x="50" y="80" fontSize="30" fontWeight="900" fill="#003366" textAnchor="middle">SC</text>
    </svg>
);

export const LogoTN: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#CC0000"/>
        <circle cx="50" cy="50" r="35" fill="#002868" stroke="white" strokeWidth="2"/>
        {/* Three Stars */}
        <circle cx="50" cy="35" r="8" fill="white"/>
        <circle cx="35" cy="60" r="8" fill="white"/>
        <circle cx="65" cy="60" r="8" fill="white"/>
        <text x="50" y="58" fontSize="10" fontWeight="bold" fill="#002868" textAnchor="middle">TN</text>
    </svg>
);

export const LogoMI: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#006633" rx="10"/>
        <path d="M10 30 L90 30 L90 70 L10 70 Z" fill="white"/>
        <text x="50" y="60" fontSize="35" fontWeight="900" fill="#006633" textAnchor="middle" fontFamily="Arial, sans-serif" letterSpacing="-2">MICH</text>
        <text x="50" y="20" fontSize="12" fontWeight="bold" fill="white" textAnchor="middle">THE</text>
        <text x="50" y="88" fontSize="12" fontWeight="bold" fill="white" textAnchor="middle">LOTTERY</text>
    </svg>
);

export const LogoVA: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#00205B"/>
        <path d="M20 35 L40 75 L60 35 M50 55 L80 55" stroke="white" strokeWidth="8" strokeLinecap="round"/>
        <text x="70" y="75" fontSize="30" fontWeight="900" fill="#C8102E" textAnchor="middle">A</text>
        <text x="30" y="75" fontSize="30" fontWeight="900" fill="white" textAnchor="middle">V</text>
    </svg>
);

export const LogoNC: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#007FAE" rx="10"/> {/* Blue */}
        <path d="M0 0 L100 0 L100 100 Z" fill="#7AB800" opacity="0.5"/> {/* Green sheen */}
        <circle cx="50" cy="50" r="40" fill="white"/>
        <text x="50" y="60" fontSize="50" fontWeight="900" fill="#007FAE" textAnchor="middle" style={{textShadow: '2px 2px 0px #7AB800'}}>NC</text>
        <text x="50" y="85" fontSize="10" fontWeight="bold" fill="#CF0A2C" textAnchor="middle" letterSpacing="1">EDUCATION</text>
    </svg>
);

export const LogoMA: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#003A70"/>
        <rect x="15" y="40" width="70" height="20" fill="#F2A900"/>
        <text x="50" y="55" fontSize="18" fontWeight="900" fill="#003A70" textAnchor="middle">MASS</text>
        <text x="50" y="30" fontSize="10" fontWeight="bold" fill="white" textAnchor="middle">STATE</text>
        <text x="50" y="80" fontSize="10" fontWeight="bold" fill="white" textAnchor="middle">LOTTERY</text>
    </svg>
);


// --- DOMINICAN REPUBLIC ---

export const LogoReal: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#E31837"/>
        <path d="M20 40 L35 70 L65 70 L80 40 L50 20 Z" fill="#FFD700"/>
        <text x="50" y="60" fontSize="30" fontWeight="900" fill="#E31837" textAnchor="middle" fontFamily="Arial, sans-serif">R</text>
        <text x="50" y="85" fontSize="12" fontWeight="bold" fill="white" textAnchor="middle">REAL</text>
    </svg>
);

export const LogoNacional: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#0055A5"/>
        <path d="M50 10 A40 40 0 0 1 50 90 A40 40 0 0 1 50 10" fill="none" stroke="#FFC72C" strokeWidth="5"/>
        <text x="50" y="65" fontSize="60" fontWeight="900" fill="white" textAnchor="middle" fontFamily="serif">N</text>
    </svg>
);

export const LogoLoteka: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#662D91"/>
        <circle cx="50" cy="50" r="40" fill="white"/>
        <circle cx="35" cy="35" r="8" fill="#ED1C24"/>
        <circle cx="65" cy="35" r="8" fill="#F26522"/>
        <circle cx="35" cy="65" r="8" fill="#8DC63F"/>
        <circle cx="65" cy="65" r="8" fill="#00AEEF"/>
        <text x="50" y="58" fontSize="25" fontWeight="900" fill="#662D91" textAnchor="middle">L</text>
    </svg>
);

export const LogoLeidsa: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#ED1C24"/>
        <rect x="20" y="20" width="60" height="60" fill="black" rx="10"/>
        <text x="50" y="65" fontSize="30" fontWeight="900" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif">QP</text>
    </svg>
);

export const LogoPrimera: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="primeraGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FDB913" />
                <stop offset="100%" stopColor="#F58220" />
            </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="50" fill="url(#primeraGrad)"/>
        <text x="50" y="70" fontSize="60" fontWeight="900" fill="white" textAnchor="middle" fontFamily="Arial, sans-serif" style={{textShadow: '2px 2px 4px rgba(0,0,0,0.3)'}}>P</text>
    </svg>
);

export const LogoSuerte: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#00A651"/>
        <path d="M50 20 L60 40 L80 40 L65 55 L70 75 L50 65 L30 75 L35 55 L20 40 L40 40 Z" fill="white"/>
        <text x="50" y="58" fontSize="20" fontWeight="900" fill="#00A651" textAnchor="middle">LS</text>
    </svg>
);

export const LogoLotedom: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#0054A6"/>
        <path d="M20 20 L80 80" stroke="#8DC63F" strokeWidth="10"/>
        <path d="M80 20 L20 80" stroke="#8DC63F" strokeWidth="10"/>
        <text x="50" y="90" fontSize="16" fontWeight="900" fill="white" textAnchor="middle">DOM</text>
    </svg>
);

export const LogoAnguilla: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#00247D"/>
        <rect y="0" width="100" height="30" fill="white"/>
        <circle cx="50" cy="50" r="25" fill="white"/>
        <path d="M40 50 Q50 30 60 50 Q50 70 40 50" fill="#FFA500"/>
        <path d="M50 35 L50 65" stroke="#00247D" strokeWidth="2"/>
        <path d="M35 50 L65 50" stroke="#00247D" strokeWidth="2"/>
    </svg>
);

export const LogoGeneric: React.FC<LogoProps> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="50" fill="#333"/>
        <text x="50" y="65" fontSize="40" fontWeight="bold" fill="#666" textAnchor="middle">?</text>
    </svg>
);

// --- MAPPING FUNCTION ---

export const getLotteryLogo = (name: string): React.ReactElement | null => {
    if (!name) return null;
    const n = name.toLowerCase();

    const props = { className: "w-full h-full object-contain" };

    // Mapping Logic Updated for New States
    if (n.includes('new york') || n.includes('/ny/')) return <LogoNY {...props} />;
    if (n.includes('florida') || n.includes('/fl/')) return <LogoFL {...props} />;
    if (n.includes('new jersey') || n.includes('/nj/')) return <LogoNJ {...props} />;
    if (n.includes('georgia') || n.includes('/ga/')) return <LogoGA {...props} />;
    if (n.includes('texas') || n.includes('/tx/')) return <LogoTX {...props} />;
    if (n.includes('penn') || n.includes('/pa/')) return <LogoPA {...props} />;
    if (n.includes('connect') || n.includes('/ct/')) return <LogoCT {...props} />;
    
    // New Mappings
    if (n.includes('delaware') || n.includes('/de/')) return <LogoDE {...props} />;
    if (n.includes('maryland') || n.includes('/md/')) return <LogoMD {...props} />;
    if (n.includes('south c') || n.includes('/sc/')) return <LogoSC {...props} />;
    if (n.includes('tennessee') || n.includes('/tn/')) return <LogoTN {...props} />;
    if (n.includes('michigan') || n.includes('/mi/')) return <LogoMI {...props} />;
    if (n.includes('virginia') || n.includes('/va/')) return <LogoVA {...props} />;
    if (n.includes('north c') || n.includes('/nc/')) return <LogoNC {...props} />;
    if (n.includes('massachusetts') || n.includes('/ma/')) return <LogoMA {...props} />;
    
    // Dominican
    if (n.includes('real')) return <LogoReal {...props} />;
    if (n.includes('gana') || n.includes('nacional')) return <LogoNacional {...props} />;
    if (n.includes('loteka')) return <LogoLoteka {...props} />;
    if (n.includes('quiniela') || n.includes('pale')) return <LogoLeidsa {...props} />;
    if (n.includes('primera')) return <LogoPrimera {...props} />;
    if (n.includes('suerte')) return <LogoSuerte {...props} />;
    if (n.includes('lotedom')) return <LogoLotedom {...props} />;
    
    if (n.includes('anguilla')) return <LogoAnguilla {...props} />;

    return null;
};
