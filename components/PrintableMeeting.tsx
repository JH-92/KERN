
import React from 'react';
import { Meeting } from '../types';
import { KernLogo } from './KernLogo';

interface PrintableMeetingProps {
  meeting: Meeting;
}

export const PrintableMeeting: React.FC<PrintableMeetingProps> = ({ meeting }) => {
  return (
    <div className="bg-white text-black font-sans leading-normal">
      <style>{`
        @media print {
          @page { margin: 15mm; size: A4; }
          body * { visibility: hidden; }
          #printable-area, #printable-area * { visibility: visible; }
          #printable-area { position: absolute; left: 0; top: 0; width: 100%; display: block !important; }
          .no-print { display: none !important; }
          .break-before { break-before: always; }
          .break-inside-avoid { break-inside: avoid; }
        }
      `}</style>

      {/* HEADER */}
      <header className="border-b-4 border-slate-900 pb-6 mb-10">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-5">
            <KernLogo size={56} className="text-slate-900" />
            <div>
              <div className="flex items-center gap-2">
                 <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">KERN</h1>
                 <span className="text-4xl font-light text-slate-400">|</span>
                 <h2 className="text-xl font-bold uppercase tracking-[0.2em] text-slate-900">VERGADERVERSLAG</h2>
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-2">
                De essentie van overleg
              </div>
            </div>
          </div>
          <div className="text-right">
             <div className="text-2xl font-black text-slate-900">{meeting.date}</div>
             <div className="text-sm font-bold uppercase tracking-widest text-slate-500 mt-1">
               Week {meeting.weekNumber}
             </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-8 mt-8">
            <div className="p-4 border border-slate-300 rounded-lg break-inside-avoid">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Overlegtype</span>
               <span className="text-lg font-bold text-slate-900">{meeting.type}</span>
            </div>
            <div className="p-4 border border-slate-300 rounded-lg break-inside-avoid">
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Aanwezigen</span>
               <span className="text-sm font-medium text-slate-900 leading-snug">{meeting.attendees.join(', ')}</span>
            </div>
        </div>
      </header>

      {/* SECTION I: NOTES */}
      <section className="mb-12">
         <h2 className="text-lg font-black uppercase tracking-widest border-b-2 border-slate-900 pb-2 mb-6 flex items-center gap-2">
            I. Notulen
         </h2>
         <div className="space-y-8">
            {meeting.notes.map((note, idx) => (
               <div key={idx} className="break-inside-avoid">
                  <h3 className="text-base font-bold text-slate-900 mb-2 uppercase tracking-wide">
                     {note.agendaItem}
                  </h3>
                  {note.topics && note.topics.length > 0 && (
                     <ul className="mb-3 pl-4 space-y-1 border-l-2 border-slate-300">
                        {note.topics.map((t, i) => (
                           <li key={i} className={`text-xs font-semibold ${t.isCompleted ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                              - {t.text}
                           </li>
                        ))}
                     </ul>
                  )}
                  {note.content ? (
                     <p className="text-sm text-slate-800 leading-relaxed text-justify whitespace-pre-wrap">
                        {note.content}
                     </p>
                  ) : (
                     <p className="text-xs text-slate-400 italic">Geen notities vastgelegd.</p>
                  )}
               </div>
            ))}
         </div>
      </section>

      {/* SECTION II: DECISIONS */}
      <section className="mb-12 break-inside-avoid">
         <h2 className="text-lg font-black uppercase tracking-widest border-b-2 border-slate-900 pb-2 mb-6 flex items-center gap-2">
            II. Besluitenlijst
         </h2>
         {meeting.decisions.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Geen besluiten genomen tijdens dit overleg.</p>
         ) : (
            <div className="border border-slate-300 rounded-lg overflow-hidden">
               <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-900 font-black border-b border-slate-300">
                     <tr>
                        <th className="px-4 py-3 w-32">ID</th>
                        <th className="px-4 py-3">Besluit</th>
                        <th className="px-4 py-3 w-40">Eigenaar</th>
                        <th className="px-4 py-3 w-32">Datum</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                     {meeting.decisions.map((d, i) => (
                        <tr key={i} className="group">
                           <td className="px-4 py-3 font-mono font-bold text-xs text-slate-500 border-r border-slate-100 align-top pt-4">{d.readable_id}</td>
                           <td className="px-4 py-3 border-r border-slate-100 align-top pt-4">
                              <div className="font-bold text-slate-900 mb-1">{d.title}</div>
                              <div className="text-xs text-slate-700 leading-relaxed">{d.description}</div>
                           </td>
                           <td className="px-4 py-3 text-xs font-bold uppercase text-slate-800 border-r border-slate-100 align-top pt-4">
                              {d.owners && d.owners.length > 0 ? d.owners.join(', ') : '-'}
                           </td>
                           <td className="px-4 py-3 text-xs font-bold text-slate-900 align-top pt-4">
                              {d.date || '-'}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </section>

      {/* SECTION III: ACTIONS - FORCED PAGE BREAK BEFORE */}
      <section className="break-before">
         <h2 className="text-lg font-black uppercase tracking-widest border-b-2 border-slate-900 pb-2 mb-6 flex items-center gap-2">
            III. Actielijst
         </h2>
         {meeting.actions.length === 0 ? (
            <p className="text-sm text-slate-500 italic">Geen acties uitgezet tijdens dit overleg.</p>
         ) : (
            <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-sm">
                   <thead className="bg-slate-50 text-slate-900 font-black border-b border-slate-300">
                      <tr>
                         <th className="px-4 py-3 w-24 border-r border-slate-200">ID</th>
                         <th className="px-4 py-3 border-r border-slate-200">Actie & Omschrijving</th>
                         <th className="px-4 py-3 w-40 border-r border-slate-200">Eigenaar</th>
                         <th className="px-4 py-3 w-32">Deadline</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-300">
                      {meeting.actions.map((a, i) => (
                         <tr key={i} className="break-inside-avoid">
                            <td className="px-4 py-3 font-mono font-bold text-xs text-slate-500 align-top pt-4 border-r border-slate-100">{a.readable_id}</td>
                            <td className="px-4 py-3 align-top pt-4 pb-4 border-r border-slate-100">
                               <div className="font-bold text-slate-900 mb-1">{a.title}</div>
                               <div className="text-xs text-slate-700 leading-relaxed">{a.description}</div>
                            </td>
                            <td className="px-4 py-3 text-xs font-bold uppercase text-slate-800 align-top pt-4 border-r border-slate-100">
                               {a.owners && a.owners.length > 0 ? a.owners.join(', ') : '-'}
                            </td>
                            <td className="px-4 py-3 text-xs font-bold text-slate-900 align-top pt-4">
                               {a.deadline}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
            </div>
         )}
      </section>

      <footer className="mt-12 pt-6 border-t border-slate-300 text-center flex items-center justify-center gap-3">
         <KernLogo size={18} className="text-slate-500" />
         <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500">
            Gegenereerd met KERN • {new Date().toLocaleDateString('nl-NL')}
         </p>
      </footer>
    </div>
  );
};
