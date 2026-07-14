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
