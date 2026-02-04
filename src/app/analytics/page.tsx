"use client";

import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import InteractionDashboard from "@/components/InteractionDashboard";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AnalyticsPage() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [groupId, setGroupId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
                router.push('/auth');
            } else {
                setSession(currentSession);
                checkGroup(currentSession.user.id);
            }
        };
        checkAuth();
    }, [router]);

    const checkGroup = async (userId: string) => {
        const { data } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', userId)
            .limit(1)
            .single();

        if (data) {
            setGroupId(data.group_id);
        }
        setLoading(false);
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
                    <h2 className="font-semibold text-white">Full Group Analytics</h2>
                </header>

                <div className="p-6 md:p-10 max-w-6xl mx-auto">
                    <div className="mb-10">
                        <h1 className="text-3xl md:text-4xl font-black text-white mb-2">Social Insights</h1>
                        <p className="text-slate-500 font-medium">Deep dive into your friendship data and geography.</p>
                    </div>

                    {groupId ? (
                        <InteractionDashboard groupId={groupId} />
                    ) : (
                        <div className="text-center p-20 border-2 border-dashed border-slate-900 rounded-[3rem]">
                            <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">No active circle found</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
