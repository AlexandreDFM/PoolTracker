/**
 * Session cookie. The JWT is kept in an HttpOnly cookie, so page scripts
 * (and an XSS) cannot read it. SameSite=Strict keeps it off cross-site
 * requests; the client is served from the same origin as the API.
 */

const COOKIE_NAME = 'pt_session';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // same as the JWT expiry

const cookieOptions = () => ({
    httpOnly: true,
    // Plain HTTP only in local development (http://localhost)
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api'
});

exports.setSessionCookie = (res, token) => {
    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: MAX_AGE_MS });
};

exports.clearSessionCookie = (res) => {
    res.clearCookie(COOKIE_NAME, cookieOptions());
};

const readCookie = (req, name) => {
    const header = req.headers.cookie;
    if (!header) return null;
    for (const part of header.split(';')) {
        const index = part.indexOf('=');
        if (index === -1) continue;
        if (part.slice(0, index).trim() === name) {
            try {
                return decodeURIComponent(part.slice(index + 1).trim());
            } catch (error) {
                return null;
            }
        }
    }
    return null;
};

// Session cookie first; a Bearer header is still accepted (scripts, and the
// one-time migration of tokens stored by older clients)
exports.readSessionToken = (req) => {
    const cookieToken = readCookie(req, COOKIE_NAME);
    if (cookieToken) return cookieToken;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice('Bearer '.length).trim() || null;
    }
    return null;
};
