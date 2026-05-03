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

/**
 * @description upload a file to server -> cloudinary
 * sends multipart form data so multer could process it 
 */

export async function uploadClipFile(file, { iconBg = "#f0fdf4", iconColor = "#22c55e" }) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("iconBg", iconBg);
    formData.append("iconColor", iconColor);
    const res = await fetch(`${API_URL}/clips/upload`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
    });
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Upload failed");
    }
    return res.json()
}