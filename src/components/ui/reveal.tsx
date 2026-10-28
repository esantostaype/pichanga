"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useRef, useState, type ReactNode } from "react";

import { EASE } from "@/lib/ease";
import { cn } from "@/lib/utils";

gsap.registerPlugin(useGSAP);

/**
 * Algo que aparece y desaparece sin que la página salte.
 *
 * Crece desde cero cuando `show` se enciende y se encoge hasta cero cuando se
 * apaga, así lo que está debajo se desliza con él en vez de saltar a su nuevo
 * lugar. Al salir conserva lo último que mostró hasta terminar de encogerse:
 * una caja que primero se vacía y después se cierra parece un error, no algo
 * que se guarda.
 *
 * El espaciado que necesite va adentro, no afuera: un margen exterior se
 * quedaría mientras la caja se encoge y desaparecería de golpe al final.
 *
 * Si se monta ya visible, simplemente se muestra: el primer cuadro de un
 * diálogo no es momento para que sus partes lleguen una por una.
 */
export function Reveal({
  show,
  children,
  className,
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(show);
  const [kept, setKept] = useState<ReactNode>(show ? children : null);
  const first = useRef(true);

  // Si vuelve antes de terminar de salir: se queda y crece de nuevo.
  if (show && !mounted) setMounted(true);

  // Lo que se mantiene en pantalla mientras sale: lo último que se mostró.
  if (show && kept !== children) setKept(children);

  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }

      const el = box.current;
      if (!el) return;

      if (show) {
        gsap.fromTo(
          el,
          { height: 0, autoAlpha: 0, overflow: "hidden" },
          {
            height: "auto",
            autoAlpha: 1,
            duration: 0.4,
            ease: EASE,
            // Al terminar de entrar no deja nada fijo: una altura o un recorte
            // cortarían lo que pase por encima después.
            clearProps: "height,overflow,opacity,visibility",
          },
        );
      } else {
        gsap.to(el, {
          height: 0,
          autoAlpha: 0,
          overflow: "hidden",
          duration: 0.28,
          ease: "power2.in",
          onComplete: () => setMounted(false),
        });
      }
    },
    { dependencies: [show] },
  );

  if (!mounted) return null;

  return (
    <div ref={box} className={cn(className)}>
      {show ? children : kept}
    </div>
  );
}
