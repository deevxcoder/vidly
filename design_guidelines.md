# Design Guidelines: YouTube Video Management Platform

## Design Approach
**Reference-Based Approach**: Inspired by YouTube Creator Studio and TubeBuddy's professional channel management interfaces, focusing on organized video management, multi-channel publishing, and data-dense dashboard layouts.

**Key Design Principles**:
- Information density with clear hierarchy
- Professional content creator tools aesthetic
- Efficient multi-channel management workflows
- Card-based organization for scalability

## Core Design Elements

### A. Color Palette
**Primary Colors**:
- Brand Red: `0 100% 50%` (YouTube signature red)
- Dark Grey: `0 0% 16%` (main backgrounds)
- Pure White: `0 0% 100%` (content cards)
- Light Grey: `0 0% 98%` (sidebar background)

**Functional Colors**:
- Success Green: `140 100% 42%` (published status)
- Warning Orange: `38 100% 50%` (pending/processing)
- Error Red: `0 84% 60%` (failed uploads)
- Info Blue: `217 89% 61%` (channel connections)

**Text Colors**:
- Primary Text: `0 0% 1%` (headings, labels)
- Secondary Text: `0 0% 40%` (descriptions, metadata)
- Disabled Text: `0 0% 62%` (inactive states)

### B. Typography
**Font Families**:
- Primary: 'Roboto', sans-serif (Google Fonts CDN)
- Monospace: 'Roboto Mono', monospace (for video IDs, technical data)

**Type Scale**:
- Hero/Page Titles: text-3xl font-bold (30px)
- Section Headings: text-xl font-semibold (20px)
- Card Titles: text-lg font-medium (18px)
- Body Text: text-base font-normal (16px)
- Captions/Meta: text-sm font-normal (14px)
- Small Labels: text-xs font-medium (12px)

### C. Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4, p-6, p-8
- Section margins: mb-6, mb-8, mb-12
- Grid gaps: gap-4, gap-6
- Element spacing: space-y-4, space-x-4

**Container Structure**:
- Sidebar: Fixed 280px width (w-70)
- Main Content: flex-1 with max-w-7xl container
- Cards: p-6 with rounded-lg shadow-sm

### D. Component Library

**Navigation**:
- Fixed left sidebar with YouTube red accent bar
- Navigation items with hover states (bg-gray-100)
- Active state with red left border (border-l-4 border-red-600)
- Logo at top, user profile at bottom

**Video Cards**:
- 16:9 aspect ratio thumbnail (aspect-video)
- Overlay play button icon on hover
- Title (text-lg font-medium, line-clamp-2)
- Upload date, duration, file size metadata
- Publishing status badges (top-right corner)
- Action menu (3-dot) on hover

**Channel Connection Cards**:
- Horizontal layout with channel avatar (left)
- Channel name, subscriber count, video count
- Connection status badge (connected/disconnected)
- "Manage" or "Disconnect" action buttons
- Last sync timestamp

**Upload Interface**:
- Drag-and-drop zone with dashed border (border-2 border-dashed)
- File input fallback button
- Progress bars for active uploads (bg-red-600)
- Upload queue list with cancellation option

**Publishing Modal**:
- Multi-select channel checklist with checkboxes
- "Select All" / "Deselect All" quick actions
- Video metadata preview (thumbnail, title, description)
- Primary "Publish" button (bg-red-600)
- Secondary "Schedule" option

**Dashboard Widgets**:
- Stats cards in 4-column grid (lg:grid-cols-4)
- Total uploads, published count, pending, channels connected
- Icon + number + label layout
- Subtle background gradients

**Forms**:
- Floating labels or top-aligned labels
- Input borders: border-gray-300 focus:border-red-500
- Validation states with inline error messages
- Submit buttons always bg-red-600 with hover:bg-red-700

**Tables** (for API settings/logs):
- Striped rows (even:bg-gray-50)
- Sticky header (sticky top-0)
- Sortable columns with arrow icons
- Row actions menu (right-aligned)

**Status Indicators**:
- Published: Green dot + text
- Processing: Orange animated pulse
- Failed: Red warning icon
- Draft: Grey outline badge

### E. Page-Specific Layouts

**Dashboard**:
- Top stats row (4 cards)
- Recent uploads grid (3-4 columns)
- Connected channels horizontal scroll
- Quick actions floating action button (bottom-right)

**Upload Page**:
- Large drop zone (central, 60% height)
- Upload queue sidebar (right, 35% width)
- Metadata form reveals after file selection

**Channel Management**:
- "Connect New Channel" prominent CTA (top-right)
- Channel cards in 2-column grid (lg:grid-cols-2)
- Filter/search bar above grid
- OAuth connection flow modal

**Video Library**:
- Filter bar (status, date, channel) with pills
- Grid/List view toggle
- Infinite scroll or pagination
- Bulk select mode with floating action bar

**Settings Page**:
- Tab navigation (API Keys, Channels, Preferences)
- Form sections with dividers
- Save changes sticky footer bar

### F. Interactions & Micro-animations
- Button hover: brightness increase (hover:brightness-110)
- Card hover: subtle shadow lift (hover:shadow-lg transition-shadow)
- Modal entrance: fade + scale (animate-in)
- Toast notifications: slide from top-right
- Loading states: skeleton screens (animate-pulse)

**Minimize Distractions**: No auto-playing animations, subtle transitions only

## Images

**Hero Image**: No traditional hero image - this is a utility-focused dashboard application

**Content Images**:
- Video thumbnails: User-uploaded, 16:9 ratio, max 1280x720 display
- Channel avatars: Circular, 48x48px standard, 80x80px in detail views
- Placeholder images: Use gradient backgrounds with upload icons for empty states
- Empty state illustrations: Simple line-art icons for no videos/channels states

**Implementation Notes**:
- All thumbnails lazy-loaded with blur-up placeholders
- Use object-fit: cover for maintaining aspect ratios
- WebP format with PNG fallback for thumbnails