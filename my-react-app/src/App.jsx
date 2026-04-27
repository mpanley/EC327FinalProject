import { useState } from 'react'
import './App.css'

import GameScreen from "./components/GameScreen";
import StatBar from './components/StatBar';

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <GameScreen />
    </>
  )

}

export default App
