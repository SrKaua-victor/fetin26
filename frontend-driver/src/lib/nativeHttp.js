import { CapacitorHttp } from "@capacitor/core";
import { getServerUrl, getToken, isNative } from "./api";

/**
 * Envia posições por HTTP nativo, fora da WebView.
 *
 * Por que existe: com o app em segundo plano, o Android estrangula as requisições
 * feitas de dentro da WebView depois de alguns minutos — o socket simplesmente para
 * de entregar. O HTTP nativo não sofre esse limite, então é por ele que as posições
 * saem enquanto a tela está apagada.
 */
export async function postLocations(tripId, points) {
  const url = `${getServerUrl()}/api/driver/locations`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
  const data = { tripId, points };

  if (isNative) {
    const res = await CapacitorHttp.post({ url, headers, data });
    if (res.status >= 400) {
      throw new Error(res.data?.error || `Servidor respondeu ${res.status}`);
    }
    return res.data;
  }

  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(data) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Servidor respondeu ${res.status}`);
  return body;
}
