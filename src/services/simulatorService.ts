import { Node, Range } from '../types';
import { SimulatorConfig } from '../components/ControlPanel';

// Default configuration
export const DEFAULT_CONFIG: SimulatorConfig = {
  regionCount: 3,
  replicationFactor: 3,
  nodeCount: 6,
  rangeCount: 3
};

// Available regions and zones
const availableRegions = [
  { name: 'us-east', zones: ['a', 'b', 'c'] },
  { name: 'us-west', zones: ['a', 'b', 'c'] },
  { name: 'eu-west', zones: ['a', 'b', 'c'] },
  { name: 'eu-central', zones: ['a', 'b', 'c'] },
  { name: 'ap-southeast', zones: ['a', 'b', 'c'] },
  { name: 'ap-northeast', zones: ['a', 'b', 'c'] },
  { name: 'sa-east', zones: ['a', 'b', 'c'] },
  { name: 'af-south', zones: ['a', 'b', 'c'] },
  { name: 'au-southeast', zones: ['a', 'b', 'c'] },
  { name: 'ca-central', zones: ['a', 'b', 'c'] },
];

// Helper functions
const getRandomElement = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Main simulator service
export class SimulatorService {
  private nodes: Node[] = [];
  private ranges: Range[] = [];
  private nextNodeId = 1;
  private nextRangeId = 1;
  private config: SimulatorConfig = DEFAULT_CONFIG;
  private selectedRegions: typeof availableRegions = [];
  
  constructor(config: SimulatorConfig = DEFAULT_CONFIG) {
    this.config = config;
    this.initializeCluster();
  }
  
  private initializeCluster() {
    // Reset state
    this.nodes = [];
    this.ranges = [];
    this.nextNodeId = 1;
    this.nextRangeId = 1;
    
    // Select regions based on config
    this.selectedRegions = this.selectRandomRegions(this.config.regionCount);
    
    // Create nodes
    this.createInitialNodes();
    
    // Create ranges
    this.createInitialRanges();
  }
  
  private selectRandomRegions(count: number) {
    // Shuffle regions and take the first 'count' items
    return [...availableRegions]
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.min(count, availableRegions.length));
  }
  
  private createInitialNodes() {
    // Distribute nodes evenly across regions and zones
    const targetNodesPerRegion = Math.ceil(this.config.nodeCount / this.selectedRegions.length);
    
    let nodeId = 1;
    this.selectedRegions.forEach(region => {
      const nodesForThisRegion = (nodeId + targetNodesPerRegion <= this.config.nodeCount + 1) 
        ? targetNodesPerRegion 
        : Math.max(0, this.config.nodeCount - nodeId + 1);
      
      // Distribute across zones
      for (let i = 0; i < nodesForThisRegion; i++) {
        const zoneIndex = i % region.zones.length;
        this.nodes.push({
          id: `n${nodeId}`,
          region: region.name,
          zone: region.zones[zoneIndex],
          status: 'online'
        });
        nodeId++;
      }
    });
    
    this.nextNodeId = nodeId;
  }
  
  private createInitialRanges() {
    for (let i = 1; i <= this.config.rangeCount; i++) {
      this.addRange();
    }
  }
  
  // Configuration methods
  updateConfig(newConfig: SimulatorConfig) {
    this.config = newConfig;
    this.initializeCluster();
    return {
      nodes: this.getNodes(),
      ranges: this.getRanges()
    };
  }
  
  getConfig(): SimulatorConfig {
    return { ...this.config };
  }
  
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
    
    // If node went offline, migrate leaseholders and replicas away from it
    if (newStatus === 'offline') {
      this.migrateLeaseholdersFromOfflineNode(nodeId);
    } else {
      // If node came back online, try to rebalance some replicas to it
      this.rebalanceToOnlineNode(nodeId);
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
    const replicationFactor = this.config.replicationFactor;
    
    if (onlineNodes.length < replicationFactor) {
      throw new Error(`Not enough online nodes to create a new range. Need at least ${replicationFactor} nodes.`);
    }
    
    // Try to distribute replicas across regions for better availability
    const selectedNodes: Node[] = [];
    const regionsUsed = new Set<string>();
    const shuffledNodes = [...onlineNodes].sort(() => 0.5 - Math.random());
    
    // First pass: try to select one node per region
    for (const node of shuffledNodes) {
      if (!regionsUsed.has(node.region)) {
        selectedNodes.push(node);
        regionsUsed.add(node.region);
      }
      
      if (selectedNodes.length === replicationFactor) break;
    }
    
    // Second pass: if we couldn't get enough regions, add more nodes from any region
    if (selectedNodes.length < replicationFactor) {
      const remainingNodes = shuffledNodes.filter(node => !selectedNodes.includes(node));
      selectedNodes.push(...remainingNodes.slice(0, replicationFactor - selectedNodes.length));
    }
    
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
  
  // Rebalance replicas to a node that has come back online
  private rebalanceToOnlineNode(nodeId: string): void {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node || node.status !== 'online') return;
    
    // Try to rebalance some replicas to the newly online node
    // Prioritize ranges that have fewer than 3 replicas due to node failures
    const underReplicatedRanges = this.ranges.filter(range => 
      // Find ranges with fewer than 3 live replicas
      range.replicas.filter(replicaId => {
        const replicaNode = this.nodes.find(n => n.id === replicaId);
        return replicaNode && replicaNode.status === 'online';
      }).length < 3
    );
    
    // Rebalance under-replicated ranges first
    underReplicatedRanges.forEach((range, index) => {
      const onlineReplicas = range.replicas.filter(replicaId => {
        const replicaNode = this.nodes.find(n => n.id === replicaId);
        return replicaNode && replicaNode.status === 'online';
      });
      
      // If the range already contains this node as a replica, skip
      if (range.replicas.includes(nodeId)) return;
      
      // If the range has fewer than 3 online replicas, add this node
      if (onlineReplicas.length < 3) {
        // Keep the online replicas and add the new node
        const newReplicas = [...onlineReplicas, nodeId];
        
        // If necessary, fill to 3 replicas by keeping some offline replicas
        if (newReplicas.length < 3) {
          const offlineReplicas = range.replicas.filter(replicaId => !onlineReplicas.includes(replicaId));
          newReplicas.push(...offlineReplicas.slice(0, 3 - newReplicas.length));
        }
        
        // Update range replicas
        this.ranges[this.ranges.indexOf(range)] = {
          ...range,
          replicas: newReplicas,
          // If there was no online leaseholder, make the new node the leaseholder
          leaseholder: onlineReplicas.includes(range.leaseholder) ? range.leaseholder : nodeId
        };
      }
    });
    
    // If we didn't rebalance any under-replicated ranges,
    // try to rebalance some regular ranges to improve data distribution
    if (underReplicatedRanges.length === 0) {
      // Randomly select a few ranges to rebalance
      const rangesToRebalance = this.ranges
        .filter(range => !range.replicas.includes(nodeId))
        .sort(() => 0.5 - Math.random())
        .slice(0, 2); // Only rebalance a couple ranges at a time
        
      rangesToRebalance.forEach(range => {
        // Find the regions represented in this range
        const regionCounts: Record<string, number> = {};
        range.replicas.forEach(replicaId => {
          const replicaNode = this.nodes.find(n => n.id === replicaId);
          if (replicaNode) {
            regionCounts[replicaNode.region] = (regionCounts[replicaNode.region] || 0) + 1;
          }
        });
        
        // If the new node is in a region that's underrepresented, replace a replica
        if (regionCounts[node.region] === undefined || regionCounts[node.region] < Math.max(...Object.values(regionCounts))) {
          // Find a replica to replace - prefer one from an overrepresented region
          const overrepresentedRegion = Object.entries(regionCounts)
            .sort((a, b) => b[1] - a[1]) // Sort by count descending
            .find(([region, count]) => count > 1)?.[0];
            
          if (overrepresentedRegion) {
            // Find a replica from the overrepresented region to replace
            const replicaToReplace = range.replicas.find(replicaId => {
              const replicaNode = this.nodes.find(n => n.id === replicaId);
              return replicaNode && replicaNode.region === overrepresentedRegion;
            });
            
            if (replicaToReplace) {
              // Replace the replica
              const newReplicas = range.replicas.map(replicaId => 
                replicaId === replicaToReplace ? nodeId : replicaId
              );
              
              this.ranges[this.ranges.indexOf(range)] = {
                ...range,
                replicas: newReplicas,
                // If we replaced the leaseholder, update it
                leaseholder: range.leaseholder === replicaToReplace ? nodeId : range.leaseholder
              };
            }
          }
        }
      });
    }
  }
}
