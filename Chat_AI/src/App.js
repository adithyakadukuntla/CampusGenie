import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Chatbot from './components/Chatbot/Chatbot';
import MapExplorer from './components/MapExplorer';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={
            <>
              <header style={{ padding: '20px', textAlign: 'center' }}>
                <h1 style={{ color: '#00ffcc', margin: 0 }}>VNR VJIET CampusGenie</h1>
                <p style={{ color: '#666', fontSize: '14px' }}>Your AI-powered campus assistant</p>
              </header>
              <Chatbot />
            </>
          } />
          <Route path="/college_map" element={<MapExplorer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
