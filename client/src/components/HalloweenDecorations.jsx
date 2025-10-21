/**
 * ┌────────────────────────────────────────────────────────────────────────────
 * │ @author                    Alexandre DE FREITAS MARTINS
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @file          HalloweenDecorations.jsx
 * │ @path          client/src/components/HalloweenDecorations.jsx
 * │ @description   Halloween themed decorative elements
 * │ @version       1.0.0
 * │
 * │ @date          2025-10-21
 * ├────────────────────────────────────────────────────────────────────────────
 * │ @copyright     (c) 2025
 * └────────────────────────────────────────────────────────────────────────────
 */

export default function HalloweenDecorations() {
    return (
        <>
            {/* Floating Pumpkins */}
            <div className="halloween-pumpkin" style={{ bottom: '20%', left: '10%' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
                    {/* Pumpkin body */}
                    <ellipse cx="50" cy="55" rx="35" ry="30" fill="#ff8c00" />
                    <ellipse cx="50" cy="55" rx="28" ry="25" fill="#ffa500" />
                    {/* Pumpkin ridges */}
                    <path d="M 50 25 Q 45 55 50 85" stroke="#d2691e" strokeWidth="2" fill="none" />
                    <path d="M 35 30 Q 32 55 35 82" stroke="#d2691e" strokeWidth="1.5" fill="none" />
                    <path d="M 65 30 Q 68 55 65 82" stroke="#d2691e" strokeWidth="1.5" fill="none" />
                    {/* Stem */}
                    <rect x="47" y="20" width="6" height="8" rx="2" fill="#8b4513" />
                    {/* Jack-o'-lantern face */}
                    <circle cx="40" cy="50" r="3" fill="#000" />
                    <circle cx="60" cy="50" r="3" fill="#000" />
                    <path d="M 35 65 Q 50 72 65 65" stroke="#000" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <polygon points="43,62 47,62 45,58" fill="#000" />
                    <polygon points="53,62 57,62 55,58" fill="#000" />
                </svg>
            </div>

            <div className="halloween-pumpkin" style={{ bottom: '30%', right: '15%' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
                    {/* Pumpkin body */}
                    <ellipse cx="50" cy="55" rx="35" ry="30" fill="#ff8c00" />
                    <ellipse cx="50" cy="55" rx="28" ry="25" fill="#ffa500" />
                    {/* Pumpkin ridges */}
                    <path d="M 50 25 Q 45 55 50 85" stroke="#d2691e" strokeWidth="2" fill="none" />
                    <path d="M 35 30 Q 32 55 35 82" stroke="#d2691e" strokeWidth="1.5" fill="none" />
                    <path d="M 65 30 Q 68 55 65 82" stroke="#d2691e" strokeWidth="1.5" fill="none" />
                    {/* Stem */}
                    <rect x="47" y="20" width="6" height="8" rx="2" fill="#8b4513" />
                    {/* Jack-o'-lantern face - different expression */}
                    <polygon points="37,48 43,48 40,52" fill="#000" />
                    <polygon points="57,48 63,48 60,52" fill="#000" />
                    <ellipse cx="50" cy="68" rx="8" ry="5" fill="#000" />
                </svg>
            </div>

            {/* Flying Bat */}
            <div className="halloween-bat" style={{ bottom: '30%', right: '15%' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" fill="none">
                    {/* Bat body */}
                    <ellipse cx="50" cy="35" rx="8" ry="12" fill="var(--mantine-color-bat)" />
                    {/* Bat head */}
                    <circle cx="50" cy="28" r="7" fill="var(--mantine-color-bat)" />
                    {/* Bat ears */}
                    <polygon points="45,22 43,18 47,20" fill="var(--mantine-color-bat)" />
                    <polygon points="55,22 57,18 53,20" fill="var(--mantine-color-bat)" />
                    {/* Left wing */}
                    <path d="M 42 35 Q 20 25 10 35 Q 15 40 25 38 Q 30 42 35 40 Q 40 38 42 40"
                          fill="var(--mantine-color-bat)" stroke="#1a0f08" strokeWidth="0.5">
                        <animate attributeName="d"
                                 dur="0.5s"
                                 repeatCount="indefinite"
                                 values="M 42 35 Q 20 25 10 35 Q 15 40 25 38 Q 30 42 35 40 Q 40 38 42 40;
                                         M 42 35 Q 20 20 10 28 Q 15 35 25 33 Q 30 38 35 36 Q 40 35 42 38;
                                         M 42 35 Q 20 25 10 35 Q 15 40 25 38 Q 30 42 35 40 Q 40 38 42 40" />
                    </path>
                    {/* Right wing */}
                    <path d="M 58 35 Q 80 25 90 35 Q 85 40 75 38 Q 70 42 65 40 Q 60 38 58 40"
                          fill="var(--mantine-color-bat)" stroke="#1a0f08" strokeWidth="0.5">
                        <animate attributeName="d"
                                 dur="0.5s"
                                 repeatCount="indefinite"
                                 values="M 58 35 Q 80 25 90 35 Q 85 40 75 38 Q 70 42 65 40 Q 60 38 58 40;
                                         M 58 35 Q 80 20 90 28 Q 85 35 75 33 Q 70 38 65 36 Q 60 35 58 38;
                                         M 58 35 Q 80 25 90 35 Q 85 40 75 38 Q 70 42 65 40 Q 60 38 58 40" />
                    </path>
                    {/* Eyes */}
                    <circle cx="47" cy="27" r="1.5" fill="#ff6600" />
                    <circle cx="53" cy="27" r="1.5" fill="#ff6600" />
                </svg>
            </div>

            {/* Flying Bat */}
            <div className="halloween-bat">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" fill="none">
                    {/* Bat body */}
                    <ellipse cx="50" cy="35" rx="8" ry="12" fill="var(--mantine-color-bat)" />
                    {/* Bat head */}
                    <circle cx="50" cy="28" r="7" fill="var(--mantine-color-bat)" />
                    {/* Bat ears */}
                    <polygon points="45,22 43,18 47,20" fill="var(--mantine-color-bat)" />
                    <polygon points="55,22 57,18 53,20" fill="var(--mantine-color-bat)" />
                    {/* Left wing */}
                    <path d="M 42 35 Q 20 25 10 35 Q 15 40 25 38 Q 30 42 35 40 Q 40 38 42 40"
                          fill="var(--mantine-color-bat)" stroke="#1a0f08" strokeWidth="0.5">
                        <animate attributeName="d"
                                 dur="0.5s"
                                 repeatCount="indefinite"
                                 values="M 42 35 Q 20 25 10 35 Q 15 40 25 38 Q 30 42 35 40 Q 40 38 42 40;
                                         M 42 35 Q 20 20 10 28 Q 15 35 25 33 Q 30 38 35 36 Q 40 35 42 38;
                                         M 42 35 Q 20 25 10 35 Q 15 40 25 38 Q 30 42 35 40 Q 40 38 42 40" />
                    </path>
                    {/* Right wing */}
                    <path d="M 58 35 Q 80 25 90 35 Q 85 40 75 38 Q 70 42 65 40 Q 60 38 58 40"
                          fill="var(--mantine-color-bat)" stroke="#1a0f08" strokeWidth="0.5">
                        <animate attributeName="d"
                                 dur="0.5s"
                                 repeatCount="indefinite"
                                 values="M 58 35 Q 80 25 90 35 Q 85 40 75 38 Q 70 42 65 40 Q 60 38 58 40;
                                         M 58 35 Q 80 20 90 28 Q 85 35 75 33 Q 70 38 65 36 Q 60 35 58 38;
                                         M 58 35 Q 80 25 90 35 Q 85 40 75 38 Q 70 42 65 40 Q 60 38 58 40" />
                    </path>
                    {/* Eyes */}
                    <circle cx="47" cy="27" r="1.5" fill="#ff6600" />
                    <circle cx="53" cy="27" r="1.5" fill="#ff6600" />
                </svg>
            </div>

            {/* Ghost - subtle floating element */}
            <div style={{
                position: 'fixed',
                bottom: '15%',
                left: '50%',
                width: '35px',
                height: '35px',
                pointerEvents: 'none',
                zIndex: 1,
                opacity: 0.4,
                animation: 'float 8s ease-in-out infinite',
                animationDelay: '1s'
            }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" fill="none">
                    {/* Ghost body */}
                    <path d="M 50 20 Q 30 20 25 40 L 25 90 Q 30 95 35 90 Q 40 85 45 90 Q 50 95 55 90 Q 60 85 65 90 Q 70 95 75 90 L 75 40 Q 70 20 50 20 Z" 
                          fill="#f0f0f0"
                          stroke="#e0e0e0"
                          strokeWidth="1" />
                    {/* Eyes */}
                    <circle cx="42" cy="45" r="4" fill="#333" />
                    <circle cx="58" cy="45" r="4" fill="#333" />
                    {/* Mouth */}
                    <ellipse cx="50" cy="60" rx="8" ry="6" fill="#333" />
                </svg>
            </div>
        </>
    );
};
