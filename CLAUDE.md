# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start dev server (localhost:5173)
npm run dev:vercel      # Start Vercel dev with serverless functions
npm run build            # Build for production (tsc + vite)
npm run preview          # Preview production build
npm run lint             # Run ESLint

# Testing
npm test                 # Run all tests (Vitest + jsdom)
npm run test:coverage    # Generate coverage report (v8 provider)
npm run test:watch       # Run tests in watch mode

# Deployment
npm run deploy           # Build and deploy to GitHub Pages
# For Vercel: Configure environment variables in Vercel dashboard and deploy via git push

# Utilities
npm run backup           # Backup LocalStorage via tsx script
```

**Running specific tests:** Use `npm test -- <pattern>` to run tests matching a pattern. For example: `npm test -- grouping` runs only tests containing "grouping".

## Architecture Overview

This is a React 19 + TypeScript + Vite application for basketball player grouping. The architecture follows a **Repository pattern** with hybrid local/cloud storage.

### Data Layer Architecture

The app uses Supabase as the primary data source with repository pattern for abstraction.

**Current Repository Configuration:**
- **Players**: Forced to use Supabase (`createPlayerRepository()` always returns `SupabasePlayerRepository`)
- **Grouping History**: Uses Supabase if configured, falls back to SQLite
- **Match Data**: Uses Supabase if configured, falls back to SQLite

**Repository Classes:**
- `PlayerRepository` - SQLite implementation (base class)
- `SupabasePlayerRepository` - Supabase cloud implementation (used by default)
- `GroupingRepository` - Grouping history (SQLite)
- `SupabaseGroupingRepository` - Grouping history (Supabase)
- `MatchRepository` - Match records
- `PlayerMatchStatsRepository` - Player match statistics
- `SkillAdjustmentRepository` - Skill rating adjustments
- `PlayerVideoRepository` - Player video records

**Factory Pattern:**
```typescript
import { playerRepository, groupingRepository, createPlayerRepository, createGroupingRepository } from '@/repositories';

// Use default instances (recommended)
await playerRepository.findAll();

// Or create new instances with specific data source
const customPlayerRepo = createPlayerRepository(); // Always returns SupabasePlayerRepository
const customGroupingRepo = createGroupingRepository('sqlite'); // Falls back to SQLite if Supabase unavailable
```

**Note**: The factory in `src/repositories/repository.factory.ts` currently forces Supabase for players. The hybrid pattern (SQLite + Supabase with offline sync) exists in code but is not the active configuration.

### Key Services

| Service | Location | Purpose |
|---------|----------|---------|
| `DatabaseService` | `src/services/database.ts` | SQLite + IndexedDB + LocalStorage management with debounced saves |
| `AuthService` | `src/lib/auth.ts` | Anonymous auth for Supabase |
| `NetworkStatusService` | `src/lib/network-status.ts` | Online/offline detection |
| `ChatService` | `src/services/chat-service.ts` | AI chat functionality with streaming responses |
| `AiService` | `src/services/ai/index.ts` | AI-powered skill suggestions and grouping optimization |
| `SkillSuggestionService` | `src/services/ai/skill-suggestion.service.ts` | AI-driven skill rating recommendations |
| `GroupingOptimizationService` | `src/services/ai/grouping-optimization.service.ts` | AI-powered team balance optimization |
| `MonitoringService` | `src/services/monitoring-service.ts` | API usage monitoring and error tracking |
| `FeedbackService` | `src/services/feedback-service.ts` | User feedback collection (thumbs up/down) |
| `RatingHistoryService` | `src/services/rating-history.service.ts` | Track skill rating changes over time |
| `MatchAnalysisService` | `src/services/match-analysis.service.ts` | Analyze match results and trends |
| `MatchImportService` | `src/services/match-import.service.ts` | Import match data from external sources |

### Database Schema

**SQLite/Supabase tables:**
- `players` - Basic player info (id, name, position, created_at, updated_at)
- `player_skills` - 19 skill ratings (two_point_shot, three_point_shot, free_throw, passing, ball_control, court_vision, perimeter_defense, interior_defense, steals, blocks, offensive_rebound, defensive_rebound, speed, strength, stamina, vertical, basketball_iq, teamwork, clutch) plus auto-calculated overall
- `grouping_history` - Team groupings with JSON data payload (mode, team_count, player_count, balance_score, data, note)
- `matches` - Match records (date, mode, winner, created_at, updated_at)
- `player_match_stats` - Player statistics per match (match_id, player_id, team, points, rebounds, assists, etc.)
- `skill_adjustments` - Skill rating adjustments (player_id, adjustment_type, old_value, new_value, reason, status, created_at)
- `player_videos` - Player video recordings (player_id, video_type, video_url, status, recorded_at, created_at)

**Supabase tables** (when configured): Same schema with RLS (Row Level Security) policies for anonymous auth.

## Type System

**Core Types** (`src/types/`):
- `Player` - Complete player record with skills
- `BasketballPosition` - PG/SG/SF/PF/C/UTILITY
- `BasketballSkills` - 19 skill fields (2pt/3pt/FT, passing, defense, rebounds, physical, IQ, etc.)
- `Team`, `GroupingStrategy`, `GroupingConfig` - Team/grouping results and configuration
- `Match`, `MatchMode`, `MatchWinner` - Match records and results
- `PlayerMatchStats` - Individual player statistics per match
- `SkillAdjustment`, `AdjustmentType`, `AdjustmentStatus` - Skill rating changes
- `PlayerVideo`, `VideoType`, `VideoStatus` - Player video recordings
- `ChatMessage`, `ChatRole` - AI chat messages (see `src/types/chat.ts`)

**Path alias**: Use `@/` for imports from `src/` directory (configured in both tsconfig and vitest.config).

## Grouping Algorithm

Located in `src/utils/groupingAlgorithm.ts` (primary implementation):
- `groupPlayers()` - Main grouping function with config-based strategy
- `calculateBalance()` - Returns balance score (0-100, higher = better)
- `balanceTeams()` - Optimizes team balance through player swaps

Legacy implementation at `src/utils/basketballGroupingAlgorithm.ts`:
- `groupFor5v5()` - Standard 5v5 with position balancing
- `groupFor3v3()` - 3v3 mode with combined position groups
- `calculateBalanceScore()` - Returns standard deviation of team scores
- `getTeamStats()` - Aggregates team-level statistics

Algorithm uses snake draft pattern with position requirements and iteratively swaps players to minimize team rating differences (<10 points = balanced).

## Component Organization

**Main entry**: `src/App.tsx` - React Router-based navigation

**Routes:**
- `/` - Chat view (AI assistant, default route)
- `/players` - Player management with cards, search, and import/export
- `/grouping` - Advanced grouping tool with drag-and-drop

**Key component patterns:**
- Forms use controlled state patterns (no react-hook-form/zod in current codebase)
- UI components from `shadcn/ui` (Radix UI primitives)
- SAP Fiori-inspired `ShellBar` for navigation
- Dialog-based workflows (Add Player, Import Wizard, Player Detail)

**Chat Components:**
- `ChatView` - Main chat interface with message list and input
- `ChatMessage` - Individual message display with markdown rendering
- `MessageList` / `MessageListVirtualized` - Message display with virtualization
- `ChatInput` - Message input with function call support
- `FeedbackButtons` - Thumbs up/down for AI responses
- `MonitoringDashboard` - API usage and error statistics

**Import/Export Components:**
- `ImportWizard` - Multi-step wizard for importing players/games
- `PlayerImporter` - CSV/Excel file import

**Player Components:**
- `PlayerCard` - Individual player display with skills
- `PlayerForm` / `PlayerFormDialog` - Add/edit player forms
- `PlayerDetailDialog` - Detailed player information view
- `PlayerSelection` - Multi-select for grouping
- `DragDropGrouping` - Drag-and-drop team organization

**Analysis Components:**
- `SkillRadarChart` - Radar chart for player skills
- `TeamComparisonChart` - Team skill comparison
- `RatingHistoryChart` - Skill rating over time
- `AISuggestionPanel` - AI-powered skill suggestions

**Testing**: Component tests use `@testing-library/react`. Setup file at `src/test/setup.ts` extends Vitest with jest-dom matchers.

## Chat & AI Features

The app includes an AI-powered chat assistant for basketball-related queries and data analysis.

### Chat System

**Service**: `ChatService` in `src/services/chat-service.ts`
- Streaming responses from AI providers (Gemini/Doubao)
- Function calling for data queries (player stats, grouping suggestions)
- Context-aware multi-turn conversations
- Error handling and retry logic

**AI Client**: `GeminiClient` in `src/lib/gemini-client.ts`
- Google Gemini API integration
- Stream-based response handling
- Tool/function call support

### AI Services

**Skill Suggestion Service** (`src/services/ai/skill-suggestion.service.ts`):
- AI-powered skill rating recommendations
- Analyzes player performance data
- Suggests balanced skill distributions

**Grouping Optimization Service** (`src/services/ai/grouping-optimization.service.ts`):
- AI-powered team balance optimization
- Considers player roles and team chemistry
- Generates alternative grouping strategies

### Chat Components

Located in `src/components/chat/`:
- `ChatView` - Main chat interface
- `ChatMessage` - Message display with markdown
- `ToolCallMessage` - Function call visualization
- `SearchResultDisplay` - Web search results

### Monitoring & Feedback

**MonitoringService** (`src/services/monitoring-service.ts`):
- Tracks API call counts and costs
- Monitors error rates and response times
- Stores metrics in IndexedDB for persistence

**FeedbackService** (`src/services/feedback-service.ts`):
- Collects user feedback (thumbs up/down)
- Aggregates feedback statistics
- Supports detailed feedback submission

### Environment Variables for AI

```bash
# Required for AI features
VITE_ARK_API_KEY=your-ark-api-key          # Doubai/Volcano Engine for AI
VITE_ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3

# Required for web search in chat
VITE_BRAVE_SEARCH_API_KEY=your-brave-key    # Brave Search API
```

If AI services are not configured, the chat assistant will fallback to rule-based responses or display appropriate error messages.

## Component Library (shadcn/ui)

This project uses **shadcn/ui** - accessible, unstyled React components built on Radix UI primitives and Tailwind CSS.

### Core Pattern: Copy-Paste Components

shadcn/ui is **not** a traditional npm package. Components are copied into your codebase:
```
src/components/ui/
├── button.tsx
├── dialog.tsx
├── input.tsx
├── select.tsx
└── ... (other components)
```

**Best Practice**: When customizing components:
- ✅ Create wrapper components in your application (e.g., `src/components/MyButton.tsx`)
- ❌ Avoid direct modification of `src/components/ui/*` files
- This allows easy updates by re-running the component copy command

### Using Components

```typescript
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Button with variants
<Button variant="default" size="md">Submit</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline" size="sm">Cancel</Button>

// Dialog pattern
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Class Name Merging Utility

Always use `cn()` from `@/lib/utils` to merge Tailwind classes:
```typescript
import { cn } from '@/lib/utils'

// ✅ Good: Uses cn() to merge classes properly
<div className={cn(
  "base-classes",
  isActive && "active-classes",
  className  // Prop from parent
)} />

// ❌ Bad: Direct string concatenation
<div className={`base-classes ${isActive ? "active" : ""} ${className}`} />
```

`cn()` uses `clsx` + `tailwind-merge` to:
- Merge conditional classes cleanly
- Remove conflicting Tailwind classes (later ones win)
- Support `clsx` conditional syntax

### Component Variants

Many shadcn components use `class-variance-authority` (CVA) for variants:
```typescript
import { buttonVariants, type VariantProps } from '@/components/ui/button'

// Type-safe variant props
type ButtonProps = VariantProps<typeof buttonVariants> & { ... }
```

### Available Components

Located in `src/components/ui/`:
- Form: `input`, `select`, `checkbox`, `slider`, `label`, `textarea`
- Layout: `card`, `separator`, `tabs`
- Feedback: `alert`, `dialog`, `dropdown-menu`, `toast` (via `sonner`)
- Data: `badge`, `avatar`, `progress`, `skeleton`, `table`

## CSS & Styling (Tailwind CSS v4)

This project uses **Tailwind CSS v4** - the latest version with improved configuration and performance.

### Tailwind v4 Key Differences

1. **No `tailwind.config.js` needed** (for most use cases) - configuration in CSS via `@theme`
2. **CSS-first approach** - Theme tokens defined in CSS files
3. **Vite plugin** - `@tailwindcss/vite` handles compilation automatically

### Theme Configuration

Design tokens are defined in CSS using `@theme`:
```css
@theme {
  --color-primary: ...;
  --color-secondary: ...;
  --radius-default: 0.5rem;
  --font-sans: ...;
}
```

### Styling Best Practices

1. **Use utility classes over custom CSS**:
   ```tsx
   // ✅ Good
   <div className="flex items-center gap-4 p-4 bg-card rounded-lg">

   // ❌ Avoid
   <div className="my-card"> // + custom CSS
   ```

2. **Responsive design** - Use mobile-first approach:
   ```tsx
   // Mobile: flex-col, md+: flex-row
   <div className="flex flex-col md:flex-row gap-4">
   ```

3. **Dark mode** - Use semantic color tokens:
   ```tsx
   // These automatically adapt to dark/light themes
   <div className="bg-background text-foreground border-border">
   <div className="bg-muted text-muted-foreground">
   ```

4. **Spacing consistency** - Stick to Tailwind's spacing scale:
   - `p-1` to `p-8` (4px to 32px)
   - `gap-2`, `gap-4`, `gap-6` (8px, 16px, 24px)

5. **Animations** - Use Radix/FRamer patterns for transitions:
   ```tsx
   // shadcn/ui components include animations via Radix
   // For custom animations, use Framer Motion:
   <motion.div
     initial={{ opacity: 0 }}
     animate={{ opacity: 1 }}
     transition={{ duration: 0.2 }}
   >
   ```

### Color System

Semantic tokens automatically handle light/dark themes:
- `bg-background` / `text-foreground` - Primary background/text
- `bg-muted` / `text-muted-foreground` - Secondary UI elements
- `border-border` - Borders and dividers
- `bg-primary` / `text-primary-foreground` - Action elements
- `bg-destructive` - Error/danger states

### Tailwind v4 Tips (from best practices)

- Use `group` and `group-hover` for hover states on parent containers
- Use `peer` and `peer-invalid` for form validation states
- Leverage `@layer` in CSS for custom component styles when needed
- Use arbitrary values sparingly (`w-[123px]`) - prefer scale values

## Environment Configuration

**Required for Supabase cloud sync:** Copy `.env.example` to `.env.local`:
```bash
# Supabase (required for data persistence)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI Services (optional, for chat assistant)
VITE_ARK_API_KEY=your-ark-api-key
VITE_ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3

# Web Search (optional, for chat to search latest basketball info)
VITE_BRAVE_SEARCH_API_KEY=your-brave-search-api-key

# Deployment platform specific (see Deployment section below)
VITE_BASE_URL=/player-grouping/  # GitHub Pages (default for production)
```

If Supabase is not configured, the app will display errors as it's currently required for player data. Unlike earlier versions, there's no automatic fallback to LocalStorage.

## Deployment

This project supports multiple deployment platforms:

### GitHub Pages
- **Base Path**: `/player-grouping/`
- **Build Command**: `npm run build` (includes predeploy script)
- **Deploy Command**: `npm run deploy` (uses gh-pages)
- **Environment Variables**: Configure in GitHub Actions secrets:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_ARK_API_KEY` (optional)
  - `VITE_BRAVE_SEARCH_API_KEY` (optional)
- **VITE_BASE_URL**: Set to `/player-grouping/` in GitHub Actions

### Vercel
- **Base Path**: `/` (root)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: Configure in Vercel dashboard under Project Settings → Environment Variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_ARK_API_KEY` (optional)
  - `VITE_BRAVE_SEARCH_API_KEY` (optional)
- **Note**: For local development with Vercel, use `npm run dev:vercel`

### Cloudflare Pages
- **Base Path**: `/` (root, automatically configured)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**: Configure in Cloudflare Pages dashboard

### Local Development
- **Base Path**: `/` (root)
- No VITE_BASE_URL needed
- Copy `.env.example` to `.env.local` and configure variables

**Note**: The `VITE_BASE_URL` environment variable controls the base path for static assets. The Vite config (vite.config.ts) automatically selects the appropriate base path based on the deployment platform or environment variable.

## Data Migration

On first run, app automatically:
1. Checks for legacy LocalStorage data
2. Creates backup to IndexedDB
3. Migrates to SQLite schema
4. Clears old LocalStorage entries

Manual rollback available via `src/migration/rollback.ts`.

## TypeScript Best Practices

This project follows strict TypeScript conventions based on 2025 best practices. The `tsconfig.app.json` enables strict mode with comprehensive type checking.

### Strict Mode Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  }
}
```

### Core Principles

1. **Never use `any`** - Use `unknown` when type is uncertain:
   ```typescript
   // ❌ Bad
   function process(data: any) { ... }

   // ✅ Good
   function process(data: unknown) {
     if (typeof data === 'string') {
       // Now data is narrowed to string
     }
   }
   ```

2. **Prefer interfaces for object shapes** - Types for unions/utility types:
   ```typescript
   // ✅ Use interface for object shapes (can be extended)
   interface Player {
     id: string;
     name: string;
   }

   // ✅ Use type for unions, computed types
   type BasketballPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';
   type PlayerWithSkills = Player & BasketballSkills;

   // ✅ Can extend interfaces
   interface ProPlayer extends Player {
     yearsOfExperience: number;
   }
   ```

3. **Leverage type inference** - Don't over-annotate:
   ```typescript
   // ❌ Redundant
   const players: Player[] = await playerRepository.findAll();

   // ✅ Inferred from return type
   const players = await playerRepository.findAll();
   ```

4. **Use `readonly` for immutable properties**:
   ```typescript
   interface Config {
     readonly mode: 'hybrid' | 'supabase' | 'sqlite';
     readonly syncInterval: number;
   }
   ```

5. **Discriminated unions for type safety**:
   ```typescript
   type Result<T, E> =
     | { success: true; data: T }
     | { success: false; error: E };

   function handleResult<T, E>(result: Result<T, E>) {
     if (result.success) {
       // TypeScript knows result.data exists here
       console.log(result.data);
     } else {
       // TypeScript knows result.error exists here
       console.error(result.error);
     }
   }
   ```

6. **Type guards for runtime validation**:
   ```typescript
   function isPlayer(value: unknown): value is Player {
     return (
       typeof value === 'object' &&
       value !== null &&
       'id' in value &&
       typeof value.id === 'string'
     );
   }

   if (isPlayer(data)) {
     // data is now typed as Player
   }
   ```

### React-Specific TypeScript

1. **Component props** - Use interfaces, spread native attributes:
   ```typescript
   // ✅ Good
   export interface ButtonProps
     extends React.ButtonHTMLAttributes<HTMLButtonElement> {
     variant?: 'default' | 'destructive';
     size?: 'sm' | 'md' | 'lg';
   }

   export function Button({ className, variant, ...props }: ButtonProps) {
     return <button className={cn(...)} {...props} />
   }
   ```

2. **forwardRef with proper types**:
   ```typescript
   export const Input = React.forwardRef<
     HTMLInputElement,
     React.ComponentPropsWithoutRef<'input'>
   >(({ className, type, ...props }, ref) => {
     return <input ref={ref} type={type} className={cn(...)} {...props} />
   })
   Input.displayName = 'Input'
   ```

3. **Generic components**:
   ```typescript
   interface TableProps<T> {
     data: T[];
     columns: Column<T>[];
   }

   export function Table<T>({ data, columns }: TableProps<T>) {
     // T is available throughout component
   }
   ```

4. **Event handlers** - Type the event, not just `any`:
   ```typescript
   // ✅ Good
   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     setValue(e.target.value);
   };

   // ✅ Or use React.FormEvent for forms
   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
     e.preventDefault();
   };
   ```

### Async/Await Patterns

```typescript
// ✅ Explicit Promise return type for public APIs
export async function findAll(): Promise<Player[]> {
  // Implementation
}

// ✅ Use async/await consistently, avoid .then() chains
const loadData = async () => {
  const players = await playerRepository.findAll();
  const groups = await groupingRepository.getRecent();
  return { players, groups };
};
```

### Error Handling Types

```typescript
// ✅ Use discriminated unions for error states
type AsyncResult<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

// Usage
if (result.status === 'success') {
  // TypeScript narrows to success type
  console.log(result.data);
}
```

### Import/Export Best Practices

```typescript
// ✅ Use named exports for functions/components
export function calculateOverall() { ... }
export const CONSTANT = 'value';

// ✅ Use default export only for main entry points
export default App;

// ✅ Type-only imports when only types needed
import type { Player, BasketballPosition } from '@/types';
```

## Important Notes

- **Supabase is required**: Player data is stored in Supabase; the app requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to function
- **Supabase forced for players**: The repository factory forces Supabase for player data (not hybrid/SQLite)
- **Type safety**: Strict TypeScript enabled; no implicit any
- **Test exclusions**: `tsconfig.json` excludes `src/**/__tests__`, `src/test`, `src/examples`, `docs`, and test files
- **React 19**: Using latest React with concurrent features
- **Component library**: shadcn/ui components are copied to project, not installed via npm
- **CSS**: Tailwind v4 with Vite plugin - no tailwind.config.js needed for most cases
- **React Router**: App uses `react-router-dom` for navigation, not tab-based navigation
- **AI Features**: Chat, skill suggestions, and grouping optimization require `VITE_ARK_API_KEY`
- **Web Search**: Chat web search requires `VITE_BRAVE_SEARCH_API_KEY`
- **Path Alias**: Use `@/` for imports from `src/` directory (configured in tsconfig and vitest)
- **Testing**: Vitest with jsdom environment; setup file at `src/test/setup.ts`
