import { ForwardIcon, } from 'lucide-react'
import React from 'react'

const Room = () => {
    return (
        <>
            <div className="flex justify-center absolute p-4 cursor-pointer">
                <div
                    className="group flex items-center gap-2 px-2.5 py-3 cursor-pointer bg-[#171716] text-white/85 text-sm font-semibold rounded-2xl border border-[#2C2C2A] hover:border-white/30 hover:bg-[#2C2C2A] hover:-translate-y-px hover:scale-[1.02] active:scale-[0.97] active:translate-y-0 hover:shadow-[0_8px_24px_rgba(0,0,0,0.5)] transition-all duration-200 ease-out relative overflow-hidden"
                >
                    <ForwardIcon className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                    <span className="transition-all duration-200 group-hover:tracking-wide">Room</span>
                </div>
            </div>
        </>
    )
}

export default Room
