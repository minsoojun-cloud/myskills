import React from 'react';
import ReactDOM from 'react-dom/client';
import { CompositorApp } from './Compositor';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CompositorApp />
  </React.StrictMode>
);
