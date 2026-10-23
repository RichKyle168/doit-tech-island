import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { SpeechProvider } from './components/Speech.jsx';
import { SourceProvider } from './components/Source.jsx';
import './styles/global.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SpeechProvider>
      <SourceProvider>
        <App />
      </SourceProvider>
    </SpeechProvider>
  </StrictMode>,
);
