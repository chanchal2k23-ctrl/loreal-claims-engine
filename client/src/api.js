const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "content-type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  meta: () => request("/meta"),
  listClaims: () => request("/claims"),
  createClaim: (data) =>
    request("/claims", { method: "POST", body: JSON.stringify(data) }),
  getClaim: (id) => request(`/claims/${id}`),

  evaluate: (id, data) =>
    request(`/claims/${id}/evaluate`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
