export function useDisclosure(initialState = false) {
  let isOpen = initialState;

  return {
    isOpen,
    open: () => {
      isOpen = true;
    },
    close: () => {
      isOpen = false;
    },
    toggle: () => {
      isOpen = !isOpen;
    },
  };
}
