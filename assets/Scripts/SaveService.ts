import { sys } from 'cc';

/**
 * Everything we persist, in one typed object.
 * Add new fields here + a default below - nothing else changes.
 */
export interface SaveData {
    highScore: number;
    totalLinesCleared: number;
    gamesPlayed: number;
    settings: {
        musicVolume: number;   // 0..1
        sfxVolume: number;     // 0..1
    };
}

const DEFAULTS: SaveData = {
    highScore: 0,
    totalLinesCleared: 0,
    gamesPlayed: 0,
    settings: {
        musicVolume: 0.8,
        sfxVolume: 1.0,
    },
};

const STORAGE_KEY = 'tetris_save_v1';

/**
 * Not a Component on purpose: save data has no scene lifecycle.
 * Usage anywhere:  SaveService.instance.data.highScore
 * After mutating:  SaveService.instance.save()
 */
export class SaveService {

    private static _instance: SaveService | null = null;

    static get instance(): SaveService {
        if (!this._instance) this._instance = new SaveService();
        return this._instance;
    }

    readonly data: SaveData;

    private constructor() {
        this.data = this.load();
    }

    save(): void {
        sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    /** Wipe everything back to defaults (debug / "reset progress" button). */
    reset(): void {
        Object.assign(this.data, structuredClone(DEFAULTS));
        this.save();
    }

    private load(): SaveData {
        const raw = sys.localStorage.getItem(STORAGE_KEY);
        if (!raw) return structuredClone(DEFAULTS);
        try {
            // Merge over defaults so saves from older versions
            // (missing newly added fields) stay valid.
            const parsed = JSON.parse(raw);
            return {
                ...structuredClone(DEFAULTS),
                ...parsed,
                settings: {...DEFAULTS.settings, ...(parsed.settings ?? {})},
            };
        } catch {
            console.warn('SaveService: corrupted save, resetting to defaults');
            return structuredClone(DEFAULTS);
        }
    }
}