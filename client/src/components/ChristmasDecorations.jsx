/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Alexandre DE FREITAS MARTINS
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file          ChristmasDecorations.jsx
 * │ @path          client/src/components/ChristmasDecorations.jsx
 * │ @description   Christmas themed decorative elements
 * │ @version       1.0.0
 * │
 * │ @date          2025-10-21
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025
 * └────────────────────────────────────────────────────────────────────────────
 */

export default function ChristmasDecorations() {
    return (
        <>
            {/* Floating Snowflakes */}
            <div className="christmas-snowflake" style={{ top: '10%', left: '15%' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
                    <g stroke="#ffffff" strokeWidth="2" opacity="0.8">
                        {/* Main arms */}
                        <line x1="50" y1="20" x2="50" y2="80" />
                        <line x1="20" y1="50" x2="80" y2="50" />
                        {/* Diagonal arms */}
                        <line x1="30" y1="30" x2="70" y2="70" />
                        <line x1="70" y1="30" x2="30" y2="70" />
                        {/* Branch lines */}
                        <line x1="50" y1="35" x2="45" y2="40" />
                        <line x1="50" y1="35" x2="55" y2="40" />
                        <line x1="50" y1="65" x2="45" y2="60" />
                        <line x1="50" y1="65" x2="55" y2="60" />
                        <line x1="35" y1="50" x2="40" y2="45" />
                        <line x1="35" y1="50" x2="40" y2="55" />
                        <line x1="65" y1="50" x2="60" y2="45" />
                        <line x1="65" y1="50" x2="60" y2="55" />
                    </g>
                </svg>
            </div>

            <div className="christmas-snowflake" style={{ top: '25%', right: '20%' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
                    <g stroke="#ffffff" strokeWidth="1.5" opacity="0.6">
                        {/* Main arms */}
                        <line x1="50" y1="25" x2="50" y2="75" />
                        <line x1="25" y1="50" x2="75" y2="50" />
                        {/* Diagonal arms */}
                        <line x1="35" y1="35" x2="65" y2="65" />
                        <line x1="65" y1="35" x2="35" y2="65" />
                        {/* Branch lines */}
                        <line x1="50" y1="40" x2="47" y2="43" />
                        <line x1="50" y1="40" x2="53" y2="43" />
                        <line x1="50" y1="60" x2="47" y2="57" />
                        <line x1="50" y1="60" x2="53" y2="57" />
                        <line x1="40" y1="50" x2="43" y2="47" />
                        <line x1="40" y1="50" x2="43" y2="53" />
                        <line x1="60" y1="50" x2="57" y2="47" />
                        <line x1="60" y1="50" x2="57" y2="53" />
                    </g>
                </svg>
            </div>

            {/* Christmas Tree */}
            <div className="christmas-tree" style={{ bottom: '20%', left: '8%' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 120" fill="none">
                    {/* Tree trunk */}
                    <rect x="35" y="90" width="10" height="20" fill="#8b4513" />
                    {/* Tree layers */}
                    <polygon points="40,20 20,60 60,60" fill="#228b22" />
                    <polygon points="40,35 25,70 55,70" fill="#32cd32" />
                    <polygon points="40,50 30,80 50,80" fill="#006400" />
                    {/* Star on top */}
                    <polygon points="40,15 35,25 40,20 45,25" fill="#ffd700" />
                    {/* Ornaments */}
                    <circle cx="35" cy="45" r="3" fill="#ff0000" />
                    <circle cx="45" cy="55" r="3" fill="#ffd700" />
                    <circle cx="40" cy="70" r="3" fill="#0000ff" />
                </svg>
            </div>

            {/* Christmas Ornament */}
            <div className="christmas-ornament" style={{ bottom: '35%', right: '12%' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 80" fill="none">
                    {/* Ornament body */}
                    <ellipse cx="30" cy="35" rx="20" ry="25" fill="#ff0000" />
                    <ellipse cx="30" cy="35" rx="15" ry="20" fill="#ff4444" />
                    {/* Ornament cap */}
                    <rect x="25" y="15" width="10" height="8" rx="5" fill="#ffd700" />
                    {/* Ornament hook */}
                    <path d="M 30 15 Q 35 10 30 5" stroke="#c0c0c0" strokeWidth="2" fill="none" />
                    {/* Shine effect */}
                    <ellipse cx="25" cy="30" rx="5" ry="8" fill="#ffffff" opacity="0.6" />
                </svg>
            </div>

            {/* Reindeer */}
            <div className="christmas-reindeer" style={{ bottom: '25%', left: '60%' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 80" fill="none">
                    {/* Body */}
                    <ellipse cx="50" cy="50" rx="25" ry="15" fill="#8b4513" />
                    {/* Head */}
                    <circle cx="35" cy="35" r="12" fill="#8b4513" />
                    {/* Antlers */}
                    <line x1="35" y1="25" x2="30" y2="20" stroke="#8b4513" strokeWidth="3" />
                    <line x1="35" y1="25" x2="40" y2="20" stroke="#8b4513" strokeWidth="3" />
                    <line x1="30" y1="20" x2="25" y2="18" stroke="#8b4513" strokeWidth="2" />
                    <line x1="40" y1="20" x2="45" y2="18" stroke="#8b4513" strokeWidth="2" />
                    {/* Eyes */}
                    <circle cx="32" cy="32" r="2" fill="#000" />
                    <circle cx="38" cy="32" r="2" fill="#000" />
                    {/* Nose */}
                    <circle cx="35" cy="38" r="2" fill="#ff0000" />
                    {/* Legs */}
                    <rect x="40" y="55" width="3" height="15" fill="#8b4513" />
                    <rect x="50" y="55" width="3" height="15" fill="#8b4513" />
                    <rect x="60" y="55" width="3" height="15" fill="#8b4513" />
                    <rect x="70" y="55" width="3" height="15" fill="#8b4513" />
                </svg>
            </div>

            {/* Gift Box */}
            <div className="christmas-gift" style={{ bottom: '15%', right: '25%' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60" fill="none">
                    {/* Box */}
                    <rect x="10" y="25" width="40" height="25" fill="#ff0000" />
                    <rect x="15" y="20" width="30" height="30" fill="#ff4444" />
                    {/* Ribbon */}
                    <rect x="28" y="15" width="4" height="40" fill="#ffd700" />
                    <rect x="15" y="33" width="30" height="4" fill="#ffd700" />
                    {/* Bow */}
                    <ellipse cx="30" cy="15" rx="8" ry="5" fill="#ffd700" />
                    <ellipse cx="30" cy="15" rx="5" ry="8" fill="#ffd700" />
                </svg>
            </div>
        </>
    );
};
