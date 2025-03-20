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
- Node load visualization with heatmap coloring
- Load balancing for replica placement
- Animated replica movements with path indicators

## Important Notes
- Keep this file updated as the project evolves
- Add new commands, components, or code patterns as they emerge
- Update features list when new features are added

## Workflow Preferences
- DO NOT commit or push changes without explicit confirmation
- Make code changes and wait for testing in the development environment
- Only commit and push when instructed to do so
- Run linting and type checking before submitting code for review

## Recently Implemented Features
- Node load visualization: Each node shows replica count with heatmap coloring (white = low, yellow = medium, orange = high)
- Load balancing: The simulator now balances replicas both by diversity across regions/zones and by node load
- Replica movement animations: Visual animations show replicas moving between nodes during failures and rebalancing
- Enhanced animation stability: Multi-phase cleanup and improved tracking prevent replicas from disappearing during animations
- Cross-region animation support: Replicas can now animate smoothly between regions
- Improved hover interactions: CSS-based hover effects with stable sizing to prevent layout shifts

## Key Implementation Details

### SimulatorService Core Methods
- `selectNodesForReplicas`: Places replicas with diversity and load balancing
- `migrateLeaseholdersFromOfflineNode`: Handles node failures and replica migration
- `rebalanceToOnlineNode`: Rebalances when nodes come back online
- `toggleRegionStatus`: Handles region-level failures
- `calculateNodeReplicaCounts`: Tracks load across the cluster

### Animation System
- Uses Framer Motion's layout animations for smooth replica movements
- Position-based layoutId approach for reliable animation tracking
- Multi-phase animation state management to prevent stuck animations
- CSS-based hover effects for performance and stability
- Key animation implementation in ClusterMap.tsx with these features:
  - Stable position-based IDs (`replica-${range.id}-${position}`)
  - Carefully tuned animation transitions for smooth movements
  - Cross-region animation support with `overflow: visible` containers
  - Comprehensive layoutDependency arrays for reliable rendering
  - Three-phase cleanup process with immediate cleanup, visual feedback, and verification
  - Safety mechanisms to recover from stuck animation states
  - Different transition settings for animating vs. static elements
  - Layout-shift-free hover interactions with absolute positioning and box-sizing

### Load Balancing
Replica placement follows these priorities:
1. Maximum region diversity (replicas in different regions)
2. Maximum zone diversity (replicas in different zones within regions)
3. Load balancing (nodes with fewest replicas preferred)

The `selectLeastLoadedNode` method is used to find optimal replacement nodes when failures occur.
