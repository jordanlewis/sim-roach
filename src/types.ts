// Node represents a CockroachDB node in the cluster
export interface Node {
  id: string;
  region: string;
  zone: string;
  status: 'online' | 'offline';
}

// Range represents a data range in CockroachDB
export interface Range {
  id: string;
  replicas: string[]; // Array of node IDs
  leaseholder: string; // Node ID of the leaseholder
  load: number; // Requests per second
}
