"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Calendar, MapPin, Users as UsersIcon, Camera, Plus, Check, Loader2, ChevronDown, Trash2 } from 'lucide-react';
import { compressImage } from '@/lib/imageUtils';

interface MeetingLoggerProps {
    onSave?: () => void;
    initialData?: any;
    onCancel?: () => void;
}

const MeetingLogger = ({ onSave, initialData, onCancel }: MeetingLoggerProps) => {
    const [title, setTitle] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [location, setLocation] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [availableUsers, setAvailableUsers] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [mediaFile, setMediaFile] = useState<File | null>(null);
    const [mediaPreview, setMediaPreview] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);

    // Group Management State
    const [groups, setGroups] = useState<any[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [loadingGroups, setLoadingGroups] = useState(true);

    // 1. Init: Fetch User & Groups
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setCurrentUser(user);

            // Fetch User's Groups
            const { data: memberships } = await supabase
                .from('group_members')
                .select('group_id, groups(*)')
                .eq('user_id', user.id);

            if (memberships) {
                const loadedGroups = memberships
                    .map(m => Array.isArray(m.groups) ? m.groups[0] : m.groups)
                    .filter(Boolean);

                setGroups(loadedGroups);

                // Initialize Group Selection
                if (initialData?.group_id) {
                    setSelectedGroupId(initialData.group_id);
                } else if (!selectedGroupId && loadedGroups.length > 0) { // Only default if not already set (e.g. by previous user choice) and not editing
                    const lastUsed = localStorage.getItem('last_used_group_id');
                    const targetGroup = loadedGroups.find(g => g.id === lastUsed);

                    if (targetGroup) {
                        setSelectedGroupId(targetGroup.id);
                    } else {
                        setSelectedGroupId(loadedGroups[0].id);
                    }
                }
            }
            setLoadingGroups(false);
        };
        init();
    }, [initialData]);

    // 2. Pre-fill Data if Editing
    useEffect(() => {
        if (initialData) {
            setTitle(initialData.title || '');
            setDate(initialData.date || new Date().toISOString().split('T')[0]);
            setLocation(initialData.location || '');
            if (initialData.media_url) {
                setMediaPreview(initialData.media_url);
            }

            // Load members for this meeting logic
            // Since selecting members depends on selectedGroupId, wait for that
            // But we need to set selectedMembers based on existing participants
            // This requires fetching participants for this meeting ID
            const fetchParticipants = async () => {
                const { data: parts } = await supabase
                    .from('meeting_participants')
                    .select('user_id')
                    .eq('meeting_id', initialData.id);

                if (parts) {
                    setSelectedMembers(parts.map(p => p.user_id));
                }
            };
            fetchParticipants();
        }
    }, [initialData]);

    // 3. Fetch Members when Group Changes
    useEffect(() => {
        if (!selectedGroupId) {
            setAvailableUsers([]);
            return;
        }

        const fetchMembers = async () => {
            const { data: groupMembers } = await supabase
                .from('group_members')
                .select('user_id, profiles(*)')
                .eq('group_id', selectedGroupId);

            if (groupMembers) {
                const members = (groupMembers.map(m => m.profiles) as any[]).filter(Boolean);
                setAvailableUsers(members || []);
            }
        };
        fetchMembers();

        // 4. Persist Selection (Only if not editing to avoid overriding pref with edit data)
        if (!initialData) {
            localStorage.setItem('last_used_group_id', selectedGroupId);
        }

    }, [selectedGroupId, initialData]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setMediaFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setMediaPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAutoLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser");
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setCoords({ lat: latitude, lng: longitude });

            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await res.json();
                if (data.display_name) {
                    const parts = data.display_name.split(',');
                    const shortAddress = parts.slice(0, 3).join(',');
                    setLocation(shortAddress);
                } else {
                    setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                }
            } catch (err) {
                console.error("Geocoding error:", err);
                setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            } finally {
                setIsLocating(false);
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            alert("Could not get your location. Please check browser permissions.");
            setIsLocating(false);
        });
    };

    const toggleMember = (id: string) => {
        if (selectedMembers.includes(id)) {
            setSelectedMembers(selectedMembers.filter(m => m !== id));
        } else {
            setSelectedMembers([...selectedMembers, id]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser) return;
        if (!selectedGroupId) {
            alert("Please select a circle!");
            return;
        }

        setIsSaving(true);
        try {
            let mediaUrl = initialData?.media_url || '';

            if (mediaFile) {
                const isImage = mediaFile.type.startsWith('image/');
                let uploadData: File | Blob = mediaFile;
                let fileExt = mediaFile.name.split('.').pop();

                if (isImage) {
                    try {
                        uploadData = await compressImage(mediaFile);
                        fileExt = 'webp';
                    } catch (err) {
                        console.error('Compression failed, uploading original:', err);
                    }
                }

                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `${currentUser.id}/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('meeting_media')
                    .upload(filePath, uploadData);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('meeting_media')
                    .getPublicUrl(filePath);

                mediaUrl = publicUrl;
            } else if (mediaPreview === null) {
                // User removed media
                mediaUrl = '';
            }

            const meetingData = {
                group_id: selectedGroupId,
                created_by: currentUser.id, // Keep owner same if editing
                title,
                date,
                location,
                latitude: coords?.lat || initialData?.latitude || 40.7128,
                longitude: coords?.lng || initialData?.longitude || -74.0060,
                media_url: mediaUrl
            };

            let meetingId = initialData?.id;

            if (initialData) {
                // UPDATE
                const { error: updateError } = await supabase
                    .from('meetings')
                    .update(meetingData)
                    .eq('id', initialData.id);

                if (updateError) throw updateError;
            } else {
                // INSERT
                const { data: newMeeting, error: insertError } = await supabase
                    .from('meetings')
                    .insert([meetingData])
                    .select()
                    .single();

                if (insertError) throw insertError;
                meetingId = newMeeting.id;
            }

            // Upsert participants
            // Simplest way is delete all for this meeting and re-insert, or smart diff.
            // Since we have 'Delete participants' policy now, we can delete old ones.
            // But 'Delete participants' policy I added checks if user is creator. Good.

            if (initialData) {
                await supabase.from('meeting_participants').delete().eq('meeting_id', meetingId);
            }

            const participantData = selectedMembers.map(userId => ({
                meeting_id: meetingId,
                user_id: userId
            }));

            const { error: participantError } = await supabase
                .from('meeting_participants')
                .insert(participantData);

            if (participantError) throw participantError;

            alert(initialData ? "Memory Updated!" : "Memory Saved Successfully!");

            if (!initialData) {
                setTitle(''); setDate(new Date().toISOString().split('T')[0]); setLocation(''); setSelectedMembers([]); setMediaFile(null); setMediaPreview(null);
            }

            if (onSave) onSave();
        } catch (error: any) {
            console.error("Save error:", error);
            alert(`Error: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (loadingGroups) return (
        <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-blue-500" />
        </div>
    );

    if (groups.length === 0) return (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2rem] text-center">
            <h3 className="text-xl font-bold text-white mb-2">No Circles Yet</h3>
            <p className="text-slate-500 text-sm mb-6">Create or join a circle to start logging memories.</p>
            <a href="/groups" className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-500 transition-colors">
                <Plus size={16} /> Manage Circles
            </a>
        </div>
    );

    return (
        <section className={`bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] shadow-xl relative overflow-hidden ${initialData ? 'border-blue-500/50 shadow-blue-500/20' : ''}`}>
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none hidden md:block">
                <UsersIcon size={80} />
            </div>

            <div className="mb-8 md:mb-10 relative flex justify-between items-start">
                <div>
                    <h3 className="text-xl md:text-2xl font-black text-white mb-2 ml-1">{initialData ? 'Edit Memory' : 'Log Real Reunion'}</h3>
                    <p className="text-slate-500 text-sm md:text-base font-medium ml-1">{initialData ? 'Update details of your past adventure.' : 'Storing your memories permanently in Supabase.'}</p>
                </div>
                {initialData && onCancel && (
                    <button onClick={onCancel} className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest">
                        Cancel
                    </button>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">

                <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 block ml-1">
                        Select Circle
                    </label>
                    <div className="relative">
                        <select
                            value={selectedGroupId}
                            onChange={(e) => setSelectedGroupId(e.target.value)}
                            disabled={!!initialData} // Lock group when editing for simplicity, or allow move? Lock is safer for now.
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-white appearance-none focus:border-blue-500 outline-none transition-all font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={20} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <InputGroup label="Memory Title" icon={<Calendar size={18} />}>
                        <input
                            type="text"
                            placeholder="Dinner at Joe's"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                            required
                        />
                    </InputGroup>
                    <InputGroup label="Date" icon={<Calendar size={18} />}>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-blue-500 outline-none transition-all"
                            required
                        />
                    </InputGroup>
                    <InputGroup label="Location" icon={<MapPin size={18} />}>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Manhattan, NY"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 pr-16 text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                                required
                            />
                            <button
                                type="button"
                                onClick={handleAutoLocation}
                                disabled={isLocating}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-blue-500 transition-all disabled:opacity-50"
                                title="Use current location"
                            >
                                {isLocating ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} />}
                            </button>
                        </div>
                    </InputGroup>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block ml-1">Who participated?</label>
                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
                        {availableUsers.length > 0 ? availableUsers.map(user => (
                            <button
                                key={user.id}
                                type="button"
                                onClick={() => toggleMember(user.id)}
                                className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-3 rounded-xl md:rounded-2xl border-2 transition-all ${selectedMembers.includes(user.id)
                                    ? 'border-blue-500 bg-blue-500/10 text-white'
                                    : 'border-slate-800 bg-slate-950 text-slate-500 hover:border-slate-700'
                                    }`}
                            >
                                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[8px] md:text-[10px] shrink-0">
                                    {selectedMembers.includes(user.id) ? <Check size={10} /> : (user?.name?.charAt(0) || '?')}
                                </div>
                                <span className="text-[10px] md:text-xs font-bold truncate">{user?.name || 'Unknown'}</span>
                            </button>
                        )) : (
                            <p className="text-slate-600 text-[10px] md:text-xs italic p-4 bg-slate-950 w-full rounded-2xl border border-slate-800">
                                {selectedGroupId ? "No other members in this circle yet." : "Select a circle to see members."}
                            </p>
                        )}
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 block ml-1">Attach Media (Photo/Video)</label>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-4 md:gap-6">
                        <label className="w-full sm:w-32 h-32 bg-slate-950 border-2 border-dashed border-slate-800 rounded-2xl md:rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-slate-900 transition-all group shrink-0">
                            <Camera className="text-slate-700 group-hover:text-blue-500 mb-2" size={24} />
                            <span className="text-[10px] font-bold text-slate-700 group-hover:text-white uppercase tracking-widest">Upload</span>
                            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                        </label>

                        {mediaPreview && (
                            <div className="relative w-full h-32 bg-slate-950 rounded-2xl md:rounded-3xl overflow-hidden border border-slate-800 flex-1">
                                {mediaFile?.type.startsWith('video') ? (
                                    <video src={mediaPreview} className="w-full h-full object-cover opacity-50" />
                                ) : (
                                    <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover opacity-50" />
                                )}
                                <div className="absolute inset-0 flex items-center justify-center px-4">
                                    <span className="text-[8px] md:text-[10px] font-black text-blue-500 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 uppercase tracking-[0.2em] backdrop-blur-md text-center">
                                        {mediaFile ? 'New File Ready' : 'Existing File'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setMediaFile(null); setMediaPreview(null); }}
                                    className="absolute top-3 right-3 w-8 h-8 bg-slate-900/80 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/20 transition-all z-10"
                                >
                                    <Plus className="rotate-45" size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-8 border-t border-slate-800">
                    <button
                        type="submit"
                        disabled={isSaving || !title || !date || !location || selectedMembers.length === 0}
                        className="w-full sm:w-auto bg-white text-black font-black uppercase tracking-[0.15em] px-12 py-4 md:py-5 rounded-xl md:rounded-2xl hover:scale-[1.03] active:scale-[0.97] transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-3"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={20} /> : (initialData ? "Update Memory" : "Record Permanent Memory")}
                    </button>
                </div>
            </form>
        </section>
    );
};

const InputGroup = ({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) => (
    <div className="space-y-3">
        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
            {icon} {label}
        </label>
        {children}
    </div>
);

export default MeetingLogger;
