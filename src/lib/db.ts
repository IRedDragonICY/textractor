import { DB_NAME, DB_VERSION, STORE_NAME } from "@/constants";
import { FileData } from "@/types";
import { Session, RecentProject, SessionManagerState } from "@/types/session";

const SESSIONS_STORE = 'sessions';
const RECENT_PROJECTS_STORE = 'recentProjects';
const STATE_STORE = 'appState';

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION + 1); // Increment version for new stores
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            // Legacy store for old session data
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
            // New stores for session manager
            if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
                db.createObjectStore(SESSIONS_STORE);
            }
            if (!db.objectStoreNames.contains(RECENT_PROJECTS_STORE)) {
                db.createObjectStore(RECENT_PROJECTS_STORE);
            }
            if (!db.objectStoreNames.contains(STATE_STORE)) {
                db.createObjectStore(STATE_STORE);
            }
        };
    });
};

export const saveSession = async (files: FileData[]) => {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        const serializableFiles = files.map(f => ({
            ...f,
            fileObject: undefined
        }));

        store.put(serializableFiles, 'currentSession');
        
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.commit?.();
        });
    } catch (e) {
        console.error("Failed to save session", e);
    }
};

export const loadSession = async (): Promise<FileData[]> => {
    try {
        const db = await initDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get('currentSession');

        return new Promise((resolve) => {
            request.onsuccess = () => {
                const files = request.result || [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const rehydrated = files.map((f: any) => ({
                    ...f,
                    fileObject: new Blob([f.content], { type: 'text/plain' })
                }));
                resolve(rehydrated);
            };
            request.onerror = () => resolve([]);
        });
    } catch (e) {
        console.error("Failed to load session", e);
        return [];
    }
};

// ============================================
// Session Manager Database Functions
// ============================================

// Save all sessions to IndexedDB
export const saveSessions = async (sessions: Session[]): Promise<void> => {
    try {
        const db = await initDB();
        const tx = db.transaction(SESSIONS_STORE, 'readwrite');
        const store = tx.objectStore(SESSIONS_STORE);
        store.put(sessions, 'allSessions');
        
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error("Failed to save sessions:", e);
    }
};

// Load all sessions from IndexedDB
export const loadSessions = async (): Promise<Session[]> => {
    try {
        const db = await initDB();
        const tx = db.transaction(SESSIONS_STORE, 'readonly');
        const store = tx.objectStore(SESSIONS_STORE);
        const request = store.get('allSessions');

        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        });
    } catch (e) {
        console.error("Failed to load sessions:", e);
        return [];
    }
};

// Save recent projects to IndexedDB
export const saveRecentProjects = async (projects: RecentProject[]): Promise<void> => {
    try {
        const db = await initDB();
        const tx = db.transaction(RECENT_PROJECTS_STORE, 'readwrite');
        const store = tx.objectStore(RECENT_PROJECTS_STORE);
        store.put(projects, 'allRecentProjects');
        
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error("Failed to save recent projects:", e);
    }
};

// Load recent projects from IndexedDB
export const loadRecentProjects = async (): Promise<RecentProject[]> => {
    try {
        const db = await initDB();
        const tx = db.transaction(RECENT_PROJECTS_STORE, 'readonly');
        const store = tx.objectStore(RECENT_PROJECTS_STORE);
        const request = store.get('allRecentProjects');

        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => resolve([]);
        });
    } catch (e) {
        console.error("Failed to load recent projects:", e);
        return [];
    }
};

// Save app state (active session ID, etc.) to IndexedDB
export const saveAppState = async (state: { activeSessionId: string | null }): Promise<void> => {
    try {
        const db = await initDB();
        const tx = db.transaction(STATE_STORE, 'readwrite');
        const store = tx.objectStore(STATE_STORE);
        store.put(state, 'appState');
        
        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.error("Failed to save app state:", e);
    }
};

// Load app state from IndexedDB
export const loadAppState = async (): Promise<{ activeSessionId: string | null }> => {
    try {
        const db = await initDB();
        const tx = db.transaction(STATE_STORE, 'readonly');
        const store = tx.objectStore(STATE_STORE);
        const request = store.get('appState');

        return new Promise((resolve) => {
            request.onsuccess = () => resolve(request.result || { activeSessionId: null });
            request.onerror = () => resolve({ activeSessionId: null });
        });
    } catch (e) {
        console.error("Failed to load app state:", e);
        return { activeSessionId: null };
    }
};

// Load complete session manager state from IndexedDB
export const loadSessionManagerState = async (): Promise<SessionManagerState> => {
    try {
        const [sessions, recentProjects, appState] = await Promise.all([
            loadSessions(),
            loadRecentProjects(),
            loadAppState(),
        ]);

        return {
            sessions,
            activeSessionId: appState.activeSessionId,
            recentProjects,
            showHomeView: sessions.length === 0,
        };
    } catch (e) {
        console.error("Failed to load session manager state:", e);
        return {
            sessions: [],
            activeSessionId: null,
            recentProjects: [],
            showHomeView: true,
        };
    }
};

// Save complete session manager state to IndexedDB
export const saveSessionManagerState = async (state: SessionManagerState): Promise<void> => {
    try {
        await Promise.all([
            saveSessions(state.sessions),
            saveRecentProjects(state.recentProjects),
            saveAppState({ activeSessionId: state.activeSessionId }),
        ]);
    } catch (e) {
        console.error("Failed to save session manager state:", e);
    }
};

// Clear old localStorage data (migration helper)
export const clearOldLocalStorage = (): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.removeItem('contextractor_sessions');
        localStorage.removeItem('contextractor_recent_projects');
        localStorage.removeItem('contextractor_session_state');
    } catch (e) {
        console.error("Failed to clear old localStorage:", e);
    }
};
