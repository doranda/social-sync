export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  image?: string; // For mock pictures
  created_at: string;
}

export interface Group {
  id: string;
  name: string;
  created_by: string; // User ID
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
  joined_at: string;
}

export interface Event {
  id: string;
  group_id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  coordinates?: [number, number]; // [lat, lng]
  created_at: string;
}

export interface EventParticipant {
  event_id: string;
  user_id: string;
}
