import { LazyMotion, m, domAnimation } from "framer-motion";
export function Test() {
  return (
    <LazyMotion features={domAnimation}>
      <m.div>test</m.div>
    </LazyMotion>
  );
}
