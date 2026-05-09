import React, { useState } from 'react';
import InterviewCopilotOverlay from './components/overlay/InterviewCopilotOverlay';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { WSProvider } from './contexts/WSContext';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Departments from './pages/Departments';
import Candidates from './pages/Candidates';
import AddCandidate from './pages/AddCandidate';
import CandidateDetail from './pages/CandidateDetail';
import Sidebar from './components/Sidebar';

function AppInner() {
  const { user } = useAuth();
  const [page, setPage] = useState('dashboard');

  if (!user) return <Login />;

  function navigate(to) {
    setPage(to);
    window.scrollTo(0, 0);
  }

  function renderPage() {
    if (page === 'dashboard') return <Dashboard onNavigate={navigate} />;
    if (page === 'departments') return <Departments onNavigate={navigate} />;
    if (page === 'candidates') return <Candidates onNavigate={navigate} />;
    if (page === 'add-candidate') return <AddCandidate onNavigate={navigate} />;

    if (page.startsWith('dept-')) {
      return (
        <Candidates
          onNavigate={navigate}
          deptFilter={page.replace('dept-', '')}
        />
      );
    }

    if (page.startsWith('candidate-')) {
      return (
        <CandidateDetail
          candidateId={page.replace('candidate-', '')}
          onNavigate={navigate}
        />
      );
    }

    if (page.startsWith('edit-')) {
      return (
        <AddCandidate
          onNavigate={navigate}
          editId={page.replace('edit-', '')}
        />
      );
    }

    return <Dashboard onNavigate={navigate} />;
  }

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={navigate} />

      <main className="main-content">
        {renderPage()}
      </main>

      <InterviewCopilotOverlay />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <WSProvider>
          <AppInner />
        </WSProvider>
      </DataProvider>
    </AuthProvider>
  );
}