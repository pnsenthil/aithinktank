# AI Think Tank - Design Guidelines

## Design Approach
**Reference-Based Approach**: Drawing inspiration from **Notion** and **Linear** for their sophisticated information hierarchy, clean layouts, and complex workflow management. These products excel at presenting structured content and multi-step processes, which aligns perfectly with our debate facilitation system.

## Core Design Elements

### Color Palette
**Light Mode:**
- Primary: 220 90% 50% (Professional blue for trust and authority)
- Secondary: 220 20% 95% (Light gray backgrounds)
- Success: 142 76% 36% (For approved solutions)
- Warning: 38 92% 50% (For debate conflicts)
- Text: 220 15% 25% (Dark gray for readability)

**Dark Mode:**
- Primary: 220 90% 60% (Lighter blue for contrast)
- Secondary: 220 15% 15% (Dark gray surfaces)
- Background: 220 15% 8% (Deep dark background)
- Text: 220 15% 85% (Light gray text)

### Typography
**Primary Font**: Inter (Google Fonts)
**Hierarchy:**
- Headers: 600 weight, sizes from text-lg to text-3xl
- Body: 400 weight, text-sm to text-base
- Labels: 500 weight, text-xs to text-sm
- Code/Citations: Mono font for evidence references

### Layout System
**Spacing Units**: Tailwind units of 2, 4, 6, and 8 (p-2, m-4, gap-6, h-8)
- Consistent 4-unit spacing between related elements
- 6-unit spacing between sections
- 8-unit spacing for major layout divisions

### Component Library

**Navigation:**
- Left sidebar with collapsible sections for Sessions, Templates, Settings
- Top toolbar with session status, export options, and user avatar
- Breadcrumb navigation for workshop phases

**Core Interfaces:**
- **Session Setup**: Card-based layout with drag-drop file upload zones
- **Problem Statement**: Centered form with rich text editor and approval workflow
- **Solution Display**: Card grid with expandable sections for objectives, risks, impact
- **Debate View**: Threaded conversation layout with clear Proponent/Opponent visual separation using colored borders (blue/red)
- **Voting Interface**: Inline thumbs up/down with live vote counts
- **Evidence Panel**: Collapsible sidebar showing Analyst citations with confidence indicators
- **Summary View**: Three-column layout (Pros | Evidence | Cons) with decision prompts

**Data Display:**
- Debate cards with session metadata, participant count, and status badges
- Timeline view for debate progression
- Search and filter bar with tags for session categorization

**Forms & Inputs:**
- Clean form styling with subtle borders and focus states
- File upload areas with drag-drop styling and progress indicators
- Rich text editors for problem statements and solution proposals

**Overlays:**
- Modal dialogs for session configuration and exports
- Toast notifications for system feedback and agent responses
- Loading states with progress indicators for AI processing

### Visual Hierarchy
- Use subtle shadows and borders to define content areas
- Gradient backgrounds only for hero sections and call-to-action areas
- Color-coded agent roles: Moderator (neutral gray), Proponent (blue), Opponent (red), Analyst (green)
- Visual debate flow indicators showing progression through workshop phases

### Responsive Design
- Three-column layout on desktop collapses to single column on mobile
- Sidebar navigation becomes bottom tab bar on mobile
- Debate threads maintain readability with proper spacing on all devices

### Key Interactions
- Smooth transitions between workshop phases
- Real-time updates for vote counts and new arguments
- Progressive disclosure for complex debate trees
- Hover states for interactive elements with subtle elevation changes

This design system prioritizes clarity and professionalism while supporting the complex multi-agent debate workflow with intuitive visual cues and efficient information architecture.