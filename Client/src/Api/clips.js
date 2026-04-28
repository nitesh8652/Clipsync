const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function getToken() {
    return localStorage.getItem("token");
}

function authHeaders() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
    };
}

export async function fetchClips() {
    const res = await fetch(`${API_URL}/clips`, { headers: authHeaders() });
   if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Something went wrong");
}
    return res.json(); // { clips: [...] }
}

export async function createClip(clipData) {
    const res = await fetch(`${API_URL}/clips`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(clipData), //The browser doesn’t know how to convert this into a format the server understands -> converts object into string
    });
    if (!res.ok) throw new Error("Failed to create clip");
    return res.json(); // { clip }
}

export async function deleteClip(id) {
    const res = await fetch(`${API_URL}/clips/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to delete clip");
    return res.json();
}