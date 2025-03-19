# CLAUDE.md - Collaboration Efficiency Guide

This file provides key information to help Claude work efficiently on the sim-roach project. Information stored here will be automatically included in Claude's context when working in this repository.

## Project Overview
Sim-roach is a CockroachDB simulator that visualizes resilience, scalability, and locality features of a distributed database system. Users can interact with nodes, ranges, and regions to explore how the system handles failures and rebalances data.

## Common Commands

### Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Linting and Type Checking
```bash
# Run ESLint
npm run lint

# Type check
npm run typecheck
```

## Code Style Preferences
- Use TypeScript with proper type annotations
- Follow React functional component patterns with hooks
- Use named exports for components and types
- Prefer destructuring for props
- Use framer-motion for animations
- Use tailwind for styling

## Project Structure
- `src/components/` - React components
- `src/services/` - Business logic services
- `src/types.ts` - Type definitions
- `src/App.tsx` - Main application component

## Key Components
- `ClusterMap.tsx` - Visualizes the cluster with regions, zones, and nodes
- `RangePanel.tsx` - Shows range details and controls
- `ControlPanel.tsx` - Configuration controls for the simulator
- `simulatorService.ts` - Core simulation logic

## Features
- Multi-region, multi-zone cluster visualization
- Node failure simulation (click node to toggle status)
- Region failure simulation (click region name to toggle all nodes in region)
- Replica rebalancing when nodes go offline
- Range visualization with leaseholder highlighting
- Hot range marking

## Important Notes
- Keep this file updated as the project evolves
- Add new commands, components, or code patterns as they emerge
- Update features list when new features are added

## Recently Implemented Features
- Region failure capability: Click a region name to toggle all nodes in that region between online and offline states