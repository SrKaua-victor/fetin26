import { Capacitor } from "@capacitor/core";

/** true quando rodando dentro do app Android/iOS, false no navegador. */
export const isNative = Capacitor.isNativePlatform();

const TOKEN_KEY = "bustrack.driver.token";
const SERVER_KEY = "bustrack.driver.server";

// O endereço embutido no build (VITE_SERVER_URL) só vale para o APK, que não tem
// servidor próprio. No navegador o padrão é sempre a mesma origem: em dev o Vite faz
// proxy de /api e /socket.io para a 3001, e o build servido pelo backend já está lá.
// Os dois casos saem do mesmo `dist`, por isso a decisão é em tempo de execução.
const DEFAULT_SERVER = isNative ? import.meta.env.VITE_SERVER_URL || "" : "";

/**
 * Normaliza o que o motorista digitar:
 *   "192.168.0.5:3001" → "http://192.168.0.5:3001"   (rede local, sem certificado)
 *   "meu-servidor.com" → "https://meu-servidor.com"  (servidor publicado)
 *
 * O padrão antigo era http:// para tudo, de quando o servidor só existia na rede
 * local. Com o backend publicado na internet isso quebrava o login de quem digitava
 * só o nome do host — e o erro que aparecia mandava conferir se estava "na mesma rede".
 */
export function normalizeServerUrl(value) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const isLocal = /^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?$/i.test(trimmed);
  return `${isLocal ? "http" : "https"}://${trimmed}`;
}

export function getServerUrl() {
  return normalizeServerUrl(localStorage.getItem(SERVER_KEY) || DEFAULT_SERVER);
}

export function setServerUrl(url) {
  const normalized = normalizeServerUrl(url);
  if (normalized) localStorage.setItem(SERVER_KEY, normalized);
  else localStorage.removeItem(SERVER_KEY);
  return normalized;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * O plano gratuito do ngrok intercepta requisições que parecem vir de um
 * navegador e devolve uma página de aviso no lugar da resposta. Como essa página
 * não traz cabeçalhos CORS, o fetch falha e o app relata "não foi possível falar
 * com o servidor" — mesmo com o servidor no ar e o endereço correto. Este header
 * desliga a interceptação. É ignorado por qualquer outro servidor.
 */
const SKIP_TUNNEL_WARNING = { "ngrok-skip-browser-warning": "true" };

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { ...SKIP_TUNNEL_WARNING };
  if (body) headers["Content-Type"] = "application/json";
  if (auth) headers.Authorization = `Bearer ${getToken()}`;

  let res;
  try {
    res = await fetch(`${getServerUrl()}/api${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      isNative
        ? `Não foi possível falar com ${getServerUrl() || "o servidor"}. Toque em Servidor, abaixo do botão Entrar, para conferir o endereço.`
        : "Não foi possível falar com o servidor"
    );
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || "Não foi possível falar com o servidor");
    error.status = res.status;
    throw error;
  }
  return data;
}

export function login(registration, password) {
  return request("/driver/login", { method: "POST", body: { registration, password } });
}

export function me() {
  return request("/driver/me", { auth: true });
}

export function getVehicles() {
  return request("/vehicles?active=1");
}

export function getRoutes() {
  return request("/routes");
}
