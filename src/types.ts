// Node represents a CockroachDB node in the cluster
export interface Node {
  id: string;
  region: string;
  zone: string;
  status: 'online' | 'offline';
}

// ReplicaMovement tracks a replica that moved from one node to another
export interface ReplicaMovement {
  rangeId: string;
  fromNodeId: string;
  toNodeId: string;
  isLeaseholder: boolean;
  timestamp: number;
}

// Range represents a data range in CockroachDB
export interface Range {
  id: string;
  replicas: string[]; // Array of node IDs
  leaseholder: string; // Node ID of the leaseholder
  load: number; // Requests per second
  // Optional field for tracking recent movements of this range's replicas
  recentMovements?: ReplicaMovement[];
}
