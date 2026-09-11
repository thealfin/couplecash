MEGA PROMPT — ADJUSTMENT GLOBAL UI & NAVIGATION COUPLECASH

Context:
You are modifying the existing CoupleCash mobile-first financial management application.

IMPORTANT:

- Do NOT rebuild the application from scratch.
- Preserve the existing architecture, components, styling system, Tailwind configuration, database integration, authentication, and existing functionality.
- Inspect the existing codebase first before making modifications.
- Reuse existing components whenever possible.
- Do not introduce duplicate components or duplicate business logic.
- Existing UI visual language must remain consistent with CoupleCash.
- The provided Goals HTML UI is the visual reference for typography, spacing, cards, colors, radius, shadows, and overall visual hierarchy.

GLOBAL TERMINOLOGY:

1. "Akun Finansial" = formal UI terminology for financial accounts.
2. "Pos Akun" = shorthand terminology used in this implementation prompt and future development discussions.
3. Pos Akun includes:
   - Rekening Bank
   - E-Wallet
   - Crypto
   - Hutang
4. When UI needs a concise label, use "Pos Akun".
5. Replace:
   "Kelola Akun Rekening Bank & Dompet"
   with:
   "Kelola Akun Finansial"

==================================================

1. # MOBILE BOTTOM NAVIGATION

Redesign the mobile bottom navigation into a premium white floating/embedded tab bar.

Navigation structure:

[ Beranda ] [ Analitik ] [ + ] [ Goals ] [ Akun ]

The "+" is an Action Center button and occupies the center position.

Visual structure:

navbar → curved indentation → elevated "+" button → curved indentation → navbar

Requirements:

- Bottom navigation background must be white / surface-container-lowest.
- Mobile-first.
- Full width.
- Fixed to bottom.
- Respect safe-area-inset-bottom.
- Subtle top shadow.
- Rounded top corners.
- The center portion of the navigation bar must have a concave downward cutout/indentation following the circular shape of the "+" button.
- The "+" button must visually rise above the navigation bar.
- "+" button should be centered exactly between Analitik and Goals.
- The button should have a circular shape.
- It should slightly overlap the top surface of the navigation bar.
- The navigation bar should visually wrap around the button.
- Do not make the center section look like a normal fifth rectangular tab.
- The center should clearly communicate that it is an Action Center.

Recommended conceptual structure:

---

## | Beranda | Analitik | \**_ + _**/ | Goals | Akun |

The center notch must be smooth and symmetrical.

Navigation labels:

1. Beranda
   icon: home

2. Analitik
   icon: monitoring

3. Action Center
   icon: add
   label can be "Catat" if needed visually, but the interaction is Action Center.

4. Goals
   icon: bullseye / target Cyrcle
   use Material Symbols "target" or closest available bullseye/target icon.
   Do NOT use savings as the primary Goals icon anymore.

5. Akun
   icon: tune or account/settings equivalent.

Active state:

- Beranda active when current page is Beranda.
- Analitik active when current page is Analitik.
- Goals active when current page is Goals.
- Akun active when current page is Akun.
- The "+" Action Center does NOT behave like a normal route tab.
- "+" must not remain visually active after opening one of its actions.

IMPORTANT:
The active navigation state must be route/page based, not click-state based.

# ================================================== 2. MENU "ANGGARAN" TERMINOLOGY

Replace all visible UI text:

"Anggaran"

with:

"Budget"

This includes:

- menu labels
- headings
- buttons
- empty states
- modal titles
- breadcrumbs
- action center menu
- relevant accessibility labels
- page titles
- descriptions where appropriate

Do not rename database tables unnecessarily if existing database compatibility would be affected.

Use "Budget" as the user-facing terminology.

# ================================================== 3. CATEGORY CARD ADJUSTMENT

Existing category UI must be enhanced.

Each category card/list item must have:

- category icon
- category name
- category status
- category-related information
- more_vert / three-dot action menu

The three-dot menu must support:

- Detail
- Edit
- Delete

The category detail view/modal should expose the relevant data associated with the category.

The existing active/inactive toggle behavior must remain.

Do NOT remove the existing toggle.

# ================================================== 4. POS AKUN CARD ADJUSTMENT

Each Pos Akun card must include:

- icon
- account name
- account type
- current balance
- status
- more_vert action menu
- active/inactive toggle

Add an explicit active/inactive toggle icon.

When disabled:

- The account remains stored in the database.
- Historical transactions must remain intact.
- The account should NOT be offered as an available account during new transaction input.
- It should also NOT appear as an available account during AI Camera transaction review.
- Existing historical transactions must not be deleted or modified.

# ================================================== 5. TOTAL CONNECTED ACCOUNTS COPY

Find the existing text:

"Total Akun Terhubung"

Adjust the wording so it accurately represents the financial account management section.

Use:

"Total Pos Akun Terhubung"

or, if the surrounding UI already makes "Pos Akun" obvious:

"Pos Akun Terhubung"

Choose the wording that produces the cleanest UI, but do not use "Total Akun Terhubung" anymore.

# ================================================== 6. CONSISTENCY

Apply the terminology and navigation changes consistently throughout the application.

Search the entire frontend codebase for:

- Anggaran
- Kelola Akun Rekening Bank & Dompet
- Total Akun Terhubung
- savings icon used specifically for Goals

Update only the relevant UI/business context.

Do not accidentally change unrelated terminology.

# ================================================== 7. RESPONSIVE REQUIREMENTS

Primary target:
mobile width.

Must remain usable at:

- 320px
- 360px
- 375px
- 390px
- 412px
- 430px

The bottom navigation must:

- not overflow
- not hide important content
- respect safe-area
- not cover CTA buttons
- not create horizontal scrolling

==================================================
ACCEPTANCE CRITERIA
==================================================

- Bottom navigation has 5 visual slots: Beranda, Analitik, +, Goals, Akun.
- "+" visually rises above the bar.
- Center of navigation has a smooth concave indentation around "+".
- Goals uses a bullseye/target icon.
- "Anggaran" is replaced by "Budget" in user-facing UI.
- "Kelola Akun Rekening Bank & Dompet" becomes "Kelola Akun Finansial".
- Pos Akun supports active/inactive state.
- Category supports active/inactive state.
- Historical data remains untouched.
- No duplicate navigation implementations.
- No broken routes.
- No regression to existing transaction functionality.
