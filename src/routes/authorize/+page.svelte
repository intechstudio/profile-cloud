<script lang="ts">
  import GoogleAuth from "../../lib/components/GoogleAuth.svelte";
  import configuration from "../../../Configuration.json";

  type AuthStatus = {
    status: number;
    message: string;
  };

  const Auth: { [key: string]: AuthStatus } = {
    NOT_AUTHORIZED: {
      status: 0,
      message: "not authorized",
    },
    AUTHORIZED: {
      status: 1,
      message: "authorized",
    },
    AUTH_ERROR: {
      status: 2,
      message: "error",
    },
  };

  let authStatus = Auth.NOT_AUTHORIZED;

  let credential: string = "";

  let showCloseBrowserNotification = false;

  function buildProtocolUrl(credential: string) {
    return (
      `${configuration.DEEPLINK_PROTOCOL_NAME}://?credential=` + credential
    );
  }

  function handleCredentialResponse(event: CustomEvent) {
    if (
      event.detail == undefined ||
      event.detail == null ||
      event.detail == ""
    ) {
      authStatus = Auth.AUTH_ERROR;
      return;
    }

    credential = event.detail;

    const link = document.createElement("a");
    link.href = buildProtocolUrl(credential);
    document.body.appendChild(link);
    authStatus = Auth.AUTHORIZED;
  }
</script>

<div class="page">
  <div class="auth-card">
    {#if authStatus.status == 0}
      <h2 class="title">authorize your social account</h2>
      <h3 class="subtitle">
        When you login through social accounts, please click on the appropiate
        button below to proceed with authorization.
      </h3>
      <div class="action-row">
        <GoogleAuth on:google-signin={handleCredentialResponse} />
      </div>
    {:else if authStatus.status == 1}
      <h2 class="title">authorization successful</h2>
      <h3 class="subtitle">
        Click the button below, and open the application.
      </h3>
      <div class="action-row">
        <a class="launch-button" href={buildProtocolUrl(credential)}
          >launch desktop app</a
        >
      </div>
      <div class="success-row">
        <div class="check-icon">
          <svg
            style="fill: currentColor; color: var(--foreground);"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            ><path
              d="M12,1A11,11,0,1,0,23,12,11.013,11.013,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9.011,9.011,0,0,1,12,21ZM17.737,8.824a1,1,0,0,1-.061,1.413l-6,5.5a1,1,0,0,1-1.383-.03l-3-3a1,1,0,0,1,1.415-1.414l2.323,2.323,5.294-4.853A1,1,0,0,1,17.737,8.824Z"
            /></svg
          >
        </div>
        <div>Grid Editor for Desktop</div>
      </div>
    {/if}
  </div>
</div>

<style>
  #google-signin-button {
    display: inline-block;
  }

  .page {
    width: 100%;
    height: 100%;
  }

  .auth-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 36rem;
    margin: 0 auto;
    padding: 1rem;
    background-color: var(--background);
    border-radius: 0.375rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .title {
    font-size: 1.5rem;
    font-weight: bold;
    padding-bottom: 1rem;
  }

  .subtitle {
    padding-bottom: 1rem;
    color: var(--foreground-muted);
  }

  .action-row {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 44px;
    padding: 0;
    margin: 0;
  }

  .launch-button {
    background-color: #059669;
    padding: 0.5rem 1.5rem;
    border-radius: 0.25rem;
    color: white;
    font-weight: 500;
    text-decoration: none;
  }

  .launch-button:hover {
    background-color: #047857;
  }

  .success-row {
    padding-top: 0.5rem;
    display: flex;
    align-items: center;
    font-size: 0.875rem;
  }

  .check-icon {
    width: 1.5rem;
    height: 1.5rem;
    padding: 0.25rem;
  }
</style>
