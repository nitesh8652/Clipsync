import React from 'react'
import ClipInput from './Components/ClipBoard'

import { Routes, Route } from 'react-router-dom'

const App = () => {
  return (
    <Routes>
      <Route path='/' element={<ClipInput />} />
  
    </Routes>
  )

}

export default App