<script lang="ts">
  import { tooltip } from "../lib/actions/tooltip";
  import { onDestroy } from "svelte";
  import { userAccountService } from "../lib/stores";
  import { doc, getDoc, writeBatch } from "firebase/firestore";
  import { userCollection, usernameCollection } from "../lib/collections";
  import SvgIcon from "../lib/icons/SvgIcon.svelte";
  import { get } from "svelte/store";
  import { firestore } from "../lib/firebase";
  import { submitAnalytics } from "./analytics";
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
          usernameInput.element!.value = "@" + username;
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
      usernameInput.element!.value = "@" + username;
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
          Profile Cloud - {usernameInput.element?.value}
        </div>
      {/if}
      <div class="flex items-center">
        <input
          id="display-name"
          bind:this={usernameInput.element}
          on:input={(event) => {
            checkIfUsernameAvailable(event.target?.value);
          }}
          on:keydown={(event) => {
            if (event.key == "Enter") {
              usernameInput.active = false;
              setUserName(usernameInput.element?.value);
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
          value={usernameInput.element?.value || ""}
        />
        {#if usernameInput.exists == false}
          <button
            on:click={() => {
              usernameInput.active = false;
              setUserName(usernameInput.element?.value);
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
            <SvgIcon iconPath={"save_as_02"} class="w-5" />
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
        <SvgIcon iconPath={"log_out"} class="w-5" />
        <div
          class="group-hover:block font-medium hidden absolute mt-7 top-0 right-0 text-white text-opacity-80 border border-white border-opacity-10 bg-neutral-900 rounded-lg px-2 py-0.5"
        >
          Logout
        </div>
      </button>
    {/if}
  </div>
{:else}
  <div class="pt-4">
    <div
      class="rounded-md border border-amber-500 p-2 bg-secondary/90 flex items-center justify-between"
    >
      <div class="text-white">Login to save and browse your profiles</div>
      <button
        on:click={() => {
          loginToProfileCloud();
          submitAnalytics({
            eventName: "Cloud Action",
            payload: {
              click: "Login attempt",
            },
          });
        }}
        class="rounded px-4 py-1 border dark:border-emerald-500 dark:hover:bg-emerald-700 font-medium"
      >
        Login
      </button>
    </div>
  </div>
{/if}
<div class="flex w-full justify-center text-xs">
  <VersionStamp />
</div>
