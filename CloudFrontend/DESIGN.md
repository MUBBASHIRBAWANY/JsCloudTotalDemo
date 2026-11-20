---
name: Pearl Dynamic
colors:
  surface: '#f9f9fc'
  surface-dim: '#dadadc'
  surface-bright: '#f9f9fc'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f3f6'
  surface-container: '#eeeef0'
  surface-container-high: '#e8e8ea'
  surface-container-highest: '#e2e2e5'
  on-surface: '#1a1c1e'
  on-surface-variant: '#434653'
  inverse-surface: '#2f3133'
  inverse-on-surface: '#f0f0f3'
  outline: '#737784'
  outline-variant: '#c3c6d5'
  surface-tint: '#2558c1'
  primary: '#003180'
  on-primary: '#ffffff'
  primary-container: '#0046af'
  on-primary-container: '#a6bdff'
  inverse-primary: '#b2c5ff'
  secondary: '#a04100'
  on-secondary: '#ffffff'
  secondary-container: '#fe6b00'
  on-secondary-container: '#572000'
  tertiary: '#003f39'
  on-tertiary: '#ffffff'
  tertiary-container: '#005850'
  on-tertiary-container: '#63d1c3'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001848'
  on-primary-fixed-variant: '#0040a1'
  secondary-fixed: '#ffdbcc'
  secondary-fixed-dim: '#ffb693'
  on-secondary-fixed: '#351000'
  on-secondary-fixed-variant: '#7a3000'
  tertiary-fixed: '#89f5e7'
  tertiary-fixed-dim: '#6bd8cb'
  on-tertiary-fixed: '#00201d'
  on-tertiary-fixed-variant: '#005049'
  background: '#f9f9fc'
  on-background: '#1a1c1e'
  surface-variant: '#e2e2e5'
typography:
  display-lg:
    fontFamily: Work Sans
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Work Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Work Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  table-data:
    fontFamily: Work Sans
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  numeric-md:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 32px
  sidebar-width: 280px
  table-cell-padding: 12px 16px
---

## Brand & Style

This design system is engineered for high-performance financial environments where clarity, speed, and accuracy are paramount. The aesthetic follows a **Corporate / Modern** direction with a focus on high-contrast information density. It prioritizes "functional elegance"—eliminating visual noise to reduce cognitive load during long shifts.

The target audience includes retail associates, accountants, and business owners. The emotional response is one of absolute reliability and technical competence. The style utilizes sharp geometry, clear content grouping, and a systematic approach to color that distinguishes between "state" (status) and "action" (interaction).

## Colors

The palette is anchored by a deep **Corporate Blue** (`primary`) to establish trust and stability. A vibrant **Action Orange** (`secondary`) is used exclusively for primary calls-to-action and "Finalize" events to ensure they are unmissable in a fast-paced POS environment. **Sharp Teal** (`tertiary`) serves as a secondary action color or to highlight positive financial growth.

Neutral tones are biased toward a cool scale to maintain a professional "ledger" feel. The `surface_sidebar` is intentionally dark to create a clear structural anchor for navigation, while the main workspace uses a high-reflectance light gray to maximize legibility.

## Typography

The design system utilizes **Work Sans** as the primary typeface for its exceptional legibility and professional, neutral character. Its geometric foundations ensure that even at small sizes in dense data tables, characters remain distinct.

For data-heavy roles, specifically prices, quantities, and transaction IDs, **JetBrains Mono** is employed. This monospaced choice ensures that columns of numbers align perfectly, allowing users to scan for discrepancies or total values with ease. All labels for status or metadata should use the `label-caps` style for immediate visual categorization.

## Layout & Spacing

This design system uses a **Fluid Grid** model with fixed structural anchors. The sidebar is a constant 280px width, while the main content area expands to fill the viewport. A 12-column grid is used for dashboard views, while accounting ledgers utilize a single-column, full-width data table.

Spacing is built on a strict 4px base unit. 
- **Desktop:** 32px outer margins, 24px gutters.
- **Mobile:** 16px outer margins, 12px gutters.
- **Data Density:** To accommodate long-duration use, rows in tables use a 12px vertical padding to prevent "line-blur" and improve horizontal scanning.

## Elevation & Depth

To maintain a clean and professional look, this design system avoids heavy shadows. Instead, it uses **Tonal Layers** and **Low-Contrast Outlines** to define hierarchy.

- **Level 0 (Base):** The main application background (`#F8FAFC`).
- **Level 1 (Cards/Tables):** White surfaces with a 1px border (`#E2E8F0`). No shadow.
- **Level 2 (Popovers/Modals):** White surfaces with a refined 8px blur, 10% opacity black shadow.
- **Sidebars:** High-contrast dark surfaces (`#001B3D`) with no elevation, acting as a structural "void" to push the content forward.

## Shapes

The shape language is **Soft** (Level 1). This choice provides enough rounding to feel modern and approachable, while maintaining the "architectural" integrity of a professional tool.

- **Inputs & Buttons:** 0.25rem (4px) corner radius.
- **Cards & Modals:** 0.5rem (8px) corner radius.
- **Status Pills:** Fully rounded (pill-shaped) to distinguish them from interactive buttons.

## Components

### Sidebars
The navigation sidebar is a primary structural element. It must use the dark primary variant. Active states are indicated by a 4px `secondary` (Orange) vertical bar on the leading edge and a subtle background highlight. Icons should be line-weight (2px) for clarity.

### Data Tables
Tables are the heart of the accounting interface.
- **Header:** Sticky positioning, background color `#F1F5F9`, bolded `body-sm` text.
- **Rows:** Zebra striping is not used; instead, use a 1px bottom border. On hover, the entire row should shift to a very light blue tint.
- **Alignment:** Numbers are always right-aligned (using `numeric-md`); text is left-aligned.

### Buttons
- **Primary:** `secondary_color_hex` background, white text. For final checkout or "Save" actions.
- **Secondary:** `primary_color_hex` outline and text. For standard navigation or "Add to Cart."
- **Ghost:** No background, `neutral_color_hex` text. For "Cancel" or "Reset."

### Status Indicators
Small, high-contrast pills. 
- **Success (Paid):** Green background, white text.
- **Warning (Pending):** Orange background, white text.
- **Error (Overdue):** Red background, white text.

### Input Fields
Inputs must have a visible 1px border at all times. On focus, the border increases to 2px using the `primary_color_hex`. Labels are always positioned above the field, never inside as placeholders, to ensure accessibility during data entry.