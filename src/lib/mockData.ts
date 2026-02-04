import { User, Group, Event } from "../types";

export const MOCK_USERS: User[] = [
    { id: "1", name: "Alice", email: "alice@example.com", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice", created_at: new Date().toISOString() },
    { id: "2", name: "Bob", email: "bob@example.com", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob", created_at: new Date().toISOString() },
    { id: "3", name: "Charlie", email: "charlie@example.com", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie", created_at: new Date().toISOString() },
    { id: "4", name: "David", email: "david@example.com", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=David", created_at: new Date().toISOString() },
    { id: "5", name: "Eve", email: "eve@example.com", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eve", created_at: new Date().toISOString() },
    { id: "6", name: "Frank", email: "frank@example.com", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Frank", created_at: new Date().toISOString() },
    { id: "7", name: "Grace", email: "grace@example.com", image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Grace", created_at: new Date().toISOString() },
];

export const MOCK_GROUP: Group = {
    id: "g1",
    name: "The Magnificent Seven",
    created_by: "1",
    created_at: new Date().toISOString(),
};

export const MOCK_EVENTS: Event[] = [
    {
        id: "e1",
        group_id: "g1",
        title: "2023 New Year Party",
        date: "2023-01-01",
        location: "Times Square, NY",
        coordinates: [40.7580, -73.9855],
        created_at: new Date().toISOString(),
    },
    {
        id: "e2",
        group_id: "g1",
        title: "Spring Picnic",
        date: "2023-05-20",
        location: "Prospect Park, Brooklyn",
        coordinates: [40.6602, -73.9690],
        created_at: new Date().toISOString(),
    },
    {
        id: "e3",
        group_id: "g1",
        title: "2024 Reunion",
        date: "2024-01-15",
        location: "Central Park, NY",
        coordinates: [40.785091, -73.968285],
        created_at: new Date().toISOString(),
    },
    {
        id: "e4",
        group_id: "g1",
        title: "Coffee Catch-up",
        date: "2024-06-10",
        location: "Greenwich Village",
        coordinates: [40.7335, -74.0027],
        created_at: new Date().toISOString(),
    },
    {
        id: "e5",
        group_id: "g1",
        title: "Future Planning 2025",
        date: "2025-01-05",
        location: "Chelsea Market",
        coordinates: [40.7423, -74.0062],
        created_at: new Date().toISOString(),
    },
];

export const MOCK_EVENT_PARTICIPANTS = [
    // 2023 NYE - Full Group
    { event_id: "e1", user_id: "1" }, { event_id: "e1", user_id: "2" }, { event_id: "e1", user_id: "3" },
    { event_id: "e1", user_id: "4" }, { event_id: "e1", user_id: "5" }, { event_id: "e1", user_id: "6" },
    { event_id: "e1", user_id: "7" },
    // 2023 Picnic - Small Group (3 people)
    { event_id: "e2", user_id: "1" }, { event_id: "e2", user_id: "2" }, { event_id: "e2", user_id: "3" },
    // 2024 Reunion - Full Group
    { event_id: "e3", user_id: "1" }, { event_id: "e3", user_id: "2" }, { event_id: "e3", user_id: "3" },
    { event_id: "e3", user_id: "4" }, { event_id: "e3", user_id: "5" }, { event_id: "e3", user_id: "6" },
    { event_id: "e3", user_id: "7" },
    // 2024 Coffee - Small Group (2 people: Alice and Bob)
    { event_id: "e4", user_id: "1" }, { event_id: "e4", user_id: "2" },
    // 2025 Planning - Full Group
    { event_id: "e5", user_id: "1" }, { event_id: "e5", user_id: "2" }, { event_id: "e5", user_id: "3" },
    { event_id: "e5", user_id: "4" }, { event_id: "e5", user_id: "5" }, { event_id: "e5", user_id: "6" },
    { event_id: "e5", user_id: "7" },
];
