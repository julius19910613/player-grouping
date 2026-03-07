# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev              # Start dev server (localhost:5173)
npm run build            # Build for production (tsc + vite)
npm run preview          # Preview production build
npm run lint             # Run ESLint

# Testing
npm test                 # Run all tests
npm run test:coverage    # Generate coverage report (v8 provider)
npm run test:watch       # Run tests in watch mode

# Deployment
npm run deploy           # Build and deploy to GitHub Pages

# Utilities
npm run backup           # Backup LocalStorage via tsx script
```

**Running specific tests:** Use `npm test -- <pattern>` to run tests matching a pattern. For example: `npm test -- grouping` runs only tests containing "grouping".

## Architecture Overview

This is a React 19 + TypeScript + Vite application for basketball player grouping. The architecture follows a **Repository pattern** with hybrid local/cloud storage.

### Data Layer Architecture

The app uses a three-tier data storage system with automatic fallback:

1. **Primary**: SQLite (sql.js WebAssembly) with IndexedDB persistence
2. **Fallback**: LocalStorage (when SQLite fails)
3. **Cloud**: Supabase (optional, requires env vars)

**Repository Pattern:**
- `PlayerRepository` / `HybridPlayerRepository` / `SupabasePlayerRepository`
- `GroupingRepository` / `HybridGroupingRepository` / `SupabaseGroupingRepository`
- Factory pattern via `createPlayerRepository('hybrid'|'supabase'|'sqlite')`

**Hybrid Repository Behavior:**
- Network available: Read from Supabase, update local SQLite cache
- Network unavailable: Fallback to SQLite, queue writes for sync
- Automatic sync when network recovers
- Conflict resolution: `latest_wins` strategy (configurable)

### Key Services

| Service | Location | Purpose |
|---------|----------|---------|
| `DatabaseService` | `src/services/database.ts` | SQLite + IndexedDB + LocalStorage management with debounced saves |
| `AuthService` | `src/lib/auth.ts` | Anonymous auth for Supabase |
| `NetworkStatusService` | `src/lib/network-status.ts` | Online/offline detection |

### Database Schema

**SQLite tables:**
- `players` - Basic player info (id, name, position, timestamps)
- `player_skills` - 19 skill ratings (1-99) plus auto-calculated overall
- `grouping_history` - Team groupings with JSON data payload

**Supabase tables** (when configured): Same schema with RLS policies

## Type System

**Core Types** (`src/types/`):
- `Player` - Complete player record with skills
- `BasketballPosition` - PG/SG/SF/PF/C/UTILITY
- `BasketballSkills` - 19 skill fields (2pt/3pt/FT, passing, defense, rebounds, physical, IQ, etc.)
- `BasketballTeam`, `BasketballTeamStats` - Team/grouping results

**Path alias**: Use `@/` for imports from `src/` directory (configured in both tsconfig and vitest.config).

## Grouping Algorithm

Located in `src/utils/basketballGroupingAlgorithm.ts`:
- `groupFor5v5()` - Standard 5v5 with position balancing
- `groupFor3v3()` - 3v3 mode with combined position groups
- `calculateBalanceScore()` - Returns standard deviation of team scores
- `getTeamStats()` - Aggregates team-level statistics

Algorithm uses snake draft pattern with position requirements and iteratively swaps players to minimize team rating differences (<10 points = balanced).

## Component Organization

**Main entry**: `src/App.tsx` - Tab-based navigation (players/grouping/games)

**Key component patterns:**
- Forms use `react-hook-form` + `zod` validation
- UI components from `shadcn/ui` (Radix UI primitives)
- SAP Fiori-inspired `ShellBar` for navigation
- Dialog-based workflows (Add Player, Import Wizard, etc.)

**Testing**: Component tests use `@testing-library/react`. Setup file at `src/test/setup.ts` extends Vitest with jest-dom matchers.

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
- Form: `input`, `select`, `checkbox`, `slider`, `label`
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
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

If not configured, app automatically uses local SQLite/LocalStorage.

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

- **SQLite initialization** is async - components must handle loading states
- **Debounced saves**: Database writes are debounced by 1 second for performance
- **Type safety**: Strict TypeScript enabled; no implicit any
- **Test exclusions**: `tsconfig.app.json` excludes `src/**/__tests__`, `src/test`, `src/examples`
- **React 19**: Using latest React with concurrent features
- **Component library**: shadcn/ui components are copied to project, not installed via npm
- **CSS**: Tailwind v4 with Vite plugin - no tailwind.config.js needed for most cases
