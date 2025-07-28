import React from 'react';
import { Header } from '../components/header';
import { PrimaryButton } from '../components/styled-button';

const HomePage = () => {
  return (
    <div>
      <Header />
      <main>
        <p>Welcome to the home page!</p>
        <PrimaryButton>Click Me!</PrimaryButton>
      </main>
    </div>
  );
};

export default {
  node: <HomePage />,
  rootElementId: 'root'
};