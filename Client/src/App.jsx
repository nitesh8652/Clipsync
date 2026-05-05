import React from 'react'
import ChatInput from './Components/ClipBoard'
import Room from './Components/Ui/Room'
import { Routes, Route } from 'react-router-dom'

const App = () => {
  return (
    <Routes>
      <Route path='/' element={<ChatInput />} />
      <Route path='/roomchat' element={<Room />} />
    </Routes>
  )

}

export default App