<script lang="ts">
	let profileToUpload: IProfile;
	let isFirestoreUploading = false;
	async function uploadProfile() {
		profileToUpload = profileDoc;
		profileToUpload.slug = profileDoc.name.toLowerCase().replace(/ /g, '-');
		profileToUpload.editorData = profileDoc.editorData;
		// good practice to create documents with timestamps
		console.log('AUTH USED', auth);
		profileToUpload.createdAt = Timestamp.now();
		isFirestoreUploading = true;
		const res = await addDoc(collection(db, 'profiles'), profileToUpload).catch((err) =>
			console.log(err)
		);
		isFirestoreUploading = false;
	}
</script>

<h1>Upload profile</h1>

<div>
	<label for="profile-owner">Owner</label>
	<input type="text" id="profile-owner" bind:value={profileDoc.owner} placeholder="owner name" />
</div>

<div>
	<label for="profile-public">Public</label>
	<input type="checkbox" id="profile-public" bind:checked={profileDoc.public} />
</div>

<div>
	<label for="profile-name">Name</label>
	<input
		type="text"
		id="profile-name"
		bind:value={profileDoc.name}
		placeholder="Name of the profile"
	/>
</div>
<div>
	<label for="profile-description">Description</label>
	<textarea
		name=""
		id="profile-description"
		bind:value={profileDoc.description}
		cols="30"
		rows="5"
	/>
</div>
<div>
	<label for="profile-product-type">Product Type</label>
	<select bind:value={profileDoc.productType} name="" id="profile-product-type">
		{#each ['BU16', 'PBF4', 'PO16', 'EF44', 'EN16'] as type}
			<option value={type}>{type}</option>
		{/each}
	</select>
</div>

<div>
	<label for="profile-page-json">Page JSON</label>
	<textarea name="" id="profile-page-json" bind:value={profileDoc.editorData} cols="30" rows="5" />
</div>

<div>
	<button
		on:click={() => {
			uploadProfile();
		}}>Upload Profile</button
	>
	{#if isFirestoreUploading}
		<div>Uploading...</div>
	{/if}
	{#if profileToUpload}
		<pre>{JSON.stringify(profileToUpload)}</pre>
	{/if}
</div>
