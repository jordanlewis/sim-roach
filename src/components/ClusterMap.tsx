import { motion, LayoutGroup } from 'framer-motion';
import { Node, Range, ReplicaMovement } from '../types';
import { useState, useEffect, useRef } from 'react';

interface ClusterMapProps {
  nodes: Node[];
  ranges: Range[];
  onNodeClick: (nodeId: string) => void;
  onRegionClick?: (regionName: string) => void;
}

export default function ClusterMap({ nodes, ranges, onNodeClick, onRegionClick }: ClusterMapProps) {
  // State to track highlighted range
  const [highlightedRangeId, setHighlightedRangeId] = useState<string | null>(null);
  // With Framer Motion layout animations, we no longer need to track node positions
  // State to track replica movements we're animating
  const [replicaMovements, setReplicaMovements] = useState<ReplicaMovement[]>([]);
  // Keep track of most recent timestamp to prevent re-animating the same movement
  const [lastMovementTimestamp, setLastMovementTimestamp] = useState<number>(0);
  // Track which replicas are currently animating to hide them in their original positions
  const [animatingReplicas, setAnimatingReplicas] = useState<Record<string, Set<string>>>({});

  // References to DOM elements for nodes
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Group nodes by region
  const regions = [...new Set(nodes.map(node => node.region))];

  // Get ranges for a specific node
  const getRangesForNode = (nodeId: string) => {
    return ranges.filter(range => range.replicas.includes(nodeId));
  };

  // Check if node is a leaseholder for a range
  const isLeaseholder = (nodeId: string, rangeId: string) => {
    const range = ranges.find(r => r.id === rangeId);
    return range ? range.leaseholder === nodeId : false;
  };

  // Find the range object by ID
  const getRangeById = (rangeId: string) => {
    return ranges.find(r => r.id === rangeId);
  };

  // Handle mouse enter on range
  const handleRangeMouseEnter = (rangeId: string) => {
    setHighlightedRangeId(rangeId);
  };

  // Handle mouse leave on range
  const handleRangeMouseLeave = () => {
    setHighlightedRangeId(null);
  };

  // Check if a range replica should be highlighted
  const isHighlighted = (rangeId: string) => {
    return highlightedRangeId === rangeId;
  };

  // Reset animation state when nodes or ranges change significantly
  useEffect(() => {
    // This safety mechanism ensures animation state is reset when configuration changes drastically
    // For example, when toggling a node from offline to online or vice versa
    
    // Track last state change time to reset animations that get stuck
    const stateChangeTimestamp = Date.now();
    
    // Clear animation tracking state after a short delay to allow new animations to be set up
    const timer = setTimeout(() => {
      // Check if we have any stuck animations - they should clear within 2 seconds
      if (Object.keys(animatingReplicas).length > 0) {
        console.log("Potential stuck animations detected - resetting animation state");
        setAnimatingReplicas({});
        setReplicaMovements([]);
      }
    }, 2000);
    
    // More aggressive cleanup for longer-running animations
    const extendedTimer = setTimeout(() => {
      // If we still have animations after 5 seconds, forcibly reset everything
      if (Object.keys(animatingReplicas).length > 0 || replicaMovements.length > 0) {
        console.log("Force cleanup of stalled animations after 5 seconds");
        setAnimatingReplicas({});
        setReplicaMovements([]);
        // Reset the last movement timestamp to ensure new movements are detected
        setLastMovementTimestamp(stateChangeTimestamp);
      }
    }, 5000);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(extendedTimer);
    };
  }, [nodes, ranges, replicaMovements, animatingReplicas]); // Re-run when nodes, ranges or animation state changes
  
  // Configure layout animation transition settings - carefully tuned for smooth animations
  const layoutTransition = {
    type: "tween", // Use tween for predictable, smooth motion
    ease: "easeOut", // Change to easeOut for more natural acceleration/deceleration
    duration: 0.35, // Slightly faster for better responsiveness
    // Add delay to stagger animations and reduce the processing load
    delay: 0.02
  };
  
  // Define an instant transition for static ranges - no animation for non-moving replicas
  const staticTransition = {
    duration: 0,
    delay: 0
  };

  // Extract and deduplicate recent movements from all ranges
  useEffect(() => {
    // Track when this effect runs to help with debugging
    console.log("Checking for new movements...");
    
    // Clear animating replicas if there are no movements in progress
    // This helps recover from any stuck animation state
    if (replicaMovements.length === 0 && Object.keys(animatingReplicas).length > 0) {
      console.log("Resetting animating replicas state - no movements in progress");
      setAnimatingReplicas({});
      return;
    }

    // Collect all movements from all ranges
    const allMovements: ReplicaMovement[] = [];
    ranges.forEach(range => {
      if (range.recentMovements && range.recentMovements.length > 0) {
        allMovements.push(...range.recentMovements);
      }
    });
    
    // Skip processing if there are no movements
    if (allMovements.length === 0) return;

    // Only get movements newer than what we've seen before
    const newMovements = allMovements.filter(m => m.timestamp > lastMovementTimestamp);
    
    if (newMovements.length === 0) return;
    
    console.log(`Found ${newMovements.length} new movements to process`);

    // Sort by timestamp (newest first) and take most recent 10 
    const sortedNewMovements = [...newMovements]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    // Update the timestamp to the most recent movement we've processed
    const newestTimestamp = Math.max(...sortedNewMovements.map(m => m.timestamp));
    
    // Create a fresh tracking object for new movements
    const newAnimatingReplicas = { ...animatingReplicas };
    let needToUpdateAnimatingReplicas = false;

    // Process all movements - with layout animations we don't need to check positions
    sortedNewMovements.forEach(movement => {
      // Skip redundant movements - if we're already animating this range for this node
      const isAlreadyAnimatingFromSource = 
        newAnimatingReplicas[movement.fromNodeId]?.has(movement.rangeId);
      const isAlreadyAnimatingToTarget = 
        newAnimatingReplicas[movement.toNodeId]?.has(movement.rangeId);
      
      // Only process if we're not already tracking this movement 
      if (!isAlreadyAnimatingFromSource || !isAlreadyAnimatingToTarget) {
        // Track that this range is moving from its original node
        if (!newAnimatingReplicas[movement.fromNodeId]) {
          newAnimatingReplicas[movement.fromNodeId] = new Set<string>();
          needToUpdateAnimatingReplicas = true;
        }
        
        if (!newAnimatingReplicas[movement.fromNodeId].has(movement.rangeId)) {
          newAnimatingReplicas[movement.fromNodeId].add(movement.rangeId);
          needToUpdateAnimatingReplicas = true;
        }

        // Also note that it's moving to a destination node
        if (!newAnimatingReplicas[movement.toNodeId]) {
          newAnimatingReplicas[movement.toNodeId] = new Set<string>();
          needToUpdateAnimatingReplicas = true;
        }
        
        if (!newAnimatingReplicas[movement.toNodeId].has(movement.rangeId)) {
          newAnimatingReplicas[movement.toNodeId].add(movement.rangeId);
          needToUpdateAnimatingReplicas = true;
        }
      }
    });

    // Only update state if we actually made changes
    if (needToUpdateAnimatingReplicas) {
      console.log("Updating animatingReplicas with new movements:", 
        sortedNewMovements.map(m => `${m.rangeId}: ${m.fromNodeId}->${m.toNodeId}`).join(', '));
      setAnimatingReplicas(newAnimatingReplicas);
      
      // Update movements state in same batch to ensure proper synchronization
      setReplicaMovements(current => {
        // Combine existing movements with new ones, removing duplicates
        const existingIds = new Set(current.map(m => `${m.rangeId}-${m.timestamp}`));
        const combined = [...current];
        
        // Add only movements we don't already have
        for (const movement of sortedNewMovements) {
          const id = `${movement.rangeId}-${movement.timestamp}`;
          if (!existingIds.has(id)) {
            combined.push(movement);
          }
        }
        
        return combined;
      });
      
      // Update timestamp last to avoid race conditions
      setLastMovementTimestamp(newestTimestamp);
    } else if (sortedNewMovements.length > 0) {
      console.log("Found movements but none needed tracking updates:", 
        sortedNewMovements.map(m => `${m.rangeId}: ${m.fromNodeId}->${m.toNodeId}`).join(', '));
      
      // Still update the timestamp to avoid processing these again
      setLastMovementTimestamp(newestTimestamp);
    }
  }, [ranges, nodes, lastMovementTimestamp, animatingReplicas, replicaMovements]);

  // Handle when an animation completes - with guaranteed cleanup
  const handleAnimationComplete = (completedMovement: ReplicaMovement) => {
    console.log("Animation complete:", completedMovement.rangeId, completedMovement.fromNodeId, "->", completedMovement.toNodeId);

    // First immediate cleanup - remove this movement from the active list
    setReplicaMovements(current => 
      current.filter(m => m.timestamp !== completedMovement.timestamp)
    );

    // Create a queued cleanup to ensure state is properly updated in sequence
    // This two-phase cleanup helps prevent race conditions in React state updates
    
    // Phase 1: Remove from animatingReplicas immediately
    setAnimatingReplicas(current => {
      // Create a brand new object to ensure React detects the change
      const updated = {...current};
      
      // Clean up the source node tracking
      if (updated[completedMovement.fromNodeId]) {
        const newSourceSet = new Set(updated[completedMovement.fromNodeId]);
        newSourceSet.delete(completedMovement.rangeId);
        
        if (newSourceSet.size > 0) {
          updated[completedMovement.fromNodeId] = newSourceSet;
        } else {
          delete updated[completedMovement.fromNodeId];
        }
      }
      
      // Clean up the destination node tracking
      if (updated[completedMovement.toNodeId]) {
        const newDestSet = new Set(updated[completedMovement.toNodeId]);
        newDestSet.delete(completedMovement.rangeId);
        
        if (newDestSet.size > 0) {
          updated[completedMovement.toNodeId] = newDestSet;
        } else {
          delete updated[completedMovement.toNodeId];
        }
      }
      
      return updated;
    });
    
    // Phase 2: Add a visual effect to show the completion
    // Use requestAnimationFrame to ensure DOM updates have time to process
    requestAnimationFrame(() => {
      // Flash target node to show completion - if we have its position
      const targetNodeRef = nodeRefs.current[completedMovement.toNodeId];
      if (targetNodeRef) {
        // Apply a quick visual effect to the target node
        targetNodeRef.style.transition = 'box-shadow 0.3s ease-out';
        targetNodeRef.style.boxShadow = completedMovement.isLeaseholder
          ? '0 0 0 3px rgba(59, 130, 246, 0.5)' // Blue for leaseholder
          : '0 0 0 3px rgba(156, 163, 175, 0.5)'; // Gray for regular replicas

        // Remove the effect after a brief period
        setTimeout(() => {
          if (targetNodeRef) {
            targetNodeRef.style.boxShadow = '';
          }
        }, 300);
      }
    });
    
    // Phase 3: Final verification of cleanup
    // Use a slightly delayed check to ensure any animations that should have completed 
    // but didn't report completion are properly cleaned up
    setTimeout(() => {
      setAnimatingReplicas(current => {
        // Check if we still have any entries for this range
        let needsCleanup = false;
        
        for (const [, rangeSet] of Object.entries(current)) {
          if (rangeSet.has(completedMovement.rangeId)) {
            needsCleanup = true;
            break;
          }
        }
        
        // If no cleanup needed, return unchanged
        if (!needsCleanup) return current;
        
        // Otherwise do a full cleanup
        console.log("Final cleanup for range", completedMovement.rangeId);
        const updated = {};
        
        for (const [nodeId, rangeSet] of Object.entries(current)) {
          const newRangeSet = new Set<string>();
          
          rangeSet.forEach(rangeId => {
            if (rangeId !== completedMovement.rangeId) {
              newRangeSet.add(rangeId);
            }
          });
          
          if (newRangeSet.size > 0) {
            updated[nodeId] = newRangeSet;
          }
        }
        
        return updated;
      });
    }, 100);
  };

  return (
    <LayoutGroup>
      <div
        className="rounded-lg p-4 shadow-md w-full relative"
        style={{ backgroundColor: '#f3f4f6' }}
        id="cluster-map-container"
      >
      <h2 className="text-xl font-bold mb-4">Cluster Map</h2>

      {/* We're now using Framer Motion's layout animations instead of custom animations */}
      {/* The layoutId system takes care of animating between nodes */}

      <div className="w-full border border-gray-300 rounded-lg" style={{ 
        minHeight: '600px',
        overflow: 'visible' // Critical for cross-region animations
      }}>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '1.5rem',
          padding: '1rem',
          overflow: 'visible' // Ensure animations can cross region boundaries
        }}>
          {regions.map(region => {
            const regionNodes = nodes.filter(node => node.region === region);
            const zones = [...new Set(regionNodes.map(node => node.zone))];

            // Check if any nodes in this region are offline
            const hasOfflineNodes = regionNodes.some(node => node.status === 'offline');
            const allNodesOffline = regionNodes.every(node => node.status === 'offline');

            return (
              <div
                key={region}
                className="border rounded-lg"
                style={{
                  borderColor: allNodesOffline ? '#ef4444' : (hasOfflineNodes ? '#f97316' : '#d1d5db'),
                  backgroundColor: allNodesOffline ? 'rgba(254, 202, 202, 0.3)' : 'rgba(255, 255, 255, 0.7)',
                  minHeight: '320px',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'visible',
                  padding: '0.75rem 1rem'
                }}
              >
                <div className="flex items-center space-x-1 mb-3">
                  <h3
                    className="region-heading"
                    onClick={() => {
                      // Clear any highlighted range before toggling the region
                      setHighlightedRangeId(null);
                      if (onRegionClick) onRegionClick(region);
                    }}
                    title={`Click to toggle all nodes in ${region}`}
                  >
                    {region}
                  </h3>
                  <span
                    className="text-xs text-gray-500 bg-gray-100 hover:bg-gray-200 px-1 rounded cursor-pointer transition-colors duration-200"
                    onClick={() => {
                      // Clear any highlighted range before toggling the region
                      setHighlightedRangeId(null);
                      if (onRegionClick) onRegionClick(region);
                    }}
                  >
                    Click to toggle region
                  </span>
                </div>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'row', 
                  gap: '1rem', 
                  flexWrap: 'wrap', // Changed from nowrap to allow zones to wrap
                  marginTop: '1rem',
                  flex: '1',
                  padding: '0.5rem 0.75rem 0.75rem 0.5rem',
                  margin: '0 -0.25rem' // to offset the padding and maintain alignment
                }}>
                  {zones.map(zone => {
                    const zoneNodes = regionNodes.filter(node => node.zone === zone);

                    return (
                      <div key={zone} className="border-l pl-3" style={{ 
                        borderColor: '#e5e7eb', 
                        flex: '0 1 auto', 
                        minWidth: '110px', 
                        maxWidth: '200px',
                        margin: '0 0 0.75rem 0',
                        padding: '0 0.5rem 0 0'
                      }}>
                        <div className="text-sm font-medium mb-2" style={{ color: '#4b5563' }}>
                          Zone: {zone}
                        </div>

                        <div className="flex flex-col gap-3">
                          {zoneNodes.map(node => {
                            const nodeRanges = getRangesForNode(node.id);

                            return (
                              <div
                                key={node.id}
                                ref={(el) => { nodeRefs.current[node.id] = el }}
                                onClick={() => {
                                  // Clear the highlight state before processing the click
                                  setHighlightedRangeId(null);
                                  onNodeClick(node.id);
                                }}
                                className="node-container"
                                style={{
                                  backgroundColor: node.status === 'online' 
                                    ? nodeRanges.length > 5 
                                      ? 'rgba(254, 215, 170, 0.7)' // Orange tint for heavily loaded nodes
                                      : nodeRanges.length > 3
                                        ? 'rgba(254, 240, 138, 0.5)' // Yellow tint for moderately loaded nodes
                                        : 'white'
                                    : '#fecaca', // Red background for offline nodes
                                  border: `2px solid ${node.status === 'online' ? '#22c55e' : '#ef4444'}`,
                                  // Precise calculation of height based on grid layout:
                                  // 1. Header height: 24px (text + padding)
                                  // 2. Margin top for ranges: 20px
                                  // 3. Grid rows × (Range height (20px) + gap (6px))
                                  // 4. Bottom padding: 8px
                                  height: `${24 + 20 + (Math.ceil(nodeRanges.length / 3) * (20 + 6)) - 6 + 8}px`
                                }}
                                title={`Node ${node.id} (${node.status}) - ${nodeRanges.length} replicas
${nodeRanges.filter(r => isLeaseholder(node.id, r.id)).length} leaseholders
Region: ${node.region}, Zone: ${node.zone}
${nodeRanges.length > 5 ? 'High load' : nodeRanges.length > 3 ? 'Medium load' : 'Low load'}`}
                              >
                                <div className="absolute top-0 left-0 right-0 text-center text-xs font-bold py-0.5"
                                  style={{ backgroundColor: node.status === 'online' ? '#22c55e' : '#ef4444', color: 'white' }}>
                                  {node.id} <span className="text-[9px]">({nodeRanges.length})</span>
                                </div>

                                <div style={{ 
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(3, 20px)',
                                  gap: '6px',
                                  width: '78px',
                                  marginTop: '20px',
                                  paddingBottom: '6px',
                                  justifyContent: 'center'
                                }}>
                                  {nodeRanges.map(range => {
                                    const isRangeHighlighted = isHighlighted(range.id);
                                    const isLeaseHolder = isLeaseholder(node.id, range.id);
                                    const rangeData = getRangeById(range.id);
                                    const isHot = rangeData && rangeData.load > 50;

                                    // Find if this range is being animated FROM this node
                                    const movementFromHere = replicaMovements.find(movement =>
                                      movement.rangeId === range.id && movement.fromNodeId === node.id
                                    );

                                    // Find if this range is being animated TO this node
                                    const movementToHere = replicaMovements.find(movement =>
                                      movement.rangeId === range.id && movement.toNodeId === node.id
                                    );

                                    // Check if this range is being animated (either coming from or going to a node)
                                    // We'll use Framer Motion's layout animations to handle the transitions
                                    const isAnimating = !!movementFromHere || !!movementToHere;
                                    
                                    // For layout animation, whether this is source or destination doesn't 
                                    // affect appearance any more, only animation behavior

                                    return (
                                      <motion.div
                                        // Use a stable position-based ID that doesn't change as replicas move between nodes
                                        // This ensures animations track properly across node boundaries
                                        layoutId={`replica-${range.id}-${rangeData?.replicas.indexOf(node.id)}`}
                                        key={`${node.id}-${range.id}`}
                                        layout
                                        // Expanded dependencies to capture all state changes that affect layout
                                        layoutDependency={[
                                          range.id, 
                                          node.id, 
                                          isAnimating, 
                                          !!animatingReplicas[node.id]?.has(range.id),
                                          node.status,
                                          // Include leaseholder status to ensure proper updates
                                          isLeaseHolder
                                        ]}
                                        // Different transitions based on animation state
                                        layoutTransition={isAnimating ? layoutTransition : staticTransition}
                                        className={`
                                          replica
                                          ${isLeaseHolder ? 'replica-leaseholder' : 'replica-normal'}
                                          ${isHot ? 'replica-hot' : ''}
                                          ${isRangeHighlighted ? 'replica-highlighted' : ''}
                                          ${isAnimating ? 'replica-animating' : ''}
                                        `}
                                        // Handle animation completion with proper cleanup
                                        onLayoutAnimationComplete={() => {
                                          if (isAnimating) {
                                            // Ensure we clean up both from and to animations
                                            if (movementFromHere) {
                                              handleAnimationComplete(movementFromHere);
                                            }
                                            if (movementToHere) {
                                              handleAnimationComplete(movementToHere);
                                            }
                                          }
                                        }}
                                        title={`Range ${range.id} ${isLeaseHolder ? '(Leaseholder)' : ''} - ${rangeData?.load} RPS`}
                                        onMouseEnter={() => handleRangeMouseEnter(range.id)}
                                        onMouseLeave={handleRangeMouseLeave}
                                      >
                                        <span className="text-[7px] text-white font-bold absolute-center">
                                          {range.id.replace('r', '')}
                                        </span>

                                        {/* Show connection lines when highlighted */}
                                        {isRangeHighlighted && (
                                          <div
                                            className="absolute rounded-full"
                                            style={{
                                              top: '50%',
                                              left: '50%',
                                              width: '8px',
                                              height: '8px',
                                              backgroundColor: 'rgba(59, 130, 246, 0.3)',
                                              boxShadow: '0 0 8px 4px rgba(59, 130, 246, 0.3)',
                                              transform: 'translate(-50%, -50%)',
                                              zIndex: -1,
                                              pointerEvents: 'none' // Ensure it doesn't interfere with hover
                                            }}
                                          />
                                        )}
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compact legend with both range and node load indicators */}
      <div className="flex justify-center mt-2 flex-wrap gap-2">
        <div className="inline-flex items-center bg-white rounded-md shadow-sm border border-gray-200 py-0.5 px-2" style={{ maxWidth: 'fit-content' }}>
          <span className="text-xs text-gray-700 font-medium mr-1.5">Ranges:</span>
          <div className="flex items-center">
            <div className="flex items-center mr-2">
              <div className="w-3.5 h-3.5 rounded-sm flex items-center justify-center"
                style={{ backgroundColor: '#3b82f6' }}>
                <span className="text-[7px] text-white font-bold">Leaseholder</span>
              </div>
            </div>
            <div className="flex items-center mr-2">
              <div className="w-3.5 h-3.5 rounded-sm flex items-center justify-center"
                style={{ backgroundColor: '#9ca3af' }}>
                <span className="text-[7px] text-white font-bold">Range</span>
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-3.5 h-3.5 rounded-sm flex items-center justify-center"
                style={{ backgroundColor: '#9ca3af', border: '2px solid #f97316' }}>
                <span className="text-[7px] text-white font-bold">Hot</span>
              </div>
            </div>
          </div>
        </div>

        <div className="inline-flex items-center bg-white rounded-md shadow-sm border border-gray-200 py-0.5 px-2" style={{ maxWidth: 'fit-content' }}>
          <span className="text-xs text-gray-700 font-medium mr-1.5">Node Load:</span>
          <div className="flex items-center">
            <div className="flex items-center mr-2">
              <div className="w-3.5 h-3.5 rounded-sm"
                style={{ backgroundColor: 'white', border: '1px solid #d1d5db' }}>
              </div>
              <span className="text-[9px] text-gray-600 ml-0.5">Low</span>
            </div>
            <div className="flex items-center mr-2">
              <div className="w-3.5 h-3.5 rounded-sm"
                style={{ backgroundColor: 'rgba(254, 240, 138, 0.5)', border: '1px solid #d1d5db' }}>
              </div>
              <span className="text-[9px] text-gray-600 ml-0.5">Medium</span>
            </div>
            <div className="flex items-center">
              <div className="w-3.5 h-3.5 rounded-sm"
                style={{ backgroundColor: 'rgba(254, 215, 170, 0.7)', border: '1px solid #d1d5db' }}>
              </div>
              <span className="text-[9px] text-gray-600 ml-0.5">High</span>
            </div>
          </div>
        </div>
      </div>

      {/* Information about highlighted range - always present with fixed height */}
      <div className="mt-2 text-center text-sm h-6" style={{ color: '#4b5563' }}>
        {highlightedRangeId ? (
          <>
            <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>Range {highlightedRangeId}</span> selected
            {' - '}
            <span>
              {getRangeById(highlightedRangeId)?.replicas?.length ?? 0} replicas
              {(getRangeById(highlightedRangeId)?.load ?? 0) > 50 ? ' (Hot Range)' : ''}
            </span>
          </>
        ) : (
          <span className="opacity-0">Placeholder for fixed height</span>
        )}
      </div>

      {/* Show information about ongoing movements if any */}
      {replicaMovements.length > 0 && (
        <div className="text-xs text-blue-600 text-center mt-1">
          Animating {replicaMovements.length} replica movement{replicaMovements.length > 1 ? 's' : ''}
        </div>
      )}
      
      {/* Show replica distribution metrics */}
      <div className="text-xs text-gray-600 text-center mt-2 bg-gray-50 p-1 rounded-md border border-gray-200 mx-auto" style={{maxWidth: "fit-content"}}>
        <div className="flex space-x-3">
          <div>
            <span className="font-medium">Regions with nodes:</span> {regions.length}
          </div>
          <div>
            <span className="font-medium">Online nodes:</span> {nodes.filter(n => n.status === 'online').length}/{nodes.length}
          </div>
          <div>
            <span className="font-medium">Total ranges:</span> {ranges.length}
          </div>
          <div>
            <span className="font-medium">Total replicas:</span> {ranges.reduce((total, range) => total + range.replicas.length, 0)}
          </div>
        </div>
      </div>
    </div>
    </LayoutGroup>
  );
}
