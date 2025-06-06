import { writable } from "svelte/store";

const createDebouncedStore = (
  initialValue: number | null,
  debounceTime: number,
) => {
  let timeoutId: any;
  const { subscribe, set } = writable(initialValue);

  const debouncedSet = (value: any) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => set(value), debounceTime);
  };

  return {
    subscribe,
    set: debouncedSet,
  };
};

export function scrollToTop(node: HTMLElement) {
  let isScrolling = false;

  const scroll = () => {
    if (
      !isScrolling &&
      node.scrollTop !== node.scrollHeight - node.offsetHeight
    ) {
      isScrolling = true;
      requestAnimationFrame(() => {
        node.scroll({
          top: 0,
          behavior: "smooth",
        });

        isScrolling = false;
      });
    }
  };

  const store = createDebouncedStore(null, 100);

  const unsubscribe = store.subscribe(scroll);

  return {
    update: (value: any) => store.set(value),
    destroy: () => unsubscribe(),
  };
}
