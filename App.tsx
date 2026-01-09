
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import NewMeetingPage from './pages/NewMeeting';
import ActionListPage from './pages/ActionList';
import ArchivePage from './pages/Archive';
import DashboardPage from './pages/Dashboard';
import SettingsPage from './pages/Settings';
import AnimatedBackground from './components/AnimatedBackground';
import { Sidebar } from './components/Sidebar';

const App: React.FC = () => {
  return (
    <HashRouter>
      <AnimatedBackground />
      {/* 
        We use bg-slate-50/60 here to provide a semi-transparent "frost" layer 
        over the animated background, ensuring text readability while letting the aurora shine through.
      */}
      <div className="flex min-h-screen bg-slate-50/60 relative">
        <Sidebar />
        {/* Main Content Area: z-0 ensures it sits below the Sidebar (z-30) and Mobile Toggle (z-50),
            but allows its own children (like modals with z-[9999]) to stack correctly if managed well.
        */}
        <main className="flex-1 lg:ml-80 p-6 lg:p-12 relative z-0">
          <div className="max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<NewMeetingPage />} />
              <Route path="/actielijst" element={<ActionListPage />} />
              <Route path="/archief" element={<ArchivePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/instellingen" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  );
};

export default App;
