"use client";

import Sidebar from "@/components/Sidebar";
import InteractionDashboard from "@/components/InteractionDashboard";
import MeetingLogger from "@/components/MeetingLogger";
import GroupManager from "@/components/GroupManager";
import NotificationCenter from "@/components/NotificationCenter";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function Home() {
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
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />

      <div className="pl-64">
        {/* Top Header */}
        <header className="h-20 border-b border-slate-800 flex items-center justify-between px-10 sticky top-0 bg-slate-950/80 backdrop-blur-md z-10">
          <div>
            <span className="text-slate-500 text-sm">Active Session</span>
            <h2 className="font-semibold text-white italic">{session.user.email}</h2>
          </div>
          <div className="flex items-center gap-6">
            <NotificationCenter />
            <div className="flex items-center gap-4">
              <span className="bg-blue-500/10 text-blue-500 text-[10px] px-3 py-1 rounded-full font-black border border-blue-500/20 uppercase tracking-widest">Real-time Cloud</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-10 max-w-6xl mx-auto space-y-12">
          <GroupManager onGroupSync={() => {
            if (session) checkGroup(session.user.id);
          }} />

          {groupId ? (
            <>
              <MeetingLogger groupId={groupId} />
              <InteractionDashboard groupId={groupId} />
            </>
          ) : (
            <div className="text-center p-20 border-2 border-dashed border-slate-900 rounded-[3rem]">
              <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Waiting for circle selection...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
