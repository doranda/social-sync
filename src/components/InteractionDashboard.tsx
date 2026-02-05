"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import InteractionChart from './InteractionChart';
import MeetingMap from './MeetingMap';
import ScrapbookExport from './ScrapbookExport';
import { MapPin, TrendingUp, Users as UsersIcon, Star, Filter, Loader2, MessageCircle, Heart, Send, User as UserIcon, Calendar, Trophy, Zap, Award, Target } from 'lucide-react';
import { User, Event } from '@/types';

interface Comment {
    id: string;
    meeting_id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles: { name: string, avatar_url: string };
}

interface Reaction {
    id: string;
    meeting_id: string;
    user_id: string;
    emoji: string;
}

const InteractionDashboard = ({ groupId }: { groupId: string }) => {
    const [selectedYear, setSelectedYear] = useState<string>('All');
    const [users, setUsers] = useState<User[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [participants, setParticipants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [comments, setComments] = useState<Record<string, Comment[]>>({});
    const [reactions, setReactions] = useState<Record<string, Reaction[]>>({});
    const [badges, setBadges] = useState<any[]>([]);
    const [userBadges, setUserBadges] = useState<any[]>([]);
    const [newComment, setNewComment] = useState<Record<string, string>>({});
    const [currentUser, setCurrentUser] = useState<any>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch group members' profiles
                const { data: groupMembers } = await supabase
                    .from('group_members')
                    .select('profiles(*)')
                    .eq('group_id', groupId);

                const profileData = (groupMembers?.map(m => Array.isArray(m.profiles) ? m.profiles[0] : m.profiles) as any[]).filter(Boolean);
                setUsers(profileData);

                // Fetch meetings for THIS group
                const { data: meetingData } = await supabase
                    .from('meetings')
                    .select('*, created_by')
                    .eq('group_id', groupId);
                setEvents(meetingData || []);

                // Fetch participants for these meetings
                if (meetingData && meetingData.length > 0) {
                    const meetingIds = meetingData.map(m => m.id);
                    const { data: participantData } = await supabase
                        .from('meeting_participants')
                        .select('*')
                        .in('meeting_id', meetingIds);
                    setParticipants(participantData || []);

                    // Fetch Comments & Reactions for these meetings
                    const { data: commentData } = await supabase
                        .from('comments')
                        .select('*, profiles(name, avatar_url)')
                        .in('meeting_id', meetingIds)
                        .order('created_at', { ascending: true });

                    const { data: reactionData } = await supabase
                        .from('reactions')
                        .select('*')
                        .in('meeting_id', meetingIds);

                    const commentMap: Record<string, Comment[]> = {};
                    commentData?.forEach((c: any) => {
                        if (!commentMap[c.meeting_id]) commentMap[c.meeting_id] = [];
                        commentMap[c.meeting_id].push(c);
                    });
                    setComments(commentMap);

                    const reactionMap: Record<string, Reaction[]> = {};
                    reactionData?.forEach((r: any) => {
                        if (!reactionMap[r.meeting_id]) reactionMap[r.meeting_id] = [];
                        reactionMap[r.meeting_id].push(r);
                    });
                    setReactions(reactionMap);

                    // Fetch Badges
                    const { data: badgeData } = await supabase.from('badges').select('*');
                    const { data: userBadgeData } = await supabase.from('user_badges').select('badge_id').eq('user_id', currentUser?.id);
                    setBadges(badgeData || []);
                    setUserBadges(userBadgeData || []);

                    if (currentUser) {
                        checkBadges(currentUser.id, meetingData || [], participantData || []);
                    }
                } else {
                    setParticipants([]);
                    setComments({});
                    setReactions({});
                }

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setCurrentUser(user);
        };

        const checkBadges = async (userId: string, meetings: any[], allParticipants: any[]) => {
            // Simple Badge logic
            const meetingCount = meetings.length;
            const myParticipants = allParticipants.filter(p => meetings.some(m => m.id === p.meeting_id));
            const participantCounts = meetings.map(m => allParticipants.filter(p => p.meeting_id === m.id).length);

            // Fetch all available badges
            const { data: availableBadges } = await supabase.from('badges').select('*');
            if (!availableBadges) return;

            for (const badge of availableBadges) {
                let earned = false;
                if (badge.criteria_type === 'meeting_count' && meetingCount >= badge.criteria_value) {
                    earned = true;
                } else if (badge.criteria_type === 'participant_count') {
                    const maxParticipants = participantCounts.length > 0 ? Math.max(...participantCounts) : 0;
                    if (maxParticipants >= badge.criteria_value) earned = true;
                } else if (badge.criteria_type === 'streak') {
                    // Simple streak: if user has participated in multiple meetings with same people
                    // For now, let's just use meeting count as a proxy for engagement
                    if (meetingCount >= badge.criteria_value) earned = true;
                }
                // (More complex logic for other badge types can be added here)

                if (earned) {
                    // Check if already awarded
                    const { data: existing } = await supabase
                        .from('user_badges')
                        .select('*')
                        .eq('user_id', userId)
                        .eq('badge_id', badge.id)
                        .single();

                    if (!existing) {
                        const { error } = await supabase
                            .from('user_badges')
                            .insert([{ user_id: userId, badge_id: badge.id }]);

                        if (!error) {
                            // Trigger Notification for badge
                            await supabase.from('notifications').insert([{
                                user_id: userId,
                                type: 'badge',
                                title: 'New Badge Unlocked!',
                                content: `Congrats! You've earned the "${badge.name}" badge.`,
                                link: '#trophy-room'
                            }]);
                            setUserBadges(prev => [...prev, { badge_id: badge.id }]);
                        }
                    }
                }
            }
        };

        fetchData();
        fetchUser();
    }, [groupId, currentUser?.id]);

    // Dynamic Year Logic
    const availableYears = useMemo(() => {
        const years = new Set(events.map(e => e.date.split('-')[0]));
        // Ensure standard years (2023-2025) are always present for consistency if data is sparse, 
        // OR just rely strictly on data. Let's rely on data + current year to ensure at least one option.
        const currentYear = new Date().getFullYear().toString();
        years.add(currentYear);
        if (events.length === 0) {
            years.add('2024');
            years.add('2023');
        }
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [events]);

    const filteredEvents = useMemo(() => {
        if (selectedYear === 'All') return events;
        return events.filter(e => e.date.startsWith(selectedYear));
    }, [selectedYear, events]);

    const handlePostComment = async (meetingId: string) => {
        const content = newComment[meetingId];
        if (!content || !content.trim() || !currentUser) return;

        const { data, error } = await supabase
            .from('comments')
            .insert([{
                meeting_id: meetingId,
                user_id: currentUser.id,
                content: content.trim()
            }])
            .select('*, profiles(name, avatar_url)')
            .single();

        if (data) {
            setComments(prev => ({
                ...prev,
                [meetingId]: [...(prev[meetingId] || []), data]
            }));
            setNewComment(prev => ({ ...prev, [meetingId]: '' }));

            // Trigger Notification
            const meeting = events.find(e => e.id === meetingId);
            if (meeting?.created_by && meeting.created_by !== currentUser.id) {
                await supabase.from('notifications').insert([{
                    user_id: meeting.created_by,
                    type: 'comment',
                    title: 'New Comment',
                    content: `${data.profiles.name} commented on your memory: "${content.substring(0, 20)}..."`,
                    link: `#meeting-${meetingId}`
                }]);
            }
        }
    };

    const handleToggleReaction = async (meetingId: string, emoji: string) => {
        if (!currentUser) return;

        const existing = reactions[meetingId]?.find(r => r.user_id === currentUser.id && r.emoji === emoji);

        if (existing) {
            const { error } = await supabase
                .from('reactions')
                .delete()
                .eq('id', existing.id);

            if (!error) {
                setReactions(prev => ({
                    ...prev,
                    [meetingId]: prev[meetingId].filter(r => r.id !== existing.id)
                }));
            }
        } else {
            const { data, error } = await supabase
                .from('reactions')
                .insert([{
                    meeting_id: meetingId,
                    user_id: currentUser.id,
                    emoji
                }])
                .select()
                .single();

            if (data) {
                setReactions(prev => ({
                    ...prev,
                    [meetingId]: [...(prev[meetingId] || []), data]
                }));

                // Trigger Notification
                const meeting = events.find(e => e.id === meetingId);
                const userProfile = users.find(u => u.id === currentUser.id);
                if (meeting?.created_by && meeting.created_by !== currentUser.id) {
                    await supabase.from('notifications').insert([{
                        user_id: meeting.created_by,
                        type: 'reaction',
                        title: 'New Reaction',
                        content: `${userProfile?.name || 'Someone'} reacted with ${emoji} to your memory.`,
                        link: `#meeting-${meetingId}`
                    }]);
                }
            }
        }
    };

    const getInteractionCount = (userA: string, userB: string) => {
        if (userA === userB) return null;

        let count = 0;
        filteredEvents.forEach(event => {
            const eventParticipants = participants
                .filter(p => p.meeting_id === event.id)
                .map(p => p.user_id);

            if (eventParticipants.includes(userA) && eventParticipants.includes(userB)) {
                count++;
            }
        });
        return count;
    };

    const stats = useMemo(() => {
        const totalMeetings = filteredEvents.length;
        if (totalMeetings === 0) return { totalMeetings, avgParticipants: 0, topDuo: [{ userName: '---' }], chartData: [] };

        const participantCounts = filteredEvents.map(event =>
            participants.filter(p => p.meeting_id === event.id).length
        );
        const avgParticipants = participantCounts.length > 0 ? participantCounts.reduce((a: number, b: number) => a + b, 0) / totalMeetings : 0;

        const pairwiseCounts: Record<string, number> = {};
        filteredEvents.forEach(event => {
            const eventParticipants = participants
                .filter(p => p.meeting_id === event.id)
                .map(p => p.user_id);

            for (let i = 0; i < eventParticipants.length; i++) {
                for (let j = i + 1; j < eventParticipants.length; j++) {
                    const pair = [eventParticipants[i], eventParticipants[j]].sort().join('-');
                    pairwiseCounts[pair] = (pairwiseCounts[pair] || 0) + 1;
                }
            }
        });

        const topPair = Object.entries(pairwiseCounts).sort((a, b) => b[1] - a[1])[0];
        const topDuo = topPair ? topPair[0].split('-').map(id => ({
            id,
            userName: users.find(u => u.id === id)?.name || 'Unknown'
        })) : [{ userName: '---' }];

        const chartData = filteredEvents.map(e => ({
            date: e.date,
            count: participants.filter(p => p.meeting_id === e.id).length
        }));

        return { totalMeetings, avgParticipants, topDuo, chartData };
    }, [filteredEvents, participants, users]);

    const fullGroupMeetups = filteredEvents.filter(event => {
        const eventParticipants = participants.filter(p => p.meeting_id === event.id);
        return users.length > 0 && eventParticipants.length === users.length;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-500 gap-4">
                <Loader2 className="animate-spin" size={32} />
                <p className="font-bold uppercase tracking-widest text-xs">Syncing with Supabase...</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-20">
            {/* Header with Filter & Scrapbook */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/40 p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] border border-slate-800 backdrop-blur-sm">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-white mb-2 tracking-tight">Social Insights Dashboard</h2>
                    <p className="text-slate-400 text-sm md:text-base">Connected to your real-time friendship network.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:gap-6">
                    <div className="flex items-center gap-2 md:gap-3 bg-slate-950 p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-slate-800 overflow-x-auto no-scrollbar">
                        <Filter size={16} className="ml-2 text-slate-500 shrink-0" />
                        {availableYears.map(year => (
                            <button
                                key={year}
                                onClick={() => setSelectedYear(year)}
                                className={`px-4 md:px-5 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:sm font-bold transition-all whitespace-nowrap ${selectedYear === year
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'text-slate-500 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {year}
                            </button>
                        ))}
                        <button
                            onClick={() => setSelectedYear('All')}
                            className={`px-4 md:px-5 py-1.5 md:py-2 rounded-lg md:rounded-xl text-xs md:sm font-bold transition-all whitespace-nowrap ${selectedYear === 'All'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-500 hover:text-white hover:bg-slate-800'
                                }`}
                        >
                            All
                        </button>
                    </div>
                    <div className="w-full sm:w-auto">
                        <ScrapbookExport data={{
                            groupName: users[0]?.name ? `${users[0].name.split(' ')[0]}'s Circle` : 'My SocialSync Circle',
                            events: filteredEvents,
                            users: users
                        }} />
                    </div>
                </div>
            </div>

            {/* Empty State Check */}
            {events.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 p-8 md:p-20 rounded-[2rem] md:rounded-[3rem] text-center border-dashed">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-800 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-500">
                        <TrendingUp size={32} className="md:w-10 md:h-10" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-black text-white mb-2">The database is currently quiet.</h3>
                    <p className="text-slate-500 text-sm md:text-base max-w-md mx-auto mb-8">
                        Once you log your first reunion above, your interaction charts, heatmaps, and map pins will come to life here.
                    </p>
                </div>
            ) : (
                <>
                    {/* Hero Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard icon={<UsersIcon className="text-blue-500" />} label="Total Network" value={users.length.toString()} />
                        <StatCard icon={<TrendingUp className="text-emerald-500" />} label={`Logs in ${selectedYear}`} value={stats.totalMeetings.toString()} />
                        <StatCard icon={<Zap className="text-amber-500" />} label="Sync Score" value={stats.avgParticipants.toFixed(1)} />
                        <StatCard icon={<Star className="text-purple-500" />} label="Power Duo" value={stats.topDuo[0].userName.split(' ')[0]} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10">
                            <div className="flex items-center justify-between mb-8 md:mb-10">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Network Health</p>
                                    <h3 className="text-xl md:text-2xl font-black text-white">Interaction Density</h3>
                                </div>
                            </div>
                            <div className="h-[250px] md:h-auto">
                                <InteractionChart year={selectedYear} data={filteredEvents} />
                            </div>
                        </div>

                        <div id="trophy-room" className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10">
                            <div className="flex items-center gap-3 mb-8">
                                <Trophy className="text-amber-500" size={24} />
                                <h3 className="text-xl font-black text-white uppercase tracking-wider">Trophy Room</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {badges.map((badge: any) => {
                                    const isEarned = userBadges.some(ub => ub.badge_id === badge.id);
                                    return (
                                        <div
                                            key={badge.id}
                                            className={`p-4 rounded-2xl border flex flex-col items-center text-center transition-all ${isEarned ? 'bg-slate-950 border-amber-500/50 shadow-lg shadow-amber-500/5' : 'bg-slate-950/20 border-slate-800 opacity-40 grayscale'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${isEarned ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-800 text-slate-600'}`}>
                                                <Award size={20} />
                                            </div>
                                            <p className="text-[9px] font-black text-white uppercase tracking-widest leading-tight mb-1">{badge.name}</p>
                                            <p className="text-[7px] text-slate-500 font-bold uppercase">{isEarned ? 'Earned' : 'Locked'}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Geography Section */}
                    <div className="bg-slate-900 border border-slate-800 p-6 md:p-10 rounded-[2rem] md:rounded-[3rem]">
                        <h3 className="text-lg md:text-xl font-bold text-white mb-8 flex items-center gap-2 uppercase tracking-widest">
                            <MapPin size={20} className="text-red-500" /> Geography of Friendships
                        </h3>
                        <div className="h-[300px] md:h-[400px] border border-slate-800 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden">
                            <MeetingMap year={selectedYear} data={filteredEvents} />
                        </div>
                    </div>

                    {/* Recent Memories Gallery */}
                    {filteredEvents.some(e => e.media_url) && (
                        <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[3rem] overflow-hidden">
                            <h3 className="text-xl font-bold text-white mb-8 flex items-center gap-2 uppercase tracking-widest">
                                <Star size={20} className="text-yellow-500" /> Captured Moments
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredEvents.filter(e => e.media_url).map(event => (
                                    <div key={event.id} className="bg-slate-950/50 border border-slate-800 rounded-[2.5rem] overflow-hidden group/card shadow-lg hover:shadow-2xl transition-all h-fit flex flex-col">
                                        <div className="aspect-video bg-slate-950 relative overflow-hidden">
                                            <img src={event.media_url} alt={event.title} className="w-full h-full object-cover group-hover/card:scale-110 transition-transform duration-700" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80" />
                                            <div className="absolute bottom-4 left-6 right-6">
                                                <h4 className="text-white font-black text-sm mb-1">{event.title}</h4>
                                                <div className="flex items-center gap-3 text-slate-400 text-[8px] font-bold uppercase tracking-widest">
                                                    <div className="flex items-center gap-1"><Calendar size={10} /> {new Date(event.date).toLocaleDateString()}</div>
                                                    <div className="flex items-center gap-1"><MapPin size={10} /> {event.location?.split(',')[0]}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Social Bar */}
                                        <div className="p-6 space-y-4">
                                            <div className="flex items-center justify-between border-b border-slate-800/50 pb-4">
                                                <div className="flex gap-4">
                                                    <button
                                                        onClick={() => handleToggleReaction(event.id, '❤️')}
                                                        className={`flex items-center gap-1.5 text-xs font-bold transition-all ${reactions[event.id]?.some(r => r.user_id === currentUser?.id && r.emoji === '❤️') ? 'text-red-500 scale-110' : 'text-slate-500 hover:text-red-400'}`}
                                                    >
                                                        <Heart size={16} fill={reactions[event.id]?.some(r => r.user_id === currentUser?.id && r.emoji === '❤️') ? 'currentColor' : 'none'} />
                                                        {reactions[event.id]?.filter(r => r.emoji === '❤️').length || 0}
                                                    </button>
                                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                                                        <MessageCircle size={16} />
                                                        {comments[event.id]?.length || 0}
                                                    </div>
                                                </div>
                                                <div className="flex -space-x-2">
                                                    {participants.filter(p => p.meeting_id === event.id).slice(0, 3).map((p, i) => {
                                                        const u = users.find(user => user.id === p.user_id);
                                                        return (
                                                            <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 overflow-hidden bg-slate-800 flex items-center justify-center">
                                                                {u?.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" /> : <UserIcon size={12} />}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Comments Preview */}
                                            <div className="space-y-3 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                                                {(comments[event.id] || []).map(comment => (
                                                    <div key={comment.id} className="flex gap-3 text-xs">
                                                        <div className="w-6 h-6 rounded-lg overflow-hidden bg-slate-800 shrink-0 mt-0.5">
                                                            {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" /> : <UserIcon size={12} className="m-auto" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-black text-slate-300 text-[10px] mb-0.5">{comment.profiles?.name || 'User'}</p>
                                                            <p className="text-slate-500 leading-relaxed text-[11px]">{comment.content}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!comments[event.id] || comments[event.id].length === 0) && (
                                                    <p className="text-[10px] text-slate-700 italic text-center py-2">No vibes yet. Be the first!</p>
                                                )}
                                            </div>

                                            {/* Post Comment */}
                                            <div className="flex gap-2 group/input">
                                                <input
                                                    type="text"
                                                    placeholder="Add a comment..."
                                                    value={newComment[event.id] || ''}
                                                    onChange={(e) => setNewComment(prev => ({ ...prev, [event.id]: e.target.value }))}
                                                    onKeyDown={(e) => e.key === 'Enter' && handlePostComment(event.id)}
                                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:border-blue-500 outline-none placeholder:text-slate-700 transition-all"
                                                />
                                                <button
                                                    onClick={() => handlePostComment(event.id)}
                                                    disabled={!newComment[event.id]?.trim()}
                                                    className="bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-all disabled:opacity-30"
                                                >
                                                    <Send size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Interaction Matrix */}
                    {users.length > 0 && (
                        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] md:rounded-3xl overflow-hidden">
                            <h3 className="text-lg md:text-xl font-bold text-white mb-8">Social Interaction Matrix</h3>
                            <div className="overflow-x-auto -mx-6 md:mx-0 px-6 md:px-0 no-scrollbar">
                                <table className="w-full text-left min-w-[600px]">
                                    <thead>
                                        <tr>
                                            <th className="p-4"></th>
                                            {users.map(user => (
                                                <th key={user.id} className="p-4 text-center">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-800 mx-auto mb-2 border-2 border-slate-700 flex items-center justify-center font-black text-slate-500 text-[10px] uppercase">
                                                        {user.name.charAt(0)}
                                                    </div>
                                                    <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">{user.name.split(' ')[0]}</span>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map(rowUser => (
                                            <tr key={rowUser.id} className="border-t border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                                                <td className="p-4 font-bold text-white text-xs md:text-sm whitespace-nowrap">{rowUser.name}</td>
                                                {users.map(colUser => {
                                                    const count = getInteractionCount(rowUser.id, colUser.id);
                                                    return (
                                                        <td key={colUser.id} className="p-4 text-center">
                                                            <div className={`
                                                                w-10 h-10 md:w-12 md:h-12 mx-auto rounded-xl md:rounded-2xl flex items-center justify-center font-black text-base md:text-lg transition-all
                                                                ${count === null ? 'bg-slate-950/30 text-slate-800' :
                                                                    count > 0 ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-950 text-slate-900'
                                                                }
                                                            `}>
                                                                {count !== null ? count : '-'}
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl flex items-center gap-5">
        <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-xl">
            {icon}
        </div>
        <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{label}</p>
            <p className="text-2xl font-black text-white">{value}</p>
        </div>
    </div>
);

export default InteractionDashboard;

