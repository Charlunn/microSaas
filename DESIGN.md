# Design System Strategy: The Kinetic Engine

## 1. Overview & Creative North Star
**Creative North Star: "The Kinetic Engine"**

This design system is a rejection of the "soft and friendly" SaaS aesthetic. We are building a "Micro-SaaS Factory," and the UI must reflect the raw, high-velocity output of an industrial assembly line. The "Kinetic Engine" philosophy prioritizes speed, modularity, and technical precision. 

By utilizing hard 0px corners, high-contrast neon accents, and a "monospaced-industrial" typographic hierarchy, we create a digital environment that feels like a high-performance terminal. We break the standard template through **intentional asymmetry**—aligning heavy headlines to the far left while technical metadata (labels) sits in floating, monospaced clusters to the right. We don’t just "display" data; we "monitor" it.

---

## 2. Colors: High-Voltage Contrast
The color palette is built on an absolute-zero foundation (`#0e0e0e`) to allow our electric accents to vibrate with intensity.

*   **The "No-Line" Rule:** Explicitly forbid 1px solid borders for sectioning. Boundaries are defined by shifting from `surface` (`#0e0e0e`) to `surface-container-low` (`#131313`). To separate large vertical modules, use a background shift, never a line.
*   **Surface Hierarchy & Nesting:** Treat the UI as a chassis. 
    *   **Base:** `surface` (#0e0e0e)
    *   **Sub-panels:** `surface-container` (#1a1919)
    *   **Active Modules:** `surface-container-highest` (#262626)
*   **The "Glass & Gradient" Rule:** Use `primary` (`#a1ffc2`) and `secondary` (`#00cffc`) as "glow" sources. Floating cards should use a `surface-variant` at 60% opacity with a `20px` backdrop blur to simulate high-tech polycarbonate.
*   **Signature Textures:** Apply a subtle linear gradient from `primary` (#a1ffc2) to `primary_container` (#00fc9a) at a 45-degree angle for primary CTAs to create a "liquid light" effect.

---

## 3. Typography: Technical Authority
We pair the brutalist efficiency of **Space Grotesk** with the clean, functional readability of **Manrope**.

*   **Display & Headlines (Space Grotesk):** Use `display-lg` (3.5rem) for hero moments. The wide tracking and geometric construction signal innovation. Always set headlines to `bold` or `extra-bold`.
*   **Technical Accents (Labels):** All `label-md` and `label-sm` elements should utilize a monospaced feel (stylized via Space Grotesk) to mimic terminal output. Use these for status chips, timestamps, and "Build ID" markers.
*   **Body (Manrope):** Manrope provides the "human" element. Use `body-md` for documentation and descriptions to ensure long-form readability against the high-contrast background.

---

## 4. Elevation & Depth: Tonal Layering
In an industrial system, "depth" isn't about soft shadows; it's about **component stacking.**

*   **The Layering Principle:** To lift a card, move it from `surface-container-low` to `surface-container-high`. The contrast in dark tones creates a "stealth" depth that feels integrated into the hardware.
*   **Ambient Shadows:** For floating modals, use a custom shadow: `0px 20px 40px rgba(0, 252, 154, 0.08)`. Using a tint of `primary` instead of black makes the element feel like it’s emitting light onto the surface below.
*   **The "Ghost Border" Fallback:** When high-density data requires separation, use `outline-variant` (`#484847`) at **15% opacity**. It should be felt, not seen.
*   **0px Mandate:** Every container, button, and input field must have a **0px border-radius**. This "Hard-Edge" aesthetic is non-negotiable; it communicates the modular, "fast-build" nature of the factory.

---

## 5. Components: Modular Units

### Buttons (The Actuators)
*   **Primary:** Background `primary` (#a1ffc2), text `on_primary` (#00643a). Bold caps. 0px radius.
*   **Secondary:** Ghost style. `outline` color at 20% opacity background, with a `primary` glow on hover.
*   **Tertiary:** Monospaced text with a `secondary` (#00cffc) underline that expands on hover.

### Input Fields (The Data Ports)
*   No rounded corners. Use `surface-container-highest` as the base. 
*   **Focus State:** A 2px bottom-border of `secondary` (#00cffc) and a subtle outer glow. 
*   **Labels:** Use `label-sm` (Space Grotesk) positioned strictly above the field, never floating inside.

### Cards & Lists (The Assembly Line)
*   **Forbidden:** Divider lines. 
*   **Requirement:** Use 24px or 32px of vertical "negative space" to separate list items. 
*   **Active State:** Change the background to `surface-container-highest` and add a `primary` vertical 4px bar on the far left edge of the component.

### Chips (Status Indicators)
*   Small, rectangular blocks. 
*   **Success:** `primary_container` background with `on_primary_fixed` text.
*   **Warning/Error:** `error_container` (#b92902) background. Use these sparingly to maintain the "High-Energy" blue/green vibe.

---

## 6. Do's and Don'ts

### Do:
*   **DO** use "Technical Metadata": Surround main headings with small strings of monospaced data (e.g., "BUILD_VER // 2.0.4") to lean into the industrial theme.
*   **DO** use asymmetric layouts. If a section has an image, let it bleed off the edge of the screen to suggest the "factory" is larger than the viewport.
*   **DO** use high-contrast transitions. A jump from `#0e0e0e` to `#2c2c2c` should be used to define "work zones."

### Don't:
*   **DON'T** use border-radius. Ever. Even 2px breaks the industrial-tech precision of this system.
*   **DON'T** use standard grey shadows. If an element floats, it should cast a glow using the `primary` or `secondary` token colors.
*   **DON'T** use center-alignment for long-form content. Keep the "Engine" feel by sticking to a strict left-aligned "Technical Column" grid.
*   **DON'T** use 1px dividers. If you feel the need for a line, use a 4px wide block of `surface-variant` color instead. Space is your separator.