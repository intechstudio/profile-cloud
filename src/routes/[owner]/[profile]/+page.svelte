<script lang="ts">
	import { db } from '$lib/firebase';
	import { doc, getDoc } from 'firebase/firestore';

	export let data;

	console.log('fe', data);

	async function loadDocument() {
		const docRef = doc(db, 'profiles', data.params.profile);
		const docSnap = await getDoc(docRef);
		downloadObjectAsJson(docSnap.data(), data.params.profile);
	}

	function downloadObjectAsJson(exportObj: any, exportName: string) {
		var dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObj));
		var downloadAnchorNode = document.createElement('a');
		downloadAnchorNode.setAttribute('href', dataStr);
		downloadAnchorNode.setAttribute('download', exportName + '.json');
		document.body.appendChild(downloadAnchorNode); // required for firefox
		downloadAnchorNode.click();
		downloadAnchorNode.remove();
	}
</script>

<svelte:head>
	<title>Profile: {data.params.profile}</title>
</svelte:head>

<h1>{data.params.owner}</h1>
{data.params.profile}

<button
	on:click={() => {
		loadDocument();
	}}>download</button
>
