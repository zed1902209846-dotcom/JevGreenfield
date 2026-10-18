---
name: Jev Risk Oracle
description: A clear maritime palette for evidence-led risk decisions.
colors:
  maritime: "#173f50"
  action: "#007779"
  ground: "#edf3f4"
  surface: "#ffffff"
  secondary-surface: "#e8f0f2"
  muted: "#506974"
  line: "#d4e0e3"
  control-border: "#a7bdc4"
  positive: "#187563"
  negative: "#b33d30"
  caution: "#916000"
  inverse-muted: "#c3d7df"
typography:
  headline:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "clamp(26px, 2.5vw, 36px)"
    fontWeight: 650
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  title:
    fontSize: "18px"
    fontWeight: 600
  label:
    fontSize: "12px"
    fontWeight: 400
rounded:
  tag: "4px"
  control: "6px"
  pill: "99px"
spacing:
  compact: "8px"
  group: "14px"
  section: "24px"
  gutter: "28px"
  desktop-edge: "48px"
components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "0 30px"
  input-search:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.maritime}"
    rounded: "{rounded.control}"
    padding: "0 18px"
  risk-surface:
    backgroundColor: "{colors.maritime}"
    textColor: "{colors.surface}"
    padding: "26px"
---

# Design System: Jev Risk Oracle

## Overview
**Creative North Star: "航路气象图 / Maritime risk outlook"**

A working financial interface with a maritime shell, cool daylight ground and precise data typography. The world contributes palette, density and a segmented risk horizon; navigation and inputs remain conventional web controls.

**Key Characteristics:**
- Flat, clearly separated work areas.
- Explicit risk states alongside readable values.
- Chinese and English UI with original-language research content.

## Colors
Maritime is both primary text and the inverse shell. Action teal identifies interactive controls. Ground and secondary-surface are cool, avoiding a stark white page. Muted text remains blue-tinted. Positive, negative and caution indicate state, never a claim of investment performance.

**The State Plus Text Rule.** Color is accompanied by a numerical value or state label.

## Typography
Use the system workhorse stack for this Operate interface, including Microsoft YaHei for Chinese fallback. Headlines use the recorded responsive scale; section titles use 18px; body text is 14px. Dense metadata uses 12px. Introductory prose is limited to 75ch. Data uses tabular numerals.

## Layout
The desktop container is capped at 1536px, with 48px side padding and 28px work-area gaps. The primary grid has a 340px summary column and a fluid detail column. At 1180px, use 28px padding, 22px gaps and a 300px summary. Below 1000px, secondary details become one column. At 720px, the page stacks with 16px side padding and 20px gaps. Wide tables scroll inside their own containers.

## Elevation & Depth
Flat tonal separation, not shadows, defines the shell and work areas. Focus uses an offset two-pixel outline. The risk area is inverse maritime, the chart and evidence areas white.

## Shapes
Work areas have square corners. Controls use modest rounded corners; status tags are smaller and example query chips are pills. Data rules are thin and unobtrusive.

## Components
- **Primary action:** teal with white text; disabled state dims and cannot submit. On mobile it becomes full-width below the input.
- **Search:** white field, thin control border, authored SVG search mark, visible keyboard focus and an accessible name.
- **Navigation:** text links on the navy header; the language toggle remains reachable on mobile. Section tab buttons expose pressed state.
- **Risk horizon:** segmented green/amber/rust bands, numeric score, marker, state label and coverage. An absent score shows a dash rather than zero.
- **Price chart:** actual hourly candles with volume, keyboard crosshair and contextual OHLC values. Redraw on resize.
- **History:** selectable rows with Enter/Space support; original question text is preserved.
- **Language:** stored locally when available; controls and owned labels translate, supplied research and questions remain verbatim.

## Do's and Don'ts
- Do pair state colors with words and values.
- Do preserve keyboard access and readable empty/error states.
- Do keep source research text intact.
- Don't imply that low risk means a positive price forecast.
- Don't substitute invented live data for missing results.
