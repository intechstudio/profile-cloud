import type { Timestamp } from "firebase/firestore";

export type Profile = {
    _id?: string;
    owner?: string | null; //unique? name of the profile creator
    access?: string[]; //array of uids
    createdAt?: Timestamp | undefined; //később
    public?: boolean;
    name?: string;
    description?: string;
    type?: string;
    version?: {
        major: number;
        minor: number;
        patch: number;
    },
    isGridProfile?: true;
    configs?: any;
}

export type EditorReturnType = {
    ok: boolean;
    data: any;
};