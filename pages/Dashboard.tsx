
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { ActionStatus, MeetingType, Decision } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { AlertCircle, CheckCircle, Clock, FileText, TrendingUp, ChevronRight, Briefcase, Layout, Gavel, Search, ArrowRight, X, Calendar, Share } from 'lucide-react';
import PageHeader from '../components/PageHeader';

// Extended interface for dashboard display
interface ExtendedDecision extends Decision {
    meetingDate: string;
    meetingType: MeetingType;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalMeetings: 0,
    openActions: 0,
    completedActions: 0,
    overdueActions: 0,
    openProjectActions: 0,
    openPlanningActions: 0
  });

  const [recentDecisions, setRecentDecisions] = useState<ExtendedDecision[]>([]);
  const [decisionSearch, setDecisionSearch] = useState('');
  const [selectedDecision, setSelectedDecision] = useState<ExtendedDecision | null>(null);
  
  // Animation state for progress circle
  const [animatedCompletionRate, setAnimatedCompletionRate] = useState(0);

  useEffect(() => {
    const meetings = db.getMeetings();
    const actions = db.getAllActions();
    const today = new Date().toISOString().split('T')[0];
    const openActionsList = actions.filter(a => a.status !== ActionStatus.DONE);

    setStats({
      totalMeetings: meetings.length,
      openActions: openActionsList.length,
      completedActions: actions.filter(a => a.status === ActionStatus.DONE).length,
      overdueActions: actions.filter(a => a.status !== ActionStatus.DONE && a.deadline < today).length,
      openProjectActions: openActionsList.filter(a => a.originType === MeetingType.PROJECT).length,
      openPlanningActions: openActionsList.filter(a => a.originType === MeetingType.PLANNING).length
    });

    // Process decisions
    const allDecisions = meetings.flatMap(m => 
        m.decisions.map(d => ({
            ...d,
            meetingDate: m.date,
            meetingType: m.type
        }))
    ).sort((a, b) => b.meetingDate.localeCompare(a.meetingDate)); // Sort newest first

    setRecentDecisions(allDecisions);

  }, []);

  const chartData = [
    { name: 'Proj. Open', value: stats.openProjectActions, color: '#3b82f6' }, // Blue
    { name: 'Plan. Open', value: stats.openPlanningActions, color: '#f59e0b' }, // Amber
    { name: 'Te laat', value: stats.overdueActions, color: '#ef4444' }, // Red
    { name: 'Gereed', value: stats.completedActions, color: '#10b981' } // Emerald
  ];

  const totalActions = stats.openActions + stats.completedActions;
  const completionRate = totalActions > 0 
    ? Math.round((stats.completedActions / totalActions) * 100) 
    : 0;

  // Trigger animation after mount/calculation
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedCompletionRate(completionRate);
    }, 300);
    return () => clearTimeout(timer);
  }, [completionRate]);

  const filteredDecisions = useMemo(() => {
    if (!decisionSearch) return recentDecisions.slice(0, 10);
    return recentDecisions.filter(d => 
        (d.title && d.title.toLowerCase().includes(decisionSearch.toLowerCase())) ||
        (d.description && d.description.toLowerCase().includes(decisionSearch.toLowerCase())) ||
        d.topic.toLowerCase().includes(decisionSearch.toLowerCase()) ||
        d.readable_id.toLowerCase().includes(decisionSearch.toLowerCase())
    ).slice(0, 10);
  }, [recentDecisions, decisionSearch]);

  const handleOpenArchive = (meetingId: string) => {
      navigate('/archief', { state: { meetingId } });
  };

  // Interactive Stat Tile Component
  const StatTile = ({ label, value, icon, bgClass, iconClass, borderClass, onClick, subContent }: any) => (
    <button 
      onClick={onClick}
      className={`relative w-full text-left bg-white p-7 rounded-[2rem] border ${borderClass} shadow-sm min-h-[140px] h-full
        hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-in-out
        hover:bg-slate-50 hover:ring-2 hover:ring-emerald-500/20 group cursor-pointer flex flex-col justify-between overflow-hidden`}
    >
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-slate-300">
        <ChevronRight size={20} />
      </div>

      <div className="flex items-start justify-between w-full z-10 h-full">
        <div className="flex flex-col justify-between h-full">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</p>
          <h3 className="text-4xl font-black text-slate-900 tabular-nums tracking-tighter mt-auto">{value}</h3>
        </div>
        <div className={`p-4 rounded-2xl ${bgClass} ${iconClass} group-hover:scale-110 transition-transform duration-300 shadow-inner flex-shrink-0`}>
          {icon}
        </div>
      </div>
      
      {subContent && (
        <div className="mt-4 pt-4 border-t border-slate-100 w-full flex items-center justify-between z-10">
          {subContent}
        </div>
      )}
    </button>
  );

  return (
    <div className="pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader title="Dashboard" subtitle="Statusoverzicht van projectvoortgang en vergaderingen." />

      {/* 1. GRID: Interactive Navigation Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 items-stretch">
        <StatTile 
          label="Totaal overleggen" 
          value={stats.totalMeetings} 
          icon={<FileText size={28} strokeWidth={2.5} />} 
          bgClass="bg-blue-50" 
          iconClass="text-blue-600"
          borderClass="border-blue-100"
          onClick={() => navigate('/archief')}
        />
        <StatTile 
          label="Open acties" 
          value={stats.openActions} 
          icon={<Clock size={28} strokeWidth={2.5} />} 
          bgClass="bg-amber-50" 
          iconClass="text-amber-600"
          borderClass="border-amber-100"
          onClick={() => navigate('/actielijst', { state: { filter: ActionStatus.OPEN } })}
          subContent={
            <div className="flex w-full gap-2">
               <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                  <Briefcase size={12} /> {stats.openProjectActions}
               </div>
               <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                  <Layout size={12} /> {stats.openPlanningActions}
               </div>
            </div>
          }
        />
        <StatTile 
          label="Te late acties" 
          value={stats.overdueActions} 
          icon={<AlertCircle size={28} strokeWidth={2.5} />} 
          bgClass="bg-red-50" 
          iconClass="text-red-600"
          borderClass="border-red-100"
          onClick={() => navigate('/actielijst', { state: { filter: 'OVERDUE' } })}
        />
        <StatTile 
          label="Gereed" 
          value={stats.completedActions} 
          icon={<CheckCircle size={28} strokeWidth={2.5} />} 
          bgClass="bg-emerald-50" 
          iconClass="text-emerald-600"
          borderClass="border-emerald-100"
          onClick={() => navigate('/actielijst', { state: { filter: ActionStatus.DONE } })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Chart Section - Takes up 2 columns */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col justify-between h-[420px] hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
              <TrendingUp size={20} className="text-blue-500" />
              Status & Type Verdeling
            </h3>
            <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Real-time data
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#cbd5e1', fontSize: 11, fontWeight: 700}} 
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc', radius: 8}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px'}}
                  itemStyle={{fontSize: '13px', fontWeight: 800, color: '#1e293b'}}
                />
                <Bar dataKey="value" radius={[8, 8, 8, 8]} barSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={2} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Progress Widget - Takes up 1 column (Replaces Efficiency Tip) */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 flex flex-col justify-between h-[420px] relative overflow-hidden group hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ease-in-out">
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
               <CheckCircle size={20} className="text-emerald-500" />
               Voortgang
            </h3>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center relative z-10">
             {/* Large Circular Progress */}
             <div className="relative w-48 h-48 group-hover:scale-105 transition-transform duration-500">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                   <path className="text-slate-50" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" />
                   <path 
                     className="text-emerald-500 drop-shadow-lg transition-all duration-1000 ease-out" 
                     strokeDasharray={`${animatedCompletionRate}, 100`} 
                     d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                     fill="none" 
                     stroke="currentColor" 
                     strokeWidth="2.5" 
                     strokeLinecap="round" 
                   />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
                   <span className="text-5xl font-black tracking-tighter tabular-nums transition-all duration-1000">
                       {/* Optionally animate number too, but direct bind is fine for now */}
                       {completionRate}%
                   </span>
                   <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Voltooid</span>
                </div>
             </div>
          </div>

          <div className="mt-6 text-center relative z-10">
            <p className="text-sm font-bold text-slate-500">
              <span className="text-emerald-600 font-black text-lg">{stats.completedActions}</span> van de <span className="text-slate-900 font-black">{totalActions}</span> acties voltooid.
            </p>
          </div>
          
          {/* Subtle Background Decoration */}
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        </div>
      </div>

      {/* --- SMART DECISION REGISTRY WIDGET --- */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ease-in-out">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide flex items-center gap-3">
              <div className="bg-slate-100 p-2 rounded-xl text-slate-900">
                <Gavel size={20} />
              </div>
              Recente Besluiten
            </h3>
            
            <div className="flex gap-4 items-center">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="Zoek besluit..." 
                        value={decisionSearch}
                        onChange={(e) => setDecisionSearch(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-100 w-full md:w-64 transition-all"
                    />
                </div>
                <button 
                    onClick={() => navigate('/archief')}
                    className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-500 transition-colors"
                >
                    Toon alles <ArrowRight size={12} />
                </button>
            </div>
          </div>

          <div className="overflow-hidden">
             {filteredDecisions.length === 0 ? (
                 <div className="py-12 text-center text-slate-400">
                     <p className="text-xs font-bold uppercase tracking-widest">Geen besluiten gevonden.</p>
                 </div>
             ) : (
                 <div className="divide-y divide-slate-50">
                     {filteredDecisions.map((decision) => (
                         <button 
                             key={decision.id}
                             onClick={() => setSelectedDecision(decision)}
                             className="w-full text-left group flex flex-col md:flex-row md:items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer"
                         >
                            <div className="flex-1 pr-4 mb-2 md:mb-0">
                                <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                                    {decision.title || decision.description}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                        {decision.readable_id}
                                    </span>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                                        {decision.topic}
                                    </span>
                                    {decision.owners && decision.owners.length > 0 && (
                                       <>
                                         <span className="text-slate-300">•</span>
                                         <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                            {decision.owners[0]}
                                         </span>
                                       </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                {decision.meetingType === MeetingType.PROJECT ? (
                                    <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 min-w-[140px] justify-center">
                                        <Briefcase size={10} /> Projectleider
                                    </div>
                                ) : (
                                    <div className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 min-w-[140px] justify-center">
                                        <Layout size={10} /> Planning
                                    </div>
                                )}
                                <div className="text-right min-w-[80px]">
                                    <div className="text-xs font-black text-slate-900">{decision.date}</div>
                                </div>
                                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                            </div>
                         </button>
                     ))}
                 </div>
             )}
          </div>
      </div>

      {/* --- DECISION DETAIL MODAL --- */}
      {selectedDecision && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedDecision(null)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative z-10 p-8 md:p-12 animate-in zoom-in-95 duration-200">
                <button onClick={() => setSelectedDecision(null)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 transition-colors">
                    <X size={24} />
                </button>

                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="font-mono text-xs font-black text-slate-300 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                            {selectedDecision.readable_id}
                        </span>
                        {selectedDecision.meetingType === MeetingType.PROJECT ? (
                             <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Briefcase size={12} /> Projectleider
                             </span>
                        ) : (
                             <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
                                <Layout size={12} /> Planning
                             </span>
                        )}
                        <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 px-2 py-1 rounded-lg flex items-center gap-1">
                            <Calendar size={12} /> {selectedDecision.date}
                        </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight mb-2">
                        {selectedDecision.title || "Besluit"}
                    </h2>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Onderwerp: {selectedDecision.topic}
                    </p>
                </div>

                <div className="space-y-8">
                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-inner">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 flex items-center gap-2">
                            <Gavel size={14} /> Vastgelegd besluit
                        </label>
                        <p className="text-lg font-bold text-slate-800 leading-relaxed">
                            {selectedDecision.description}
                        </p>
                    </div>

                    {selectedDecision.owners && selectedDecision.owners.length > 0 && (
                        <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Eigenaar / Verantwoordelijke</label>
                             <div className="flex flex-wrap gap-2">
                                {selectedDecision.owners.map(owner => (
                                    <span key={owner} className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-3 py-2 rounded-xl text-xs font-bold shadow-sm">
                                        {owner}
                                    </span>
                                ))}
                             </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
                         <button 
                            onClick={() => handleOpenArchive(selectedDecision.meetingId)}
                            className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-6 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-colors"
                         >
                            <FileText size={16} /> Bekijk volledig verslag
                         </button>
                         <button 
                            onClick={() => setSelectedDecision(null)}
                            className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-colors"
                         >
                            Sluiten
                         </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
