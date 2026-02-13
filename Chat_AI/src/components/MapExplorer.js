import React from 'react';
import CampusMap from './Chatbot/CampusMap';
import { FaArrowLeft } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const MapExplorer = () => {
  const navigate = useNavigate();

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: '#050505', 
      display: 'flex', 
      flexDirection: 'column',
      color: '#fff',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        padding: '0 10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button 
            onClick={() => navigate('/')}
            style={{ 
              background: '#222', 
              border: '1px solid #444', 
              color: '#fff', 
              padding: '10px', 
              borderRadius: '50%', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Back to Home"
          >
            <FaArrowLeft />
          </button>
          <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 'bold' }}>Campus Map Configurator</h1>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, color: '#00ffcc', fontSize: '12px', fontWeight: 'bold' }}>LIVE PREVIEW MODE</p>
          <p style={{ margin: 0, color: '#666', fontSize: '11px' }}>Edit campus_graph.json and click Sync</p>
        </div>
      </header>

      <main style={{ flex: 1, position: 'relative' }}>
        <CampusMap />
      </main>

      <footer style={{ marginTop: '20px', textAlign: 'center', color: '#444', fontSize: '12px' }}>
        VNR VJIET Campus Genie Infrastructure Configuration View
      </footer>
    </div>
  );
};

export default MapExplorer;
