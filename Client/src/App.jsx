import React from 'react'
import ClipInput from './Components/ClipBoard'
import RoomChat from './Components/RoomChat'
import { Routes, Route } from 'react-router-dom'

const App = () => {
  return (
    <Routes>
      <Route path='/' element={<ClipInput />} />
      <Route path='/roomchat' element={<RoomChat />} />
    </Routes>
  )

}

export default App