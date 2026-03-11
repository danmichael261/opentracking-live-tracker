import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { TrackerPage } from './pages/TrackerPage';

export const App: React.FC = () => (
  <Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/:event/:bib" element={<TrackerPage />} />
  </Routes>
);
