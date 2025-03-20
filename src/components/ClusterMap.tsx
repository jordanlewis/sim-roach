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

  // With Framer Motion's layout animations, we don't need to track node positions
  // as framer motion will handle the animation automatically with layoutId
  useEffect(() => {
    // With Framer Motion layout animations, we don't need position tracking
    // The framework will handle all the animations automatically
    
    return () => {
      // No event listeners to clean up
    };
  }, [nodes, ranges]); // Re-run when nodes or ranges change
  
  // Configure layout animation transition settings
  const layoutTransition = {
    type: "spring",
    stiffness: 350,
    damping: 25
  };

  // Extract and deduplicate recent movements from all ranges
  useEffect(() => {
    // Collect all movements from all ranges
    const allMovements: ReplicaMovement[] = [];
    ranges.forEach(range => {
      if (range.recentMovements && range.recentMovements.length > 0) {
        allMovements.push(...range.recentMovements);
      }
    });

    // Only get movements newer than what we've seen before
    const newMovements = allMovements.filter(m => m.timestamp > lastMovementTimestamp);

    if (newMovements.length > 0) {
      // Sort by timestamp (newest first) and take most recent 10 
      const sortedNewMovements = [...newMovements]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 10);

      // Update the timestamp to the most recent movement we've processed
      const newestTimestamp = Math.max(...sortedNewMovements.map(m => m.timestamp));
      setLastMovementTimestamp(newestTimestamp);

      // Process movements in batches to ensure animations are coherent
      // Update the animating replicas mapping to track which replicas are in motion
      const newAnimatingReplicas = { ...animatingReplicas };

      // Process all movements - with layout animations we don't need to check positions
      sortedNewMovements.forEach(movement => {
        // Track that this range is moving from its original node
        if (!newAnimatingReplicas[movement.fromNodeId]) {
          newAnimatingReplicas[movement.fromNodeId] = new Set<string>();
        }
        newAnimatingReplicas[movement.fromNodeId].add(movement.rangeId);

        // Also note that it's moving to a destination node
        if (!newAnimatingReplicas[movement.toNodeId]) {
          newAnimatingReplicas[movement.toNodeId] = new Set<string>();
        }
        newAnimatingReplicas[movement.toNodeId].add(movement.rangeId);
      });

      setAnimatingReplicas(newAnimatingReplicas);
      setReplicaMovements(sortedNewMovements);
    }
  }, [ranges, lastMovementTimestamp, animatingReplicas]);

  // Handle when an animation completes - with guaranteed cleanup
  const handleAnimationComplete = (completedMovement: ReplicaMovement) => {
    console.log("Animation complete:", completedMovement.rangeId, completedMovement.fromNodeId, "->", completedMovement.toNodeId);

    // Ensure we remove this specific animation from the list
    setReplicaMovements(current => {
      return current.filter(m => m.timestamp !== completedMovement.timestamp);
    });

    // Clean up tracking sets - use the functional update pattern for reliability
    setAnimatingReplicas(current => {
      const updated = { ...current };

      // Clean source node tracking
      if (updated[completedMovement.fromNodeId]) {
        updated[completedMovement.fromNodeId].delete(completedMovement.rangeId);
        if (updated[completedMovement.fromNodeId].size === 0) {
          delete updated[completedMovement.fromNodeId];
        }
      }

      // Clean destination node tracking
      if (updated[completedMovement.toNodeId]) {
        updated[completedMovement.toNodeId].delete(completedMovement.rangeId);
        if (updated[completedMovement.toNodeId].size === 0) {
          delete updated[completedMovement.toNodeId];
        }
      }

      return updated;
    });

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

      <div className="w-full border border-gray-300 rounded-lg" style={{ minHeight: '600px' }}>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '1.5rem',
          padding: '1rem'
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
                  overflow: 'hidden',
                  padding: '0.75rem 1rem'
                }}
              >
                <motion.div className="flex items-center space-x-1 mb-3">
                  <motion.h3
                    className="text-lg font-semibold cursor-pointer inline-block"
                    style={{ color: '#1f2937' }}
                    onClick={() => {
                      // Clear any highlighted range before toggling the region
                      setHighlightedRangeId(null);
                      if (onRegionClick) onRegionClick(region);
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title={`Click to toggle all nodes in ${region}`}
                  >
                    {region}
                  </motion.h3>
                  <motion.span
                    className="text-xs text-gray-500 bg-gray-100 px-1 rounded cursor-pointer"
                    whileHover={{ backgroundColor: '#e5e7eb' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      // Clear any highlighted range before toggling the region
                      setHighlightedRangeId(null);
                      if (onRegionClick) onRegionClick(region);
                    }}
                  >
                    Click to toggle region
                  </motion.span>
                </motion.div>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'row', 
                  gap: '1rem', 
                  flexWrap: 'nowrap',
                  overflowX: 'auto',
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
                        flex: '0 0 auto', 
                        minWidth: '110px', 
                        maxWidth: '200px',
                        padding: '0 0.5rem 0 0'
                      }}>
                        <div className="text-sm font-medium mb-2" style={{ color: '#4b5563' }}>
                          Zone: {zone}
                        </div>

                        <div className="flex flex-col gap-3">
                          {zoneNodes.map(node => {
                            const nodeRanges = getRangesForNode(node.id);

                            return (
                              <motion.div
                                key={node.id}
                                ref={(el) => { nodeRefs.current[node.id] = el }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  // Clear the highlight state before processing the click
                                  setHighlightedRangeId(null);
                                  onNodeClick(node.id);
                                }}
                                className="relative flex flex-wrap justify-center items-center cursor-pointer 
                                  shadow-md rounded-lg p-1"
                                style={{
                                  width: '80px',
                                  backgroundColor: node.status === 'online' 
                                    ? nodeRanges.length > 5 
                                      ? 'rgba(254, 215, 170, 0.7)' // Orange tint for heavily loaded nodes
                                      : nodeRanges.length > 3
                                        ? 'rgba(254, 240, 138, 0.5)' // Yellow tint for moderately loaded nodes
                                        : 'white'
                                    : '#fecaca', // Red background for offline nodes
                                  border: `2px solid ${node.status === 'online' ? '#22c55e' : '#ef4444'}`,
                                  marginBottom: '0.5rem',
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
                                    
                                    // If the range is being animated FROM this node, we'll keep it in place
                                    // with reduced opacity. If it's animating TO this node, we'll still
                                    // render it (with layoutId) but make it invisible initially
                                    const isSource = !!movementFromHere;
                                    const isDestination = !!movementToHere;

                                    return (
                                      <motion.div
                                        // Use layoutId for Framer Motion to track and animate between states
                                        layoutId={isAnimating ? `range-${range.id}-animation` : undefined}
                                        key={range.id}
                                        layout
                                        layoutDependency={isAnimating}
                                        layoutTransition={layoutTransition}
                                        className="rounded-sm flex items-center justify-center relative"
                                        style={{
                                          width: '20px', 
                                          height: '20px', 
                                          flexShrink: 0,
                                          padding: '2px',
                                          backgroundColor: isSource ? 'rgba(156, 163, 175, 0.2)' : (isLeaseHolder ? '#3b82f6' : '#9ca3af'),
                                          border: isHot 
                                            ? '2px solid #f97316' 
                                            : isRangeHighlighted 
                                              ? '2px solid rgba(59, 130, 246, 0.8)' 
                                              : 'none',
                                          zIndex: isRangeHighlighted ? 10 : 1,
                                          transition: 'border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                                          boxShadow: isRangeHighlighted ? '0 0 5px 1px rgba(59, 130, 246, 0.5)' : 'none',
                                          opacity: isSource ? 0.2 : (isDestination ? 0 : 1)
                                        }}
                                        // Handle completion when destination range finishes its entrance animation
                                        onLayoutAnimationComplete={() => {
                                          if (isDestination && movementToHere) {
                                            handleAnimationComplete(movementToHere);
                                          }
                                        }}
                                        title={`Range ${range.id} ${isLeaseHolder ? '(Leaseholder)' : ''} - ${rangeData?.load} RPS${isSource ? ' (Moving...)' : ''}`}
                                        onMouseEnter={() => handleRangeMouseEnter(range.id)}
                                        onMouseLeave={handleRangeMouseLeave}
                                        whileHover={{
                                          boxShadow: '0 0 5px 2px rgba(59, 130, 246, 0.6)',
                                          border: isHot ? '2px solid #f97316' : '2px solid rgba(59, 130, 246, 0.8)'
                                        }}
                                      >
                                        {!shouldRenderPlaceholder && (
                                          <span className="text-[7px] text-white font-bold">
                                            {range.id.replace('r', '')}
                                          </span>
                                        )}

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
                                              zIndex: -1
                                            }}
                                          />
                                        )}
                                      </motion.div>
                                    );
                                  })}
                                </div>
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
