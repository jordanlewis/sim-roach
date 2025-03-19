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
  
  // Add a new range with intelligent replica placement
  addRange(): Range {
    const onlineNodes = this.nodes.filter(node => node.status === 'online');
    const replicationFactor = this.config.replicationFactor;
    
    if (onlineNodes.length < replicationFactor) {
      throw new Error(`Not enough online nodes to create a new range. Need at least ${replicationFactor} nodes.`);
    }
    
    // Get the selected nodes using our replica placement algorithm
    const selectedNodes = this.selectNodesForReplicas(onlineNodes, replicationFactor);
    
    // Choose leaseholder - prefer node in most populated region
    const regionCounts: Record<string, number> = {};
    for (const node of this.nodes) {
      regionCounts[node.region] = (regionCounts[node.region] || 0) + 1;
    }
    
    // Sort selected nodes by region popularity (descending)
    const sortedForLeaseholder = [...selectedNodes].sort((a, b) => 
      regionCounts[b.region] - regionCounts[a.region]
    );
    
    const newRange: Range = {
      id: `r${this.nextRangeId}`,
      replicas: selectedNodes.map(node => node.id),
      leaseholder: sortedForLeaseholder[0].id,
      load: 10 // Start with low load
    };
    
    this.ranges.push(newRange);
    this.nextRangeId++;
    
    return newRange;
  }
  
  // Select nodes for replicas using advanced placement rules
  private selectNodesForReplicas(availableNodes: Node[], replicationFactor: number): Node[] {
    // 1. Classify nodes by region and zone
    const nodesByRegion: Record<string, Record<string, Node[]>> = {};
    const allRegions = new Set<string>();
    const allZones: Record<string, Set<string>> = {};
    
    for (const node of availableNodes) {
      allRegions.add(node.region);
      
      if (!allZones[node.region]) {
        allZones[node.region] = new Set<string>();
      }
      allZones[node.region].add(node.zone);
      
      if (!nodesByRegion[node.region]) {
        nodesByRegion[node.region] = {};
      }
      
      if (!nodesByRegion[node.region][node.zone]) {
        nodesByRegion[node.region][node.zone] = [];
      }
      
      nodesByRegion[node.region][node.zone].push(node);
    }
    
    const selectedNodes: Node[] = [];
    const usedRegions = new Set<string>();
    const usedZones = new Set<string>(); // Format: "region/zone"
    
    // 2. Maximum region diversity - select one node from each region
    if (allRegions.size >= replicationFactor) {
      // We have enough regions to place each replica in a different region
      const shuffledRegions = [...allRegions].sort(() => 0.5 - Math.random());
      
      for (const region of shuffledRegions.slice(0, replicationFactor)) {
        // For each region, select one zone at random
        const zonesInRegion = [...allZones[region]];
        const randomZone = zonesInRegion[Math.floor(Math.random() * zonesInRegion.length)];
        
        // Get a random node from this region/zone
        const nodesInZone = nodesByRegion[region][randomZone];
        const selectedNode = nodesInZone[Math.floor(Math.random() * nodesInZone.length)];
        
        selectedNodes.push(selectedNode);
        usedRegions.add(region);
        usedZones.add(`${region}/${randomZone}`);
        
        if (selectedNodes.length === replicationFactor) break;
      }
    } else {
      // 3. Not enough regions - maximize region diversity, then zone diversity
      
      // First, add one node from each available region
      for (const region of allRegions) {
        // Try to use different zones in each region
        const zonesInRegion = [...allZones[region]];
        let selectedZone = null;
        
        // Select a zone we haven't used yet if possible
        for (const zone of zonesInRegion) {
          if (!usedZones.has(`${region}/${zone}`)) {
            selectedZone = zone;
            break;
          }
        }
        
        // If all zones in this region are used, just pick one at random
        if (selectedZone === null) {
          selectedZone = zonesInRegion[Math.floor(Math.random() * zonesInRegion.length)];
        }
        
        // Get a random node from this region/zone
        const nodesInZone = nodesByRegion[region][selectedZone];
        const selectedNode = nodesInZone[Math.floor(Math.random() * nodesInZone.length)];
        
        selectedNodes.push(selectedNode);
        usedRegions.add(region);
        usedZones.add(`${region}/${selectedZone}`);
        
        if (selectedNodes.length === replicationFactor) break;
      }
      
      // 4. Still need more nodes - maximize zone diversity within used regions
      if (selectedNodes.length < replicationFactor) {
        // For each region, try to use all available zones before reusing
        const regionsToConsider = [...usedRegions].sort(() => 0.5 - Math.random());
        
        for (const region of regionsToConsider) {
          const zonesInRegion = [...allZones[region]];
          
          // Find zones not yet used in this region
          for (const zone of zonesInRegion) {
            if (!usedZones.has(`${region}/${zone}`)) {
              const nodesInZone = nodesByRegion[region][zone];
              if (nodesInZone.length > 0) {
                const selectedNode = nodesInZone[Math.floor(Math.random() * nodesInZone.length)];
                
                selectedNodes.push(selectedNode);
                usedZones.add(`${region}/${zone}`);
                
                if (selectedNodes.length === replicationFactor) break;
              }
            }
          }
          
          if (selectedNodes.length === replicationFactor) break;
        }
      }
      
      // 5. Last resort - just add nodes from any region/zone
      if (selectedNodes.length < replicationFactor) {
        // Filter out nodes we've already selected
        const remainingNodes = availableNodes.filter(node => 
          !selectedNodes.some(selected => selected.id === node.id)
        );
        
        // Randomly select from remaining nodes
        const shuffledRemaining = [...remainingNodes].sort(() => 0.5 - Math.random());
        selectedNodes.push(
          ...shuffledRemaining.slice(0, replicationFactor - selectedNodes.length)
        );
      }
    }
    
    return selectedNodes;
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
    // Get the offline node
    const offlineNode = this.nodes.find(node => node.id === nodeId);
    if (!offlineNode) return;
    
    // Process each range that has a replica on the offline node
    this.ranges.forEach((range, index) => {
      // Check if this range has a replica on the offline node
      if (range.replicas.includes(nodeId)) {
        // Make a copy of the current replicas
        const currentReplicas = [...range.replicas];
        let newLeaseholder = range.leaseholder;
        let leaseholderChanged = false;
        
        // Initialize or ensure the recentMovements array exists
        let updatedMovements = range.recentMovements || [];
        
        // 1. Handle leaseholder migration if needed
        if (range.leaseholder === nodeId) {
          // Find all online replicas for this range
          const onlineReplicaIds = currentReplicas.filter(replicaId => {
            if (replicaId === nodeId) return false;
            const node = this.nodes.find(n => n.id === replicaId);
            return node && node.status === 'online';
          });
          
          if (onlineReplicaIds.length > 0) {
            // Find replicas in different regions
            const replicaNodes = onlineReplicaIds.map(id => 
              this.nodes.find(n => n.id === id)
            ).filter((node): node is Node => !!node);
            
            // Prioritize replicas in different regions from the failed node
            const differentRegionReplicas = replicaNodes.filter(node => 
              node.region !== offlineNode.region
            );
            
            if (differentRegionReplicas.length > 0) {
              // Choose a replica from a different region as the new leaseholder
              newLeaseholder = differentRegionReplicas[0].id;
              leaseholderChanged = true;
            } else if (replicaNodes.length > 0) {
              // Fall back to any online replica
              newLeaseholder = replicaNodes[0].id;
              leaseholderChanged = true;
            }
            
            // Record leaseholder movement
            if (leaseholderChanged) {
              updatedMovements = this.recordReplicaMovement(
                range.id,
                nodeId,
                newLeaseholder,
                true,
                updatedMovements
              );
            }
          }
        }
        
        // 2. Find a replacement node for the replica
        // Get all online nodes that aren't already replicas for this range
        const availableReplaceNodes = this.nodes.filter(node => 
          node.status === 'online' && !currentReplicas.includes(node.id)
        );
        
        if (availableReplaceNodes.length > 0) {
          // Get the regions and zones of existing replicas
          const existingReplicaNodes = currentReplicas
            .filter(id => id !== nodeId)
            .map(id => this.nodes.find(n => n.id === id))
            .filter((node): node is Node => !!node);
          
          const existingRegions = new Set(existingReplicaNodes.map(node => node.region));
          const existingZones = new Set(existingReplicaNodes.map(node => `${node.region}/${node.zone}`));
          
          // Try to find an optimal replacement node
          let replacementNode: Node | undefined;
          
          // First, try to find a node in a region we don't already have
          const nodesInNewRegions = availableReplaceNodes.filter(node => 
            !existingRegions.has(node.region)
          );
          
          if (nodesInNewRegions.length > 0) {
            replacementNode = nodesInNewRegions[0];
          } else {
            // Next, try to find a node in a zone we don't already have
            const nodesInNewZones = availableReplaceNodes.filter(node => 
              !existingZones.has(`${node.region}/${node.zone}`)
            );
            
            if (nodesInNewZones.length > 0) {
              replacementNode = nodesInNewZones[0];
            } else {
              // Finally, just use any available node
              replacementNode = availableReplaceNodes[0];
            }
          }
          
          if (replacementNode) {
            // Create new replicas list with the replacement
            const newReplicas = currentReplicas.map(replicaId => 
              replicaId === nodeId ? replacementNode!.id : replicaId
            );
            
            // Record replica movement using our helper method
            updatedMovements = this.recordReplicaMovement(
              range.id,
              nodeId,
              replacementNode.id,
              false,
              updatedMovements
            );
            
            // Update the range
            this.ranges[index] = {
              ...range,
              replicas: newReplicas,
              leaseholder: newLeaseholder,
              recentMovements: updatedMovements
            };
          }
        } else {
          // No replacement nodes available, but still update leaseholder if needed
          if (range.leaseholder === nodeId && newLeaseholder !== nodeId) {
            this.ranges[index] = {
              ...range,
              leaseholder: newLeaseholder,
              recentMovements: updatedMovements
            };
          }
        }
      }
    });
  }
  
  private rebalanceReplicas(): void {
    // More sophisticated replica rebalancing when a new node is added
    const newNode = this.nodes[this.nodes.length - 1];
    if (newNode.status !== 'online') return;
    
    // Calculate current replica distribution by node
    const replicaCounts = new Map<string, number>();
    this.nodes.forEach(node => {
      replicaCounts.set(node.id, 0);
    });
    
    this.ranges.forEach(range => {
      range.replicas.forEach(nodeId => {
        const current = replicaCounts.get(nodeId) || 0;
        replicaCounts.set(nodeId, current + 1);
      });
    });
    
    // Set an initial count for the new node
    replicaCounts.set(newNode.id, 0);
    
    // Helper to find the node with the most replicas in a given list
    const getNodeWithMostReplicas = (nodeIds: string[]): string | null => {
      let maxCount = -1;
      let nodeWithMax: string | null = null;
      
      for (const nodeId of nodeIds) {
        const count = replicaCounts.get(nodeId) || 0;
        if (count > maxCount) {
          maxCount = count;
          nodeWithMax = nodeId;
        }
      }
      
      return nodeWithMax;
    };
    
    // Identify ranges that would benefit from rebalancing
    // We want to prioritize:
    // 1. Ranges that have multiple replicas in the same region
    // 2. Ranges with replicas on nodes that have many replicas
    const rangesToRebalance: { rangeIndex: number, nodeToReplace: string }[] = [];
    
    this.ranges.forEach((range, rangeIndex) => {
      // Check if any optimizations are possible
      const replicaNodes = range.replicas
        .map(id => this.nodes.find(n => n.id === id))
        .filter((node): node is Node => !!node);
      
      // Check for replicas in the same region
      const regionsCount: Record<string, string[]> = {};
      
      replicaNodes.forEach(node => {
        if (!regionsCount[node.region]) {
          regionsCount[node.region] = [];
        }
        regionsCount[node.region].push(node.id);
      });
      
      // Find regions with more than one replica
      for (const [region, nodeIds] of Object.entries(regionsCount)) {
        if (nodeIds.length > 1) {
          // Region has multiple replicas - replace one with our new node
          // if the new node is in a different region
          if (newNode.region !== region) {
            const nodeToReplace = getNodeWithMostReplicas(nodeIds);
            if (nodeToReplace) {
              rangesToRebalance.push({ rangeIndex, nodeToReplace });
              break; // Only one replacement per range
            }
          }
        }
      }
      
      // If we didn't find regions with multiple replicas
      if (rangesToRebalance.length <= rangeIndex) {
        // Just pick the node with the most replicas
        const nodeToReplace = getNodeWithMostReplicas(range.replicas);
        if (nodeToReplace) {
          rangesToRebalance.push({ rangeIndex, nodeToReplace });
        }
      }
    });
    
    // Limit the number of ranges to rebalance at once
    const maxRangesToRebalance = Math.min(3, Math.ceil(this.ranges.length / 4));
    const selectedRanges = rangesToRebalance
      .sort(() => 0.5 - Math.random()) // Shuffle
      .slice(0, maxRangesToRebalance);
    
    // Perform rebalancing
    selectedRanges.forEach(({ rangeIndex, nodeToReplace }) => {
      const range = this.ranges[rangeIndex];
      const newReplicas = range.replicas.map(replicaId => 
        replicaId === nodeToReplace ? newNode.id : replicaId
      );
      
      // Update replica count tracking
      const oldCount = replicaCounts.get(nodeToReplace) || 0;
      replicaCounts.set(nodeToReplace, oldCount - 1);
      
      const newCount = replicaCounts.get(newNode.id) || 0;
      replicaCounts.set(newNode.id, newCount + 1);
      
      this.ranges[rangeIndex] = {
        ...range,
        replicas: newReplicas,
        // If we replaced the leaseholder, update it
        leaseholder: range.leaseholder === nodeToReplace
          ? newNode.id 
          : range.leaseholder
      };
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
  
  // Helper method to track replica movements
  private recordReplicaMovement(
    rangeId: string, 
    fromNodeId: string, 
    toNodeId: string, 
    isLeaseholder: boolean,
    currentMovements: ReplicaMovement[] = []
  ): ReplicaMovement[] {
    const movements = [...currentMovements];
    
    // Record the movement
    movements.push({
      rangeId,
      fromNodeId,
      toNodeId,
      isLeaseholder,
      timestamp: Date.now()
    });
    
    // Limit the number of movements we track to prevent memory issues
    return movements.slice(-10);
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
        
        // Find which node we're replacing - all nodes in original replicas
        // that aren't in the new replicas list are being replaced
        const replacedNodeIds = range.replicas.filter(id => 
          !newReplicas.includes(id)
        );
        
        // If we can identify which node's replica is being replaced
        const recentMovements = range.recentMovements || [];
        let updatedMovements = [...recentMovements];
        
        // Record movements for all nodes being replaced
        for (const replacedNodeId of replacedNodeIds) {
          // Make sure we're not recording movements for nodes that were already
          // removed from the replica set due to network partitioning rather than
          // actual replacement
          const isRealReplacement = replacedNodeId !== nodeId;
          
          if (isRealReplacement) {
            updatedMovements = this.recordReplicaMovement(
              range.id, 
              replacedNodeId, 
              nodeId, 
              false,
              updatedMovements
            );
          }
        }
        
        // Check if leaseholder is changing
        const oldLeaseholder = range.leaseholder;
        const newLeaseholder = onlineReplicas.includes(oldLeaseholder) ? oldLeaseholder : nodeId;
        
        // Record leaseholder movement if it's changing
        if (oldLeaseholder !== newLeaseholder) {
          updatedMovements = this.recordReplicaMovement(
            range.id,
            oldLeaseholder,
            newLeaseholder,
            true,
            updatedMovements
          );
        }
        
        // Update range replicas
        this.ranges[this.ranges.indexOf(range)] = {
          ...range,
          replicas: newReplicas,
          leaseholder: newLeaseholder,
          recentMovements: updatedMovements
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
              
              // Get current movements and record this movement
              const recentMovements = range.recentMovements || [];
              let updatedMovements = this.recordReplicaMovement(
                range.id,
                replicaToReplace,
                nodeId,
                false,
                recentMovements
              );
              
              // Check if leaseholder is changing
              const isLeaseholderChanging = range.leaseholder === replicaToReplace;
              if (isLeaseholderChanging) {
                updatedMovements = this.recordReplicaMovement(
                  range.id,
                  replicaToReplace,
                  nodeId,
                  true,
                  updatedMovements
                );
              }
              
              // Update the range
              this.ranges[this.ranges.indexOf(range)] = {
                ...range,
                replicas: newReplicas,
                leaseholder: isLeaseholderChanging ? nodeId : range.leaseholder,
                recentMovements: updatedMovements
              };
            }
          }
        }
      });
    }
  }

  // Toggle all nodes in a region between online and offline
  toggleRegionStatus(regionName: string): void {
    // Get all nodes in the region
    const regionNodes = this.nodes.filter(node => node.region === regionName);
    
    // Get the current status of the region (considering it offline if any node is offline)
    const isRegionOffline = regionNodes.some(node => node.status === 'offline');
    
    // Toggle all nodes in the region to the opposite status
    const newStatus: 'online' | 'offline' = isRegionOffline ? 'online' : 'offline';
    
    // Update each node's status
    regionNodes.forEach(node => {
      const nodeIndex = this.nodes.findIndex(n => n.id === node.id);
      if (nodeIndex !== -1) {
        this.nodes[nodeIndex] = {
          ...this.nodes[nodeIndex],
          status: newStatus
        };
      }
    });
    
    // Process the state change for each node individually
    // This ensures consistent animation handling whether toggling individual nodes
    // or toggling entire regions
    if (newStatus === 'offline') {
      // If region is being marked as offline, migrate leaseholders and replicas
      regionNodes.forEach(node => {
        this.migrateLeaseholdersFromOfflineNode(node.id);
      });
    } else {
      // If region is coming back online, rebalance to it
      regionNodes.forEach(node => {
        this.rebalanceToOnlineNode(node.id);
      });
    }
  }
}
