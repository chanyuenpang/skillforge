import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import ApprovalQueue from './components/ApprovalQueue';
import ApprovalDetail from './components/ApprovalDetail';
import ApprovalHistory from './components/ApprovalHistory';
import Dashboard from './components/Dashboard';
import PlaceholderPage from './components/PlaceholderPage';
import RunCenterOverview from './components/RunCenterOverview';
import RunCenterList from './components/RunCenterList';
import RunCenterDetail from './components/RunCenterDetail';
import KnowledgeAssetsPage from './components/KnowledgeAssetsPage';
import KnowledgeAssetDetailPage from './components/KnowledgeAssetDetailPage';

function LegacyRunRedirect() {
  const { runId } = useParams();
  return <Navigate to={`/run-center/runs/${runId}`} replace />;
}

function LegacyApprovalRedirect() {
  const { fixtureId } = useParams();
  return <Navigate to={`/risk/approval/${fixtureId}`} replace />;
}

/**
 * 运行中心各页面的 ErrorBoundary 包装器
 *
 * 每个包装器都是独立的组件引用，避免每次渲染创建新组件导致 React 树重建。
 */
function RunOverviewBoundary() {
  return (
    <ErrorBoundary title="运行中心总览加载失败" showBackLink backTo="/">
      <RunCenterOverview />
    </ErrorBoundary>
  );
}

function RunListBoundary() {
  return (
    <ErrorBoundary title="运行列表加载失败" showBackLink backTo="/run-center">
      <RunCenterList />
    </ErrorBoundary>
  );
}

function RunDetailBoundary() {
  return (
    <ErrorBoundary title="运行详情加载失败" showBackLink backTo="/run-center/runs">
      <RunCenterDetail />
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route
            index
            element={<Dashboard />}
          />

          <Route path="/risk/queue" element={<ApprovalQueue />} />
          <Route path="/risk/approval/:fixtureId" element={<ApprovalDetail />} />
          <Route path="/risk/history" element={<ApprovalHistory />} />

          <Route path="/run-center" element={<RunOverviewBoundary />} />
          <Route path="/run-center/runs" element={<RunListBoundary />} />
          <Route path="/run-center/runs/:runId" element={<RunDetailBoundary />} />

          <Route path="/run" element={<Navigate to="/run-center" replace />} />
          <Route path="/run/list" element={<Navigate to="/run-center/runs" replace />} />
          <Route path="/run/:runId" element={<LegacyRunRedirect />} />
          <Route path="/knowledge-assets" element={<KnowledgeAssetsPage />} />
          <Route path="/knowledge-assets/:assetId" element={<KnowledgeAssetDetailPage />} />
          <Route path="/knowledge" element={<Navigate to="/knowledge-assets" replace />} />
          <Route path="/settings" element={<PlaceholderPage title="设置" />} />

          <Route path="/approval/:fixtureId" element={<LegacyApprovalRedirect />} />
          <Route path="/history" element={<Navigate to="/risk/history" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
