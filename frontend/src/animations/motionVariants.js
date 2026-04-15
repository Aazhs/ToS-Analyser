// animations/motionVariants.js
// Centralized Framer Motion animation variants for consistent UX

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export const fadeInDown = {
  hidden: { opacity: 0, y: -16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export const slideInLeft = {
  hidden: { x: -320, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] },
  },
  exit: {
    x: -320,
    opacity: 0,
    transition: { duration: 0.3, ease: [0.32, 0.72, 0, 1] },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    transition: { duration: 0.2, ease: "easeIn" },
  },
};

export const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

export const cardHover = {
  rest: { scale: 1, transition: { duration: 0.2, ease: "easeOut" } },
  hover: {
    scale: 1.015,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

export const buttonTap = {
  tap: { scale: 0.97 },
};

export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

export const progressBar = (width) => ({
  hidden: { width: 0 },
  visible: {
    width: `${width}%`,
    transition: { duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 },
  },
});
