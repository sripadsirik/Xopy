import { Toaster } from 'react-hot-toast';
import Dashboard from './components/Dashboard';

export default function App() {
  return (
    <>
      <Dashboard />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(22, 20, 28, 0.92)',
            backdropFilter: 'blur(12px)',
            color: '#ece7df',
            border: '1px solid rgba(200, 170, 110, 0.2)',
            fontSize: '11px',
            fontFamily: "'Inter', sans-serif",
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 15px rgba(212,168,83,0.06)',
            padding: '12px 16px',
          },
          success: {
            style: { borderColor: 'rgba(106, 171, 138, 0.3)' },
            iconTheme: { primary: '#6aab8a', secondary: '#0d0b11' },
          },
          error: {
            style: {
              borderColor: 'rgba(199, 80, 80, 0.3)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(199,80,80,0.08)',
            },
            iconTheme: { primary: '#c75050', secondary: '#0d0b11' },
          },
        }}
      />
    </>
  );
}
