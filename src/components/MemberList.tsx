"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Phone, MapPin, User, Info, Loader2, Mail } from 'lucide-react';

const MemberList = () => {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Get user's group
        const { data: residency } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', user.id)
            .single();

        if (residency) {
            // 2. Get all members of that group with their profile info
            const { data } = await supabase
                .from('group_members')
                .select(`
                    user_id,
                    profiles (*)
                `)
                .eq('group_id', residency.group_id);

            setMembers(data?.map(m => m.profiles) || []);
        }
        setLoading(false);
    };

    if (loading) return (
        <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-slate-800" size={24} />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Circle Directory</h3>
                <span className="bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-[10px] font-bold text-slate-400">
                    {members.length} Members
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {members.map(member => (
                    <div key={member.id} className="bg-slate-900/40 border border-slate-800 p-6 rounded-[2rem] hover:border-slate-700 transition-all group">
                        <div className="flex items-start gap-5">
                            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex-shrink-0">
                                <img
                                    src={member.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.name}`}
                                    className="w-full h-full object-cover"
                                    alt={member.name}
                                />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h4 className="text-lg font-black text-white truncate">{member.name}</h4>
                                <p className="text-slate-500 text-xs font-medium mb-4 flex items-center gap-2">
                                    <Mail size={12} /> {member.email}
                                </p>

                                <div className="space-y-3 pt-4 border-t border-slate-800/50">
                                    {member.phone && (
                                        <div className="flex items-center gap-3 text-xs text-slate-300">
                                            <Phone size={14} className="text-blue-500" />
                                            <span>{member.phone}</span>
                                        </div>
                                    )}
                                    {member.favorite_spot && (
                                        <div className="flex items-center gap-3 text-xs text-slate-300">
                                            <MapPin size={14} className="text-red-500" />
                                            <span className="truncate">{member.favorite_spot}</span>
                                        </div>
                                    )}
                                    {member.bio && (
                                        <div className="flex items-start gap-3 text-xs text-slate-400 italic">
                                            <Info size={14} className="text-slate-600 mt-0.5 flex-shrink-0" />
                                            <p className="line-clamp-2">{member.bio}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MemberList;
