import React, { useEffect, useRef } from 'react';

// third party
import { motion, useAnimation, useInView } from 'framer-motion';

// =============================|| LANDING - FADE IN ANIMATION ||============================= //

export default function FadeInWhenVisible({ children }: { children: React.ReactElement }) {
  const controls = useAnimation();
  const ref = useRef(null);
  const inView = useInView(ref);

  useEffect(() => {
    if (inView) {
      controls.start('visible');
    }
  }, [controls, inView]);

  return (
    <motion.div
      ref={ref}
      animate={controls}
      initial="hidden"
      transition={{ duration: 0.3 }}
      variants={{
        visible: { opacity: 1, translateY: 0 },
        hidden: { opacity: 0, translateY: 275 }
      }}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  );
}
