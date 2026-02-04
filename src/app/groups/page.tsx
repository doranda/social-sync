"use client";

import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import GroupManager from "@/components/GroupManager";
import MemberList from "@/components/MemberList";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, Users } from 'lucide-react';

export default function GroupsPage() {
    const router = useRouter();
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [groupId, setGroupId] = useState<string | null>(null);

    const checkGroup = async (userId: string) => {
        const { data: membership } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', userId)
            .limit(1)
            .single();

        if (membership) setGroupId(membership.group_id);
    };

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (!currentSession) {
                router.push('/auth');
            } else {
                setSession(currentSession);
                await checkGroup(currentSession.user.id);
                setLoading(false);
            }
        };
        checkAuth();
    }, [router]);

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
                    <h2 className="font-semibold text-white">Social Circles</h2>
                </header>

                <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-16">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-black text-white mb-2">My Groups</h1>
                        <p className="text-slate-500 font-medium">Manage your friend circles and invite new members.</p>
                    </div>

                    <GroupManager
                        activeGroupId={groupId}
                        onGroupSync={(id) => id && setGroupId(id)}
                    />

                    <div className="pt-8">
                        <MemberList groupId={groupId || ''} />
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2rem] text-center border-dashed">
                        <div className="w-16 h-16 bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-600">
                            <Users size={24} />
                        </div>
                        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">More group tools coming soon</p>
                    </div>
                </div>
            </div>
        </main>
    );
}
