"use client";

import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import MeetingLogger from "@/components/MeetingLogger";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function MeetingsPage() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editingMeeting, setEditingMeeting] = useState<any>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
                router.push('/auth');
            } else {
                setSession(currentSession);
                setLoading(false);
            }
        };
        checkAuth();
    }, [router]);

    const handleSaveSuccess = () => {
        setEditingMeeting(null);
        // We can create a refresh trigger here if we want to auto-refresh the list
        // Currently the list fetches on mount, so maybe we need a refresh key or signal
    };

    if (loading || !session) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500" size={40} />
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-950 text-slate-50 pb-20 md:pb-0">
            <Sidebar />
            <MobileNav />
            <div className="pl-0 md:pl-64">
                <header className="h-20 border-b border-slate-800 flex items-center justify-between px-6 md:px-10 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
                    <h2 className="font-semibold text-white">Reunion History</h2>
                </header>

                <div className="p-6 md:p-10 max-w-4xl mx-auto">
                    <div className="mb-10">
                        <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Meetings</h1>
                        <p className="text-slate-500 font-medium">Log your newest adventures or browse the archive.</p>
                    </div>

                    <MeetingLogger
                        initialData={editingMeeting}
                        onCancel={() => setEditingMeeting(null)}
                        onSave={handleSaveSuccess}
                    />

                    <div className="mt-12 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black text-white">Your Memory Log</h3>
                        </div>
                        <MeetingList
                            key={editingMeeting ? 'editing' : 'viewing'} // Quick hack to refresh list on mode switch or we can pass a refresh trigger
                            onEdit={(meeting) => {
                                setEditingMeeting(meeting);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                        />
                    </div>
                </div>
            </div>
        </main>
    );
}

const MeetingList = ({ onEdit }: { onEdit: (meeting: any) => void }) => {
    const [meetings, setMeetings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('meetings')
            .select('*, groups(name)')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false });

        if (data) setMeetings(data);
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this memory? This cannot be undone.")) return;

        const { error } = await supabase
            .from('meetings')
            .delete()
            .eq('id', id);

        if (error) {
            alert(error.message);
        } else {
            setMeetings(meetings.filter(m => m.id !== id));
        }
    };

    if (loading) return <div className="text-center p-8"><Loader2 className="animate-spin mx-auto text-blue-500" /></div>;

    if (meetings.length === 0) return (
        <div className="text-center p-12 border-2 border-dashed border-slate-900 rounded-[2rem]">
            <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">No memories logged yet.</p>
        </div>
    );

    return (
        <div className="grid gap-4">
            {meetings.map(meeting => (
                <div key={meeting.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] flex items-center justify-between group">
                    <div className="flex gap-4 items-center">
                        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500 font-black text-xl overflow-hidden">
                            {meeting.media_url ? (
                                <img src={meeting.media_url} className="w-full h-full object-cover" />
                            ) : (
                                <Calendar size={20} />
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-white">{meeting.title}</h4>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                <span>{meeting.date}</span>
                                <span>•</span>
                                <span>{meeting.groups?.name || 'Unknown Group'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => onEdit(meeting)}
                            className="p-3 rounded-xl hover:bg-blue-500/10 text-slate-700 hover:text-blue-500 transition-colors"
                            title="Edit Memory"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                        </button>
                        <button
                            onClick={() => handleDelete(meeting.id)}
                            className="p-3 rounded-xl hover:bg-red-500/10 text-slate-700 hover:text-red-500 transition-colors"
                            title="Delete Memory"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
