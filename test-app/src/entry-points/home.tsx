import React from 'react'
import { Header } from '../components/header'
import { PrimaryButton } from '../components/styled-button'
import { Script } from 'react-static-render/components/script'

const HomePage = () => {
  return (
    <div>
      <Header />
      <main>
        <p>Welcome to the home page!</p>
        <PrimaryButton>Click Me!</PrimaryButton>
      </main>
      <Script fn={() => {}} />
    </div>
  )
}

export default {
  node: <HomePage />,
  rootElementId: 'root'
}