<script lang="ts">
  import { tooltip } from "../lib/actions/tooltip";
  import { onDestroy } from "svelte";
  import { userAccountService } from "../lib/stores";
  import { doc, getDoc, writeBatch } from "firebase/firestore";
  import { userCollection, usernameCollection } from "../lib/collections";
  import { get } from "svelte/store";
  import { firestore } from "../lib/firebase";
  import { submitAnalytics } from "./analytics";
  import {
    Block,
    BlockBody,
    BlockColumn,
    BlockRow,
    BlockTitle,
  } from "@intechstudio/grid-uikit";
  import {
    MoltenPushButton,
    MoltenInput,
    SvgIcon,
  } from "@intechstudio/grid-uikit";

  import {
    getUserNameByUid,
    usernameSelectionFeedback,
    loginToProfileCloud,
    logoutFromProfileCloud,
    type UserNameInput,
  } from "./user_account";
  import VersionStamp from "./VersionStamp.svelte";

  export let usernameInput: UserNameInput;

  let nameFieldValue = "";

  $: {
    checkIfUsernameAvailable(nameFieldValue);
    usernameInput.value = nameFieldValue;
  }

  const userAccountSubscription = userAccountService.subscribe(
    async (userAccount) => {
      if (userAccount.account?.uid) {
        const username = await getUserNameByUid(userAccount.account.uid);
        if (username) {
          usernameInput.exists = true;
          usernameInput.value = "@" + username;
        } else {
          usernameInput.exists = false;
        }

        submitAnalytics({
          eventName: "Cloud Action",
          payload: {
            click: "Login user",
          },
        });
      } else {
        submitAnalytics({
          eventName: "Cloud Action",
          payload: {
            click: "Logout user",
          },
        });
      }
    },
  );

  onDestroy(() => {
    userAccountSubscription();
  });

  async function setUserName(username?: string) {
    if (!usernameInput.valid) {
      return;
    }

    const uid = get(userAccountService).account?.uid;
    // Create refs for both documents
    const userDoc = doc(userCollection, uid);
    const usernameDoc = doc(usernameCollection, username);

    // Commit both docs together as a batch write.
    const batch = writeBatch(firestore);

    batch.set(userDoc, { username });
    batch.set(usernameDoc, { uid });

    await batch.commit().then(() => {
      usernameInput.exists = true;
      usernameInput.value = "@" + username;
    });
  }

  async function checkIfUsernameAvailable(username: string) {
    if (username.length >= 3 && username.length <= 15) {
      const usernameRef = doc(usernameCollection, username);
      const res = await getDoc(usernameRef).then((d) => d.data());
      usernameInput.valid = res == undefined ? true : false;
    } else {
      usernameInput.valid = false;
    }
  }
</script>

{#if !$userAccountService.account}
  <Block border="green">
    <BlockRow>
      <BlockBody>Login to save and browse your profiles</BlockBody>

      <MoltenPushButton
        text={"Login"}
        style={"accept"}
        click={() => {
          loginToProfileCloud();
          submitAnalytics({
            eventName: "Cloud Action",
            payload: {
              click: "Login attempt",
            },
          });
        }}
      />
    </BlockRow>
  </Block>
{:else if usernameInput.exists == false}
  <BlockColumn border="orange">
    <BlockBody>
      Before using the cloud, enter a username which will be displayed with your
      public profiles.
    </BlockBody>
    <BlockRow>
      <MoltenInput bind:target={nameFieldValue} />
      <button
        on:click={() => {
          usernameInput.active = false;
          setUserName(usernameInput.value ?? "");
          submitAnalytics({
            eventName: "Cloud Action",
            payload: {
              click: "Change user name",
            },
          });
        }}
        use:tooltip={{
          instant: true,
          text: "Save",
        }}
      >
        <SvgIcon iconPath={"save_as_02"} fill="var(--foreground-muted)" />
      </button>
    </BlockRow>
    <div class={usernameInput.valid ? "text-emerald-500" : "text-amber-500"}>
      {usernameSelectionFeedback(usernameInput)}
    </div>
  </BlockColumn>
{:else}<Block>
    <BlockRow
      ><BlockBody>
        Logged in as {usernameInput.value ?? ""}
      </BlockBody>
      <button
        on:click={() => {
          logoutFromProfileCloud();
          submitAnalytics({
            eventName: "Cloud Action",
            payload: {
              click: "Logout attempt",
            },
          });
        }}
        use:tooltip={{
          instant: true,
          text: "Logout",
        }}
      >
        <SvgIcon iconPath={"log_out"} fill="var(--foreground-muted)" />
      </button>
    </BlockRow></Block
  >
{/if}
<VersionStamp />
