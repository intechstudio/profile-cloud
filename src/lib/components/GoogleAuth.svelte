<script lang="ts">
    import { PUBLIC_GOOGLE_CLIENT_ID } from "$env/static/public";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();

    function callbackFunction(response: any) {
        if (response.credential) {
            dispatch("google-signin", response.credential);
        }
    }

    function initGapi() {
        google.accounts.id.initialize({
            client_id: PUBLIC_GOOGLE_CLIENT_ID,
            callback: callbackFunction
        });
        google.accounts.id.renderButton(
            document.getElementById("buttonDiv"),
            { theme: "outline", size: "large", width: "240px", text: "continue_with" } // customization attributes
        );
    }
</script>

<svelte:head>
    <script src="https://accounts.google.com/gsi/client" async defer on:load={initGapi}></script>
</svelte:head>

<div id="buttonDiv" />
