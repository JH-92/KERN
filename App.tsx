
import React, { useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import NewMeetingPage from './pages/NewMeeting';
import ActionListPage from './pages/ActionList';
import ArchivePage from './pages/Archive';
import DashboardPage from './pages/Dashboard';
import SettingsPage from './pages/Settings';
import AnimatedBackground from './components/AnimatedBackground';
import { Sidebar } from './components/Sidebar';

const App: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <HashRouter>
      <AnimatedBackground />
      {/* 
        We use bg-slate-50/60 here to provide a semi-transparent "frost" layer 
        over the animated background, ensuring text readability while letting the aurora shine through.
      */}
      <div className="flex min-h-screen bg-slate-50/60 relative overflow-x-hidden">
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        />
        
        {/* 
          Main Content Area
          Dynamically adjusts left margin based on sidebar state.
          Uses transition-all duration-300 to match the sidebar animation perfectly.
        */}
        <main 
          className={`flex-1 p-6 lg:p-12 relative z-0 transition-all duration-300 ease-in-out ${
            isSidebarCollapsed ? 'lg:ml-24' : 'lg:ml-80'
          }`}
        >
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
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
