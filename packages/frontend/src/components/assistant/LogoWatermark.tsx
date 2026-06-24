import logo from "../../logo.svg";

/**
 * Faded logo used as a decorative watermark behind the chat and the
 * greeting. Positioned absolutely inside a `relative` flex container
 * so it never affects layout.
 */
export function LogoWatermark() {
  return (
    <img
      src={logo}
      alt=""
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-64 lg:size-80 opacity-[0.06] grayscale pointer-events-none select-none"
    />
  );
}
