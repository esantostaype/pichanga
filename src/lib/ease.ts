"use client";

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

/**
 * The same curve the CSS uses, expressed for GSAP.
 *
 * GSAP cannot parse a `cubic-bezier()` string on its own, so the control
 * points of `cubic-bezier(0.32, 0.72, 0, 1)` are handed to CustomEase as the
 * path `M0,0 C<x1>,<y1> <x2>,<y2> 1,1`. Keep this in step with
 * `--ease-pichanga` in globals.css.
 */
export const EASE = CustomEase.create("pichanga", "M0,0 C0.32,0.72 0,1 1,1");
