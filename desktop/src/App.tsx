import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { getCurrentUser } from './store/authSlice';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ArticleList from './pages/ArticleList';
import ArticleEditor from './pages/ArticleEditor';
import VideoList from './pages/VideoList';
import VideoEditor from './pages/VideoEditor';
import MediaLibrary from './pages/MediaLibrary';
import PlatformManager from './pages/PlatformManager';
import PublishHistory from './pages/PublishHistory';
import Settings from './pages/Settings';
import Layout from './components/Layout';
import NotFound from './pages/NotFound';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, token } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (token) dispatch(getCurrentUser());
  }, [dispatch, token]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AppContent: React.FC = () => (
  <Router>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout><Navigate to="/dashboard" replace /></Layout></PrivateRoute>} />
      <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
      <Route path="/articles" element={<PrivateRoute><Layout><ArticleList /></Layout></PrivateRoute>} />
      <Route path="/articles/new" element={<PrivateRoute><Layout><ArticleEditor /></Layout></PrivateRoute>} />
      <Route path="/articles/:id/edit" element={<PrivateRoute><Layout><ArticleEditor /></Layout></PrivateRoute>} />
      <Route path="/videos" element={<PrivateRoute><Layout><VideoList /></Layout></PrivateRoute>} />
      <Route path="/videos/new" element={<PrivateRoute><Layout><VideoEditor /></Layout></PrivateRoute>} />
      <Route path="/media" element={<PrivateRoute><Layout><MediaLibrary /></Layout></PrivateRoute>} />
      <Route path="/platforms" element={<PrivateRoute><Layout><PlatformManager /></Layout></PrivateRoute>} />
      <Route path="/publish/history" element={<PrivateRoute><Layout><PublishHistory /></Layout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
      <Route path="*" element={<PrivateRoute><Layout><NotFound /></Layout></PrivateRoute>} />
    </Routes>
  </Router>
);

const App: React.FC = () => <AppContent />;
export default App;
