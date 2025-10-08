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
  import { MoltenPushButton, SvgIcon } from "@intechstudio/grid-uikit";

  import {
    getUserNameByUid,
    usernameSelectionFeedback,
    loginToProfileCloud,
    logoutFromProfileCloud,
    type UserNameInput,
  } from "./user_account";
  import VersionStamp from "./VersionStamp.svelte";

  export let usernameInput: UserNameInput;

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

{#if $userAccountService.account}
  <div
    class="{!usernameInput.exists
      ? 'pb-2'
      : ''} flex items-center justify-between"
  >
    <div class="group w-full flex flex-col text-left py-4">
      {#if usernameInput.exists == false}
        <div class="pb-2">
          Before using the cloud, enter a username which will be displayed with
          your public profiles.
        </div>
      {:else}
        <div>
          Profile Cloud - {usernameInput.value ?? ""}
        </div>
      {/if}
      <div class="flex items-center">
        <input
          id="display-name"
          on:input={(event) => {
            checkIfUsernameAvailable(event.target?.value);
            usernameInput.value = event.target?.value;
          }}
          on:keydown={(event) => {
            if (event.key == "Enter") {
              usernameInput.active = false;
              setUserName(usernameInput.value ?? "");
              submitAnalytics({
                eventName: "Cloud Action",
                payload: {
                  click: "Set user name",
                },
              });
            }
          }}
          readonly={usernameInput.exists}
          placeholder="Username"
          class="{!usernameInput.exists
            ? 'border-amber-500 focus:border-emerald-500 animate-pulse dark:bg-secondary focus:animate-none'
            : 'border-transparent bg-transparent text-white text-opacity-80 hidden'}  w-full border focus:outline-none"
          value={usernameInput.value ?? ""}
        />
        {#if usernameInput.exists == false}
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
            class="mx-2 relative group"
            use:tooltip={{
              nowrap: true,
              placement: "bottom",
              duration: 75,
              instant: true,
              class: "px-2 py-1",
              text: "Save",
            }}
          >
            <SvgIcon iconPath={"save_as_02"} fill="var(--foreground-muted)" />
          </button>
        {/if}
      </div>
      {#if usernameInput.exists == false}
        <div
          class={usernameInput.valid ? "text-emerald-500" : "text-amber-500"}
        >
          {usernameSelectionFeedback(usernameInput)}
        </div>
      {/if}
    </div>
    {#if usernameInput.exists == true}
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
        class="ml-1 relative group rounded px-1 text-xs border dark:border-white dark:border-opacity-10 dark:hover:bg-neutral-700 font-medium"
        use:tooltip={{
          nowrap: true,
          placement: "bottom",
          duration: 75,
          instant: true,
          class: "px-2 py-1",
          text: "Logout",
        }}
      >
        <SvgIcon iconPath={"log_out"} fill="var(--foreground-muted)" />
        <div
          class="group-hover:block font-medium hidden absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
        >
          Logout
        </div>
      </button>
    {/if}
  </div>
{:else}
  <Block border="red">
    <BlockRow>
      <div class="flex flex-grow">Login to save and browse your profiles</div>

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
        class="rounded px-4 py-1 border dark:border-emerald-500 dark:hover:bg-emerald-700 font-medium"
      />
    </BlockRow>
  </Block>
{/if}
<VersionStamp />
