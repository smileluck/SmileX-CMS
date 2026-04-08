import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { getCurrentUser } from './store/authSlice';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ArticleList from './pages/ArticleList';
import ArticleEditor from './pages/ArticleEditor';
import ArticleSuccess from './pages/ArticleSuccess';
import VideoList from './pages/VideoList';
import VideoEditor from './pages/VideoEditor';
import MediaLibrary from './pages/MediaLibrary';
import PlatformManager from './pages/PlatformManager';
import PublishHistory from './pages/PublishHistory';
import Settings from './pages/Settings';
import TagManager from './pages/TagManager';
import Layout from './components/Layout';
import NotFound from './pages/NotFound';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <h2>出错了</h2>
          <p>应用遇到了一个错误，请刷新页面重试。</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: '8px 24px', cursor: 'pointer' }}>
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, token, user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (token && !user) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, token, user]);

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
      <Route path="/articles/success" element={<PrivateRoute><Layout><ArticleSuccess /></Layout></PrivateRoute>} />
      <Route path="/articles/:id/edit" element={<PrivateRoute><Layout><ArticleEditor /></Layout></PrivateRoute>} />
      <Route path="/videos" element={<PrivateRoute><Layout><VideoList /></Layout></PrivateRoute>} />
      <Route path="/videos/new" element={<PrivateRoute><Layout><VideoEditor /></Layout></PrivateRoute>} />
      <Route path="/videos/:id/edit" element={<PrivateRoute><Layout><VideoEditor /></Layout></PrivateRoute>} />
      <Route path="/media" element={<PrivateRoute><Layout><MediaLibrary /></Layout></PrivateRoute>} />
      <Route path="/tags" element={<PrivateRoute><Layout><TagManager /></Layout></PrivateRoute>} />
      <Route path="/platforms" element={<PrivateRoute><Layout><PlatformManager /></Layout></PrivateRoute>} />
      <Route path="/publish/history" element={<PrivateRoute><Layout><PublishHistory /></Layout></PrivateRoute>} />
      <Route path="/settings" element={<PrivateRoute><Layout><Settings /></Layout></PrivateRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Router>
);

const App: React.FC = () => (
  <ErrorBoundary>
    <AppContent />
  </ErrorBoundary>
);
export default App;
