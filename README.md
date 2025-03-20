# CockroachDB Simulator

An interactive visualization tool for demonstrating how CockroachDB handles replica placement, node failures, and region outages in a distributed database system.

## Features

- **Multi-Region Architecture**: Visualize how CockroachDB distributes data across multiple geographic regions.
- **Fault Tolerance**: See how the system automatically recovers from node and region failures.
- **Load Balancing**: Demonstrates intelligent replica placement for balanced load across nodes.
- **Interactive Controls**: Toggle node and region status with a click.
- **Animated Migrations**: Watch replicas move when failures occur with animated visualizations.
- **Configurable Parameters**: Adjust region count, node count, and replication factor.

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Usage

1. **View the Cluster Map**: Shows regions, availability zones, and nodes with their replicas.
2. **Click on a Node**: Toggle a node between online and offline state to see how replicas migrate.
3. **Click on a Region**: Toggle all nodes in a region to simulate a regional outage.
4. **Hover over Replicas**: Highlights all copies of the same range across the cluster.
5. **View Load Distribution**: Notice the heatmap coloring on nodes showing replica load.

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS for styling
- Framer Motion for animations

## Development

```bash
# Run ESLint
npm run lint

# Run type checking
npm run typecheck
```

## License

MIT