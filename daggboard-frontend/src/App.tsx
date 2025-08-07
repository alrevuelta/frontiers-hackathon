import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from './components/HomePage';
import { RollupDetailPage } from './components/RollupDetailPage';
import './index.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rollup/:rollupId" element={<RollupDetailPage />} />
      </Routes>
    </Router>
  );
}

export default App;