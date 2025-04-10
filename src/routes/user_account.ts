import { doc, getDoc } from "firebase/firestore";
import { userCollection } from "../lib/collections";
import { parentIframeCommunication } from "../lib/utils";

export async function getUserNameByUid(uid: string) {
  const userRef = doc(userCollection, uid);
  const user: string = await getDoc(userRef).then(
    (res) => res.data()?.username,
  );
  return user;
}

export function usernameSelectionFeedback(obj: any) {
  let str = "";
  if (obj.element?.value != undefined && obj.element?.value.length > 0) {
    if (obj.element?.value.length > 0) {
      str += "@";
    }
    str += obj.element?.value;
    if (obj.valid == true && obj.element?.value.length > 0) {
      str += " is available";
    } else if (obj.valid == false) {
      str += " is not available";
    }
  }
  return str;
}

export async function loginToProfileCloud() {
  await parentIframeCommunication({
    windowPostMessageName: "loginToProfileCloud",
    dataForParent: {},
  });
}

export async function logoutFromProfileCloud() {
  await parentIframeCommunication({
    windowPostMessageName: "logoutFromProfileCloud",
    dataForParent: {},
  });
}

export interface UserNameInput {
  element: HTMLInputElement | null;
  exists: boolean;
  valid: boolean;
  active: boolean;
}
