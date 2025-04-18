import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import KernelExplorer from './pages/KernelExplorer';
import FeatureMaps from "./pages/FeatureMaps";
import Compare_Models from "./pages/Compare_Models"
import Navbar from './components/Navbar';
import "./App.css"

function App() {
    return (
        <Router>
            <Navbar />
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/kernel" element={<KernelExplorer />} />
                <Route path="/FeatureMaps" element={<FeatureMaps />} />
                <Route path="/Comp" element={<Compare_Models />} />
            </Routes>
        </Router>
    );
}

export default App;
