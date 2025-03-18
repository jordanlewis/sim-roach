import { Node, Range } from '../types';

// Initial data for the simulator
const initialNodes: Node[] = [
  { id: 'n1', region: 'us-east', zone: 'a', status: 'online' },
  { id: 'n2', region: 'us-east', zone: 'b', status: 'online' },
  { id: 'n3', region: 'us-east', zone: 'c', status: 'online' },
  { id: 'n4', region: 'us-west', zone: 'a', status: 'online' },
  { id: 'n5', region: 'us-west', zone: 'b', status: 'online' },
  { id: 'n6', region: 'eu-west', zone: 'a', status: 'online' },
];

const initialRanges: Range[] = [
  { 
    id: 'r1', 
    replicas: ['n1', 'n4', 'n6'], 
    leaseholder: 'n1', 
    load: 20 
  },
  { 
    id: 'r2', 
    replicas: ['n2', 'n5', 'n6'], 
    leaseholder: 'n2', 
    load: 15 
  },
  { 
    id: 'r3', 
    replicas: ['n3', 'n4', 'n5'], 
    leaseholder: 'n3', 
    load: 30 
  },
];

// Helper functions
const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

const getRandomRegion = (): string => {
  const regions = ['us-east', 'us-west', 'eu-west'];
  return getRandomElement(regions);
};

const getRandomZone = (): string => {
  const zones = ['a', 'b', 'c'];
  return getRandomElement(zones);
};

// Main simulator service
export class SimulatorService {
  private nodes: Node[] = [...initialNodes];
  private ranges: Range[] = [...initialRanges];
  private nextNodeId = 7;
  private nextRangeId = 4;
  
  constructor() {}
  
  // Get all nodes
  getNodes(): Node[] {
    return [...this.nodes];
  }
  
  // Get all ranges
  getRanges(): Range[] {
    return [...this.ranges];
  }
  
  // Toggle node status (online/offline)
  toggleNodeStatus(nodeId: string): void {
    const nodeIndex = this.nodes.findIndex(node => node.id === nodeId);
    if (nodeIndex === -1) return;
    
    // Toggle the status
    const newStatus = this.nodes[nodeIndex].status === 'online' ? 'offline' : 'online';
    this.nodes[nodeIndex] = {
      ...this.nodes[nodeIndex],
      status: newStatus
    };
    
    // If node went offline, migrate leaseholders away from it
    if (newStatus === 'offline') {
      this.migrateLeaseholdersFromOfflineNode(nodeId);
    }
  }
  
  // Add a new node to the cluster
  addNode(): Node {
    const region = getRandomRegion();
    const zone = getRandomZone();
    const newNode: Node = {
      id: `n${this.nextNodeId}`,
      region,
      zone,
      status: 'online'
    };
    
    this.nodes.push(newNode);
    this.nextNodeId++;
    
    // Balance some replicas to the new node
    this.rebalanceReplicas();
    
    return newNode;
  }
  
  // Add a new range
  addRange(): Range {
    const onlineNodes = this.nodes.filter(node => node.status === 'online');
    
    if (onlineNodes.length < 3) {
      throw new Error('Not enough online nodes to create a new range.');
    }
    
    // Select three distinct nodes for replicas
    const shuffled = [...onlineNodes].sort(() => 0.5 - Math.random());
    const selectedNodes = shuffled.slice(0, 3);
    
    const newRange: Range = {
      id: `r${this.nextRangeId}`,
      replicas: selectedNodes.map(node => node.id),
      leaseholder: selectedNodes[0].id,
      load: 10 // Start with low load
    };
    
    this.ranges.push(newRange);
    this.nextRangeId++;
    
    return newRange;
  }
  
  // Mark a range as 'hot' (high load)
  markRangeHot(rangeId: string): void {
    const rangeIndex = this.ranges.findIndex(range => range.id === rangeId);
    if (rangeIndex === -1) return;
    
    // Increase the load
    this.ranges[rangeIndex] = {
      ...this.ranges[rangeIndex],
      load: 80 // High load
    };
    
    // Potentially move the leaseholder to balance load
    this.balanceHotRange(rangeId);
  }
  
  // Private helper methods
  private migrateLeaseholdersFromOfflineNode(nodeId: string): void {
    this.ranges.forEach((range, index) => {
      if (range.leaseholder === nodeId) {
        // Find online replicas for this range
        const onlineReplicas = range.replicas.filter(replicaId => {
          const node = this.nodes.find(n => n.id === replicaId);
          return node && node.status === 'online';
        });
        
        if (onlineReplicas.length > 0) {
          // Move leaseholder to an online replica
          this.ranges[index] = {
            ...range,
            leaseholder: onlineReplicas[0]
          };
        }
      }
      
      // If a replica is on the offline node, try to replace it
      if (range.replicas.includes(nodeId)) {
        const onlineNodes = this.nodes.filter(node => 
          node.status === 'online' && !range.replicas.includes(node.id)
        );
        
        if (onlineNodes.length > 0) {
          const newReplicas = range.replicas.map(replicaId => 
            replicaId === nodeId ? onlineNodes[0].id : replicaId
          );
          
          this.ranges[index] = {
            ...range,
            replicas: newReplicas,
            // If leaseholder was on the offline node, move it
            leaseholder: range.leaseholder === nodeId ? newReplicas[0] : range.leaseholder
          };
        }
      }
    });
  }
  
  private rebalanceReplicas(): void {
    // Very simple rebalancing logic
    // In a real implementation, this would be much more sophisticated
    const newNode = this.nodes[this.nodes.length - 1];
    
    // Move some replicas to the new node for better distribution
    this.ranges.forEach((range, index) => {
      // Only rebalance some ranges to avoid mass movement
      if (Math.random() > 0.7) {
        const replacedReplicaIndex = Math.floor(Math.random() * range.replicas.length);
        const newReplicas = [...range.replicas];
        newReplicas[replacedReplicaIndex] = newNode.id;
        
        this.ranges[index] = {
          ...range,
          replicas: newReplicas,
          // If we replaced the leaseholder, update it
          leaseholder: range.leaseholder === range.replicas[replacedReplicaIndex] 
            ? newNode.id 
            : range.leaseholder
        };
      }
    });
  }
  
  private balanceHotRange(rangeId: string): void {
    const rangeIndex = this.ranges.findIndex(range => range.id === rangeId);
    if (rangeIndex === -1) return;
    
    const range = this.ranges[rangeIndex];
    
    // Find all online nodes in replicas
    const onlineReplicaNodes = range.replicas
      .map(id => this.nodes.find(node => node.id === id))
      .filter((node): node is Node => !!node && node.status === 'online');
    
    if (onlineReplicaNodes.length <= 1) return;
    
    // If leaseholder is in a busy region, try to move it
    const currentLeaseholderNode = this.nodes.find(node => node.id === range.leaseholder);
    if (!currentLeaseholderNode) return;
    
    // Check load in the leaseholder's region
    const regionLoad = this.calculateRegionLoad(currentLeaseholderNode.region);
    
    if (regionLoad > 40) { // Arbitrary threshold
      // Find replica in least loaded region
      const replicasByRegionLoad = [...onlineReplicaNodes]
        .sort((a, b) => this.calculateRegionLoad(a.region) - this.calculateRegionLoad(b.region));
      
      if (replicasByRegionLoad[0].id !== range.leaseholder) {
        // Move leaseholder to the node in the least loaded region
        this.ranges[rangeIndex] = {
          ...range,
          leaseholder: replicasByRegionLoad[0].id
        };
      }
    }
  }
  
  private calculateRegionLoad(region: string): number {
    // Calculate total load in a region based on leaseholders
    let totalLoad = 0;
    
    this.ranges.forEach(range => {
      const leaseholderNode = this.nodes.find(node => node.id === range.leaseholder);
      if (leaseholderNode && leaseholderNode.region === region) {
        totalLoad += range.load;
      }
    });
    
    return totalLoad;
  }
}
