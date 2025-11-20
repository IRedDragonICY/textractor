import { DB_NAME, DB_VERSION, STORE_NAME } from "@/constants";
import { FileData } from "@/types";

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
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
