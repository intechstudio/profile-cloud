import type { Timestamp } from "firebase/firestore";

export type Profile = {
    _id: string;
    owner: string; //unique? name of the profile creator
    access: string[]; //array of uids
    name: string;
    public: boolean;
    description: string;
    //productType: string; //később!
    editorData: string;
    //createdAt: Timestamp | undefined; //később
}

export type EditorReturnType = {
    ok: boolean;
    data: any;
};