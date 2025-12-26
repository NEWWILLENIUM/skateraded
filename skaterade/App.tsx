import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Feed } from './components/Feed';
import { Editor } from './components/Editor';
import { Profile } from './pages/Profile';
import { Challenges } from './pages/Challenges';

// Placeholder for Search/Discover page
const Discover = () => (
  <div className="p-8 text-center pt-24">
    <h2 className="text-2xl font-display italic text-neutral-500">DISCOVER COMING SOON</h2>
  </div>
);

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Feed />} />
          <Route path="challenges" element={<Challenges />} />
          <Route path="search" element={<Discover />} />
          <Route path="editor" element={<Editor />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
