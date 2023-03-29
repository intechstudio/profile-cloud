import type { Timestamp } from "firebase/firestore";

export interface IProfile {
    owner: string; //unique!
    name: string;
    //public: boolean; // később
    description: string;
    //productType: string; //később!
    editorData: string;
    //createdAt: Timestamp | undefined; //később
}