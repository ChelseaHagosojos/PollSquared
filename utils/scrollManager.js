// utils/scrollManager.js
let scrollToTopFunction = null;

export const registerScrollToTop = (func) => {
  scrollToTopFunction = func;
};

export const scrollToTop = () => {
  if (scrollToTopFunction) {
    scrollToTopFunction();
  }
};