import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useSocket(token, {
    onNewClip,
    onDeleteClip
} = {}) {
    const socketRef = useRef(null)

    useEffect(() => {
        if (!token) return

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ["websocket"],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000
        })

        socket.on("connect", () => console.log("🔌 Socket connected"))
        socket.on("disconnect", () => console.log("🔌 Socket disconnected"))
        socket.on("connect_error", (err) => console.warn("Socket Err", err.message))

        socket.on("clip:new", (clip) => onNewClip?.(clip))
        socket.on("clip:delete", (clipId) => onDeleteClip?.(clipId))

        socketRef.current = socket
        return () => socket.disconnect()

    }, [token])

    const emitNewClip = useCallback((clipId)=>{
        socketRef.current?.emit("clip:new",clipId)
    },[])

    const emitDeleteClip = useCallback((clipId)=>{
        socketRef.current?.emit("clip:delete",clipId)
    },[])

    return{
        emitNewClip,

        emitDeleteClip
}

}