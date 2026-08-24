// Autenticação simples de motorista: senha com scrypt + token HMAC assinado.
// Usa só o módulo crypto do Node — nenhuma dependência externa.
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHmac,
} from "node:crypto";

const SCRYPT_KEYLEN = 32;
const TOKEN_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas — cobre um turno inteiro

// ─── Senha ────────────────────────────────────────────────────────────────────
export function hashPassword(password) {
  if (!password || String(password).length < 3) {
    throw new Error("Senha deve ter ao menos 3 caracteres");
  }
  const salt = randomBytes(16);
  const hash = scryptSync(String(password), salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password, stored) {
  try {
    const [scheme, saltHex, hashHex] = String(stored).split("$");
    if (scheme !== "scrypt") return false;
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = scryptSync(String(password), salt, expected.length);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// ─── Token ────────────────────────────────────────────────────────────────────
// Formato: base64url(payload).base64url(hmacSha256(payload, secret))
let secret = null;

/** O segredo é gerado uma vez e guardado no banco, então tokens sobrevivem a restarts. */
export function initTokenSecret({ getSetting, setSetting }) {
  secret = process.env.AUTH_SECRET || getSetting("auth_secret");
  if (!secret) {
    secret = randomBytes(32).toString("hex");
    setSetting("auth_secret", secret);
  }
  return secret;
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function sign(payloadB64) {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function signToken({ driverId, name, registration }) {
  const payload = {
    sub: driverId,
    role: "driver",
    name,
    registration,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function signAdminToken(username) {
  const payload = { sub: username, role: "admin", exp: Date.now() + TOKEN_TTL_MS };
  const payloadB64 = b64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** Retorna o payload se o token for válido e não expirado, senão null. */
export function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expected = sign(payloadB64);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString());
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Middleware Express: exige "Authorization: Bearer <token>". */
export function requireDriver(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload || payload.role !== "driver") {
    return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
  }
  req.driver = payload;
  next();
}

export function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const payload = verifyToken(header.startsWith("Bearer ") ? header.slice(7) : null);
  if (!payload || payload.role !== "admin") {
    return res.status(401).json({ error: "Acesso administrativo não autorizado" });
  }
  req.admin = payload;
  next();
}
