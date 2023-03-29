import type { Timestamp } from "firebase/firestore";

export interface IProfile {
    owner: string;
    name: string;
    public: boolean;
    slug: string;
    description: string;
    isGridProfile: boolean;
    productType: string;
    editorData: string;
    createdAt: Timestamp | undefined;
}