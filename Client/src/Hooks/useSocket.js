import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function useSocket(token, {
    onNewClip,
    onDeleteClip
} = {}) {

    //Doesn’t trigger re-render when updated
    const socketRef = useRef(null)

    useEffect(() => {

        //no token -> no connection
        if (!token) return


        const socket = io(SOCKET_URL, {
            auth: { token },    //sends token to backend for authentication
            transports: ["websocket"], //avoids polling
            reconnectionAttempts: 5,
            reconnectionDelay: 2000
        })

        socket.on("connect", () => console.log("🔌 Socket connected"))
        socket.on("disconnect", () => console.log("🔌 Socket disconnected"))
        socket.on("connect_error", (err) => console.warn("Socket Err", err.message))

        /**
         @purpose server emits new clip -> hook catches it -> calls onNewClip
         @des ?. optional channing calls function if it exists
         */

        socket.on("clip:new", (clip) => onNewClip?.(clip))
        socket.on("clip:delete", (clipId) => onDeleteClip?.(clipId))

        socketRef.current = socket
        return () => socket.disconnect()

    }, [token])

    //prevents unnecessary re-renders

    const emitNewClip = useCallback((clipId) => {
        socketRef.current?.emit("clip:new", clipId)
    }, [])

    const emitDeleteClip = useCallback((clipId) => {
        socketRef.current?.emit("clip:delete", clipId)
    }, [])

    return {
        emitNewClip,
        emitDeleteClip
    }

}