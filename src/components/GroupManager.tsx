"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Users as UsersIcon, Plus, UserPlus, Copy, Check, Hash, Loader2, Sparkles } from 'lucide-react';

const GroupManager = ({ onGroupSync }: { onGroupSync: () => void }) => {
    const [currentGroup, setCurrentGroup] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [action, setAction] = useState<'none' | 'create' | 'join'>('none');

    const [groupName, setGroupName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [searchEmail, setSearchEmail] = useState('');
    const [inviting, setInviting] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        fetchGroup();
    }, []);

    const fetchGroup = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Find group where user is a member
        const { data: membership } = await supabase
            .from('group_members')
            .select('group_id, groups(*)')
            .eq('user_id', user.id)
            .single();

        if (membership) {
            setCurrentGroup(membership.groups);
            onGroupSync();
        }
        setLoading(false);
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();

        try {
            // 1. Create Group
            const { data: group, error: groupErr } = await supabase
                .from('groups')
                .insert([{ name: groupName, created_by: user?.id }])
                .select()
                .single();

            if (groupErr) throw groupErr;

            // 2. Add as member
            const { error: memberErr } = await supabase
                .from('group_members')
                .insert([{ group_id: group.id, user_id: user?.id }]);

            if (memberErr) throw memberErr;

            setCurrentGroup(group);
            setAction('none');
            onGroupSync();
            alert(`Group "${groupName}" created!`);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleJoinGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();

        try {
            // 1. Find group by invite code
            const { data: group, error: groupErr } = await supabase
                .from('groups')
                .select('*')
                .eq('invite_code', inviteCode.trim())
                .single();

            if (groupErr || !group) throw new Error("Invalid invite code. Please check with your friend!");

            // 2. Join Group
            const { error: memberErr } = await supabase
                .from('group_members')
                .insert([{ group_id: group.id, user_id: user?.id }]);

            if (memberErr) throw memberErr;

            setCurrentGroup(group);
            setAction('none');
            onGroupSync();
            alert(`Successfully joined "${group.name}"!`);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const copyInviteCode = () => {
        if (!currentGroup) return;
        navigator.clipboard.writeText(currentGroup.invite_code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchEmail.trim()) return;
        setInviting(true);

        try {
            // 1. Search for user in profiles by email (assuming email is stored in profiles or we use a secure RPC)
            // Note: In Supabase, you usually store email in profiles for public searching
            const { data: profile, error: profileErr } = await supabase
                .from('profiles')
                .select('id, name')
                .eq('email', searchEmail.trim().toLowerCase())
                .maybeSingle();

            if (profileErr) throw profileErr;

            if (profile) {
                // Check if user already in group
                const { data: existingMember } = await supabase
                    .from('group_members')
                    .select('*')
                    .eq('group_id', currentGroup.id)
                    .eq('user_id', profile.id)
                    .maybeSingle();

                if (existingMember) {
                    alert(`${profile.name || searchEmail} is already in the group!`);
                } else {
                    // Add to group
                    const { error: inviteErr } = await supabase
                        .from('group_members')
                        .insert([{ group_id: currentGroup.id, user_id: profile.id }]);

                    if (inviteErr) throw inviteErr;
                    alert(`Successfully added ${profile.name || searchEmail} to the group!`);
                    onGroupSync();
                }
            } else {
                // User not found
                const confirmed = confirm(`No user found with email "${searchEmail}". Would you like to send an external invitation link?`);
                if (confirmed) {
                    // Mocking email invite functionality
                    alert(`Invitation link for "${searchEmail}" generated and copied to clipboard! (Mocked)`);
                    const shareLink = `${window.location.origin}/auth?join=${currentGroup.invite_code}`;
                    navigator.clipboard.writeText(shareLink);
                }
            }
            setSearchEmail('');
        } catch (err: any) {
            console.error(err);
            alert(`Error: ${err.message}`);
        } finally {
            setInviting(false);
        }
    };

    if (loading) return null;

    if (!currentGroup) {
        return (
            <div className="bg-slate-900 border border-slate-800 p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]" />

                <div className="text-center relative z-10">
                    <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-500 shadow-xl border border-slate-700">
                        <UsersIcon size={32} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 tracking-tight">You haven't joined a group yet.</h3>
                    <p className="text-slate-500 mb-8 font-medium">Friendships are better together. Create a new circle or join an existing one.</p>

                    {action === 'none' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button
                                onClick={() => setAction('create')}
                                className="flex flex-col items-center justify-center p-8 bg-slate-950 border border-slate-800 rounded-[2rem] hover:border-blue-500 transition-all group"
                            >
                                <Plus className="text-slate-600 mb-2 group-hover:text-blue-500 group-hover:scale-125 transition-all" size={32} />
                                <span className="font-black text-xs uppercase tracking-widest text-slate-500 group-hover:text-white">Start New Group</span>
                            </button>
                            <button
                                onClick={() => setAction('join')}
                                className="flex flex-col items-center justify-center p-8 bg-slate-950 border border-slate-800 rounded-[2rem] hover:border-purple-500 transition-all group"
                            >
                                <UserPlus className="text-slate-600 mb-2 group-hover:text-purple-500 group-hover:scale-125 transition-all" size={32} />
                                <span className="font-black text-xs uppercase tracking-widest text-slate-500 group-hover:text-white">Join via Invite Code</span>
                            </button>
                        </div>
                    )}

                    {action === 'create' && (
                        <form onSubmit={handleCreateGroup} className="mt-8 space-y-4 max-w-sm mx-auto">
                            <input
                                type="text"
                                placeholder="Group Name (e.g. The Magnificent Seven)"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                                required
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setAction('none')} className="flex-1 py-4 font-bold text-slate-500 hover:text-white">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-[2] bg-blue-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-blue-500/20 disabled:opacity-50">
                                    {submitting ? <Loader2 className="animate-spin mx-auto" /> : 'Create Group'}
                                </button>
                            </div>
                        </form>
                    )}

                    {action === 'join' && (
                        <form onSubmit={handleJoinGroup} className="mt-8 space-y-4 max-w-sm mx-auto">
                            <div className="relative">
                                <Hash className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-700" size={18} />
                                <input
                                    type="text"
                                    placeholder="Enter Invite Code"
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-14 pr-6 py-4 text-white focus:border-purple-500 outline-none transition-all placeholder:text-slate-700 font-mono tracking-widest uppercase"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setAction('none')} className="flex-1 py-4 font-bold text-slate-500 hover:text-white">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-[2] bg-purple-600 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-purple-500/20 disabled:opacity-50">
                                    {submitting ? <Loader2 className="animate-spin mx-auto" /> : 'Join Group'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                    <Sparkles size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Active Circle</p>
                    <h3 className="text-xl font-black text-white tracking-tight">{currentGroup.name}</h3>
                </div>
            </div>

            <div className="flex items-center gap-6 flex-1 justify-end">
                {/* Search Bar */}
                <form onSubmit={handleInviteUser} className="hidden lg:flex items-center gap-2 group/search">
                    <div className="relative">
                        <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-700 group-hover/search:text-blue-500 transition-colors" size={16} />
                        <input
                            type="email"
                            placeholder="Invite via email..."
                            value={searchEmail}
                            onChange={(e) => setSearchEmail(e.target.value)}
                            className="bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-3 text-xs text-white focus:border-blue-500 outline-none w-64 transition-all"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={inviting || !searchEmail}
                        className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-blue-600"
                    >
                        {inviting ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />}
                    </button>
                </form>

                <div className="flex items-center gap-2">
                    <div className="hidden md:flex flex-col items-end mr-2">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Invite Code</p>
                        <p className="text-xs font-mono font-bold text-blue-400 uppercase">{currentGroup.invite_code}</p>
                    </div>
                    <button
                        onClick={copyInviteCode}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${copied ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                    >
                        {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Invite Code</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupManager;
