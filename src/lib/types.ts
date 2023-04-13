import type { Timestamp } from "firebase/firestore";

export type Profile = {
    _id: string;
    owner: string; //unique!
    name: string;
    public: boolean;
    description: string;
    //productType: string; //később!
    editorData: string;
    //createdAt: Timestamp | undefined; //később
}