import { getGraphPreferences } from "./graph-helpers";
import { writable, get } from "svelte/store";
import type pb from "anki/backend_proto";

export interface CustomStore<T> {
    subscribe: (getter: (value: T) => void) => () => void;
    set: (value: T) => void;
}

export type PreferenceStore = {
    [K in keyof pb.BackendProto.GraphsPreferencesOut]: CustomStore<
        pb.BackendProto.GraphsPreferencesOut[K]
    >;
};

function createPreference<T>(
    initialValue: T,
    savePreferences: () => void
): CustomStore<T> {
    const { subscribe, set } = writable(initialValue);

    return {
        subscribe,
        set: (v: T): void => {
            set(v);
            savePreferences();
        },
    };
}

function preparePreferences(
    graphsPreferences: pb.BackendProto.GraphsPreferencesOut,
    save: (prefs: pb.BackendProto.GraphsPreferencesOut) => void
): PreferenceStore {
    const preferences: Partial<PreferenceStore> = {};

    function constructPreferences(): pb.BackendProto.GraphsPreferencesOut {
        const payload: Partial<pb.BackendProto.GraphsPreferencesOut> = {};
        for (const [key, pref] of Object.entries(preferences as PreferenceStore)) {
            payload[key] = get(pref as any);
        }
        return payload as pb.BackendProto.GraphsPreferencesOut;
    }

    function savePreferences(): void {
        const preferences = constructPreferences();
        save(preferences);
    }

    for (const [key, value] of Object.entries(graphsPreferences)) {
        preferences[key] = createPreference(value, savePreferences);
    }

    return preferences as PreferenceStore;
}

export async function getPreferences() {
    const initialPreferences = await getGraphPreferences();

    return preparePreferences(initialPreferences, (prefs) => {
        console.log("preferences to save", prefs);
    });
}