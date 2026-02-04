"use client";

import React from 'react';
import { Download, FileText, Camera, MapPin, Calendar, Heart } from 'lucide-react';

interface ScrapbookData {
    groupName: string;
    events: any[];
    users: any[];
}

const ScrapbookExport = ({ data }: { data: ScrapbookData }) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-blue-500/20 group"
            >
                <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
                Export Digital Scrapbook
            </button>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Generates a printable memory PDF</p>

            {/* Hidden printable area */}
            <div className="hidden">
                <div id="scrapbook-print-area" className="p-20 bg-white text-black font-sans print:block">
                    <div className="text-center mb-20 border-b-4 border-black pb-10">
                        <h1 className="text-6xl font-black uppercase tracking-tighter mb-4">{data.groupName}</h1>
                        <p className="text-2xl font-bold text-gray-600">A Digital Scrapbook of Memories</p>
                        <p className="text-sm mt-4 uppercase tracking-[0.5em] text-gray-400">Captured on SocialSync</p>
                    </div>

                    <div className="grid grid-cols-1 gap-14">
                        {data.events.map((event, index) => (
                            <div key={event.id} className={`flex flex-col gap-6 ${index % 2 === 0 ? 'items-start' : 'items-end'}`}>
                                <div className="max-w-2xl bg-gray-50 border-2 border-black p-8 shadow-[10px_10px_0px_#000]">
                                    {event.media_url && (
                                        <div className="mb-6 border-2 border-black overflow-hidden aspect-video">
                                            <img src={event.media_url} alt={event.title} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-4">
                                        <h2 className="text-3xl font-black uppercase">{event.title}</h2>
                                        <div className="text-right">
                                            <p className="text-sm font-bold">{new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                            <p className="text-[10px] uppercase font-black text-gray-500">{event.location}</p>
                                        </div>
                                    </div>
                                    <p className="text-lg italic text-gray-700 leading-relaxed">
                                        “A moment frozen in time. {event.participants?.length || 0} friends unified on this day.”
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-32 text-center border-t-2 border-black pt-10">
                        <p className="text-sm font-black uppercase tracking-[0.2em]">End of Memories • SocialSync 2026</p>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @media print {
                    @page { margin: 0; }
                    body * { visibility: hidden; }
                    #scrapbook-print-area, #scrapbook-print-area * { visibility: visible; }
                    #scrapbook-print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default ScrapbookExport;
