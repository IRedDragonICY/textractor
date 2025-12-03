// Session & Tab Types for Contextractor
// Professional-grade session management inspired by VS Code & Adobe Acrobat

export interface Session {
    id: string;
    type: 'editor' | 'settings';
    name: string;
    files: SessionFile[];
    outputStyle: OutputStyleType;
    viewMode: ViewModeType;
    createdAt: number;
    updatedAt: number;
    isActive: boolean;
    isPinned: boolean;
    color?: string; // Optional accent color for the tab
}

export interface SessionFile {
    id: string;
    name: string;
    content: string;
    isText: boolean;
    linesOfCode: number;
    characterCount: number;
    tokenCount: number;
    path: string;
}

export interface RecentProject {
    id: string;
    name: string;
    fileCount: number;
    totalTokens: number;
    totalLines: number;
    lastOpened: number;
    createdAt: number;
    thumbnail?: string; // Base64 preview image or icon type
    primaryLanguage?: string; // Most common file extension
    sessionSnapshot: Session;
    // Track which open sessions came from this recent project
    openSessionIds?: string[];
}

export interface SessionManagerState {
    sessions: Session[];
    activeSessionId: string | null;
    recentProjects: RecentProject[];
    showHomeView: boolean;
}

export type OutputStyleType = 'standard' | 'hash' | 'minimal' | 'xml' | 'markdown';
export type ViewModeType = 'list' | 'tree';

// Tab actions
export type TabAction = 
    | { type: 'CREATE_SESSION'; payload?: { name?: string } }
    | { type: 'CLOSE_SESSION'; payload: { id: string } }
    | { type: 'CLOSE_OTHER_SESSIONS'; payload: { keepId: string } }
    | { type: 'CLOSE_ALL_SESSIONS' }
    | { type: 'SWITCH_SESSION'; payload: { id: string } }
    | { type: 'RENAME_SESSION'; payload: { id: string; name: string } }
    | { type: 'PIN_SESSION'; payload: { id: string } }
    | { type: 'UNPIN_SESSION'; payload: { id: string } }
    | { type: 'DUPLICATE_SESSION'; payload: { id: string } }
    | { type: 'UPDATE_SESSION_FILES'; payload: { id: string; files: SessionFile[] } }
    | { type: 'UPDATE_SESSION_SETTINGS'; payload: { id: string; outputStyle?: OutputStyleType; viewMode?: ViewModeType } }
    | { type: 'SAVE_TO_RECENT'; payload: { session: Session } }
    | { type: 'OPEN_RECENT'; payload: { projectId: string } }
    | { type: 'REMOVE_RECENT'; payload: { projectId: string } }
    | { type: 'CLEAR_RECENT_PROJECTS' }
    | { type: 'TOGGLE_HOME_VIEW'; payload: { show: boolean } }
    | { type: 'REORDER_SESSIONS'; payload: { fromIndex: number; toIndex: number } };

// Storage keys
export const SESSION_STORAGE_KEY = 'contextractor_sessions';
export const RECENT_PROJECTS_KEY = 'contextractor_recent_projects';
export const SESSION_STATE_KEY = 'contextractor_session_state';

// Colors for tabs (VS Code inspired)
export const TAB_COLORS = [
    '#A8C7FA', // Blue
    '#7FCFB6', // Teal
    '#F2B8B5', // Red
    '#FFD699', // Orange
    '#C8ACF6', // Purple
    '#89D185', // Green
    '#FFB4A9', // Coral
    '#AECBFA', // Light Blue
] as const;
