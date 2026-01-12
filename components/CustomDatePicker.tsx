import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  className?: string;
  placeholder?: string;
}

const getISOWeek = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
};

const formatDateDisplay = (isoDate: string) => {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}-${m}-${y}`;
};

const DAYS_NL = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
const MONTHS_NL = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({ 
  value, 
  onChange, 
  className = "",
  placeholder = "Selecteer datum"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const parts = value.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date();
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && value) {
      const parts = value.split('-').map(Number);
      setViewDate(new Date(parts[0], parts[1] - 1, parts[2]));
    }
  }, [isOpen, value]);

  const handleDaySelect = (d: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), d);
    const y = newDate.getFullYear();
    const m = String(newDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(newDate.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${dayStr}`);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setViewDate(today);
    setIsOpen(false);
  };

  const changeMonth = (delta: number) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const renderGrid = () => {
    const rows = [];
    let cells = [];
    for (let i = 0; i < startDay; i++) {
      cells.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const currentYear = dateObj.getFullYear();
      const currentMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
      const currentDay = String(dateObj.getDate()).padStart(2, '0');
      const currentDateStr = `${currentYear}-${currentMonth}-${currentDay}`;
      const isSelected = currentDateStr === value;
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const isToday = todayStr === currentDateStr;

      cells.push(
        <button
          key={d}
          onClick={() => handleDaySelect(d)}
          className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
            ${isSelected 
              ? 'bg-emerald-500 text-white shadow-md' 
              : isToday 
                ? 'text-emerald-600 bg-emerald-50 border border-emerald-200' 
                : 'text-slate-700 hover:bg-slate-100'
            }
          `}
        >
          {d}
        </button>
      );
      if (cells.length === 7 || d === daysInMonth) {
        const checkDate = new Date(year, month, d);
        const weekNum = getISOWeek(checkDate);
        rows.push(
          <div key={`row-${d}`} className="flex items-center gap-1 mb-1">
            <div className="w-8 flex items-center justify-center border-r border-slate-100 mr-1">
              <span className="text-[9px] font-black text-slate-300">{weekNum}</span>
            </div>
            {cells}
          </div>
        );
        cells = [];
      }
    }
    return rows;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="w-full h-full relative group cursor-pointer">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-emerald-500 transition-colors pointer-events-none z-10">
          <CalendarIcon size={16} />
        </div>
        <div className={`w-full h-full pl-9 pr-3 bg-white border border-slate-200 rounded-xl outline-none transition-all font-bold text-slate-800 flex items-center justify-start ${isOpen ? 'ring-2 ring-blue-100 border-blue-400' : ''}`}>
          <span className="text-[11px] truncate">
            {value ? formatDateDisplay(value) : placeholder}
          </span>
        </div>
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-[100] bg-white rounded-2xl shadow-2xl border border-slate-100 p-5 w-[340px] animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><ChevronLeft size={20} /></button>
            <span className="font-black text-slate-800 text-sm uppercase">{MONTHS_NL[month]} {year}</span>
            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"><ChevronRight size={20} /></button>
          </div>
          <div className="flex items-center gap-1 mb-2">
            <div className="w-8 text-[9px] font-black text-slate-300 uppercase text-center">Wk</div>
            {DAYS_NL.map(day => <div key={day} className="w-8 text-[10px] font-bold text-slate-400 text-center">{day}</div>)}
          </div>
          <div>{renderGrid()}</div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-center">
            <button onClick={handleToday} className="text-xs font-black text-emerald-600 hover:underline uppercase">Vandaag</button>
          </div>
        </div>
      )}
    </div>
  );
};