import { parentIframeCommunication } from "../lib/utils";

export async function submitAnalytics({
  eventName,
  payload,
}: {
  eventName: string;
  payload: any;
}) {
  await parentIframeCommunication({
    windowPostMessageName: "submitAnalytics",
    dataForParent: {
      eventName,
      payload,
    },
  });
}
