import React from 'react'
import { Footer } from '../components/footer'

const AboutPage = () => {
  return (
    <div>
      <h1>About Us</h1>
      <p>This is the about page.</p>
      <Footer />
    </div>
  )
}

export default {
  node: <AboutPage />,
  rootElementId: 'root'
}