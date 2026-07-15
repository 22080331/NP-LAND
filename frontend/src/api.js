export const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
// Ảnh backend trả về có thể là đường dẫn tương đối (/uploads/..) — ghép với BASE.
export const resolveUrl = (u) => (u && u.startsWith("/") ? `${BASE}${u}` : u);
const tok = () => localStorage.getItem("token");
const h = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${tok()}` });

export const api = {
  login: (username, password) =>
    fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    }).then((r) => r.json()),

  list: (filters = {}) => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
    return fetch(`${BASE}/api/properties?${qs}`, { headers: h() }).then((r) => r.json());
  },
  create: (data) =>
    fetch(`${BASE}/api/properties`, { method: "POST", headers: h(), body: JSON.stringify(data) }).then((r) => r.json()),
  update: (id, data) =>
    fetch(`${BASE}/api/properties/${id}`, { method: "PUT", headers: h(), body: JSON.stringify(data) }).then((r) => r.json()),
  remove: (id) =>
    fetch(`${BASE}/api/properties/${id}`, { method: "DELETE", headers: h() }).then((r) => r.json()),

  checkDup: (params) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== ""));
    return fetch(`${BASE}/api/properties/check-dup?${qs}`, { headers: h() }).then((r) => r.json());
  },
  favorite: (id, on) =>
    fetch(`${BASE}/api/properties/${id}/favorite`, { method: on ? "POST" : "DELETE", headers: h() }).then((r) => r.json()),
  propertyDemands: (id) =>
    fetch(`${BASE}/api/properties/${id}/demands`, { headers: h() }).then((r) => r.json()),

  demands: () => fetch(`${BASE}/api/demands`, { headers: h() }).then((r) => r.json()),
  demand: (id) => fetch(`${BASE}/api/demands/${id}`, { headers: h() }).then((r) => r.json()),
  createDemand: (data) =>
    fetch(`${BASE}/api/demands`, { method: "POST", headers: h(), body: JSON.stringify(data) }).then((r) => r.json()),
  updateDemand: (id, data) =>
    fetch(`${BASE}/api/demands/${id}`, { method: "PUT", headers: h(), body: JSON.stringify(data) }).then((r) => r.json()),
  removeDemand: (id) =>
    fetch(`${BASE}/api/demands/${id}`, { method: "DELETE", headers: h() }).then((r) => r.json()),
  demandContacted: (id) =>
    fetch(`${BASE}/api/demands/${id}/contacted`, { method: "POST", headers: h() }).then((r) => r.json()),
  demandCheckDup: (phone, exclude) => {
    const qs = new URLSearchParams(Object.entries({ phone, exclude }).filter(([, v]) => v));
    return fetch(`${BASE}/api/demands/check-dup?${qs}`, { headers: h() }).then((r) => r.json());
  },
  addLog: (id, data) =>
    fetch(`${BASE}/api/demands/${id}/logs`, { method: "POST", headers: h(), body: JSON.stringify(data) }).then((r) => r.json()),
  removeLog: (id, lid) =>
    fetch(`${BASE}/api/demands/${id}/logs/${lid}`, { method: "DELETE", headers: h() }).then((r) => r.json()),

  me: () => fetch(`${BASE}/api/auth/me`, { headers: h() }).then((r) => r.json()),

  listUsers: () => fetch(`${BASE}/api/users`, { headers: h() }).then((r) => r.json()),
  createUser: (data) =>
    fetch(`${BASE}/api/users`, { method: "POST", headers: h(), body: JSON.stringify(data) }).then((r) => r.json()),
  deleteUser: (id) =>
    fetch(`${BASE}/api/users/${id}`, { method: "DELETE", headers: h() }).then((r) => r.json()),
  resetUserPassword: (id, newPw) =>
    fetch(`${BASE}/api/users/${id}/password`, { method: "POST", headers: h(), body: JSON.stringify({ new: newPw }) }).then((r) => r.json()),

  changePassword: (oldPw, newPw) =>
    fetch(`${BASE}/api/auth/change-password`, { method: "POST", headers: h(), body: JSON.stringify({ old: oldPw, new: newPw }) }).then((r) => r.json()),

  aiParse: (text) =>
    fetch(`${BASE}/api/ai-parse`, { method: "POST", headers: h(), body: JSON.stringify({ text }) }).then((r) => r.json()),

  upload: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`${BASE}/api/upload`, { method: "POST", headers: { Authorization: `Bearer ${tok()}` }, body: fd })
      .then((r) => r.json())
      .then((r) => ({ ...r, url: resolveUrl(r.url) }));
  },
};
