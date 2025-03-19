import { motion } from 'framer-motion';
import { Node, Range, ReplicaMovement } from '../types';
import { useState, useEffect, useRef } from 'react';
import ReplicaMovementAnimation from './ReplicaMovementAnimation';

interface ClusterMapProps {
  nodes: Node[];
  ranges: Range[];
  onNodeClick: (nodeId: string) => void;
  onRegionClick?: (regionName: string) => void;
}

export default function ClusterMap({ nodes, ranges, onNodeClick, onRegionClick }: ClusterMapProps) {
  // State to track highlighted range
  const [highlightedRangeId, setHighlightedRangeId] = useState<string | null>(null);
  // State to track node positions for animations
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
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
  
  // Update node positions when nodes or layout changes
  useEffect(() => {
    const updatePositions = () => {
      const positions: Record<string, { x: number; y: number }> = {};
      
      // Process all node references to get their current positions
      Object.entries(nodeRefs.current).forEach(([nodeId, element]) => {
        if (element) {
          const rect = element.getBoundingClientRect();
          
          // We need the exact center of the range area, which is a bit lower than the node center
          // due to the node header. The ranges are in a flex container with mt-5
          positions[nodeId] = {
            x: window.scrollX + rect.left + rect.width / 2,
            y: window.scrollY + rect.top + rect.height / 2 + 5
          };
        }
      });
      
      setNodePositions(positions);
    };
    
    // Update positions after all resources finish loading
    window.addEventListener('load', updatePositions);
    
    // Update on scroll and resize 
    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions);
    
    // Initial update - with a small delay to ensure DOM is fully rendered
    const initialTimer = setTimeout(updatePositions, 100);
    
    // Set an interval to keep checking positions while the component is mounted
    // This ensures we catch any DOM updates
    const positionCheckInterval = setInterval(updatePositions, 500);
    
    return () => {
      clearTimeout(initialTimer);
      clearInterval(positionCheckInterval);
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions);
      window.removeEventListener('load', updatePositions);
    };
  }, [nodes, ranges]); // Re-run when nodes or ranges change
  
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
      
      // Only start animations if we have node positions
      if (Object.keys(nodePositions).length > 0) {
        // Update the animating replicas mapping to track which replicas are in motion
        const newAnimatingReplicas = { ...animatingReplicas };
        
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
    }
  }, [ranges, nodePositions, lastMovementTimestamp, animatingReplicas]);
  
  // Handle when an animation completes
  const handleAnimationComplete = (completedMovement: ReplicaMovement) => {
    // Remove from animating movements
    setReplicaMovements(current => 
      current.filter(m => m.timestamp !== completedMovement.timestamp)
    );
    
    // Remove from tracking sets
    setAnimatingReplicas(current => {
      const updated = { ...current };
      
      // Remove tracking from source node
      if (updated[completedMovement.fromNodeId]) {
        updated[completedMovement.fromNodeId].delete(completedMovement.rangeId);
        if (updated[completedMovement.fromNodeId].size === 0) {
          delete updated[completedMovement.fromNodeId];
        }
      }
      
      // Remove tracking from destination node
      if (updated[completedMovement.toNodeId]) {
        updated[completedMovement.toNodeId].delete(completedMovement.rangeId);
        if (updated[completedMovement.toNodeId].size === 0) {
          delete updated[completedMovement.toNodeId];
        }
      }
      
      return updated;
    });
  };
  
  return (
    <div 
      className="rounded-lg p-4 shadow-md w-full relative" 
      style={{ backgroundColor: '#f3f4f6' }}
      id="cluster-map-container"
    >
      <h2 className="text-xl font-bold mb-4">Cluster Map</h2>
      
      {/* Animation layer */}
      {replicaMovements.map(movement => (
        <ReplicaMovementAnimation
          key={`${movement.rangeId}-${movement.fromNodeId}-${movement.toNodeId}-${movement.timestamp}`}
          movement={movement}
          nodePositions={nodePositions}
          onComplete={() => handleAnimationComplete(movement)}
        />
      ))}
      
      <div className="w-full border border-gray-300 rounded-lg" style={{ minHeight: '500px' }}>
        <div className="grid" style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
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
                className="border rounded-lg p-3"
                style={{ 
                  borderColor: allNodesOffline ? '#ef4444' : (hasOfflineNodes ? '#f97316' : '#d1d5db'),
                  backgroundColor: allNodesOffline ? 'rgba(254, 202, 202, 0.3)' : 'rgba(255, 255, 255, 0.7)'
                }}
              >
                <motion.div className="flex items-center space-x-1 mb-3">
                  <motion.h3 
                    className="text-lg font-semibold cursor-pointer inline-block"
                    style={{ color: '#1f2937' }}
                    onClick={() => {
                      // Clear any highlighted range before toggling the region
                      setHighlightedRangeId(null);
                      onRegionClick && onRegionClick(region);
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
                      onRegionClick && onRegionClick(region);
                    }}
                  >
                    Click to toggle region
                  </motion.span>
                </motion.div>
                
                <div className="flex flex-col space-y-4">
                  {zones.map(zone => {
                    const zoneNodes = regionNodes.filter(node => node.zone === zone);
                    
                    return (
                      <div key={zone} className="border-t pt-2" style={{ borderColor: '#e5e7eb' }}>
                        <div className="text-sm font-medium mb-2" style={{ color: '#4b5563' }}>
                          Zone: {zone}
                        </div>
                        
                        <div className="flex flex-wrap gap-3">
                          {zoneNodes.map(node => {
                            const nodeRanges = getRangesForNode(node.id);
                            
                            return (
                              <motion.div
                                key={node.id}
                                ref={el => nodeRefs.current[node.id] = el}
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
                                  height: '80px',
                                  backgroundColor: node.status === 'online' ? 'white' : '#fecaca',
                                  border: `2px solid ${node.status === 'online' ? '#22c55e' : '#ef4444'}`
                                }}
                                title={`Node ${node.id} (${node.status})`}
                              >
                                <div className="absolute top-0 left-0 right-0 text-center text-xs font-bold py-0.5"
                                     style={{ backgroundColor: node.status === 'online' ? '#22c55e' : '#ef4444', color: 'white' }}>
                                  {node.id}
                                </div>
                                
                                <div className="flex flex-wrap justify-center gap-1 mt-5">
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
                                    
                                    // Show a placeholder in the source node, hide at destination until animation completes
                                    const shouldRenderPlaceholder = !!movementFromHere;
                                    const shouldHideCompletely = !!movementToHere;
                                    
                                    if (shouldHideCompletely) {
                                      return null;
                                    }
                                    
                                    return (
                                      <motion.div 
                                        key={range.id}
                                        className="w-4 h-4 rounded-sm flex items-center justify-center relative"
                                        style={{ 
                                          backgroundColor: shouldRenderPlaceholder ? 'rgba(156, 163, 175, 0.2)' : (isLeaseHolder ? '#3b82f6' : '#9ca3af'),
                                          border: isHot ? '1px solid #f97316' : 'none',
                                          transform: isRangeHighlighted ? 'scale(1.3)' : 'scale(1)',
                                          zIndex: isRangeHighlighted ? 10 : 1,
                                          transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                                          boxShadow: isRangeHighlighted ? '0 0 5px 2px rgba(59, 130, 246, 0.5)' : 'none',
                                          opacity: shouldRenderPlaceholder ? 0.5 : 1
                                        }}
                                        title={`Range ${range.id} ${isLeaseHolder ? '(Leaseholder)' : ''} - ${rangeData?.load} RPS${shouldRenderPlaceholder ? ' (Moving...)' : ''}`}
                                        onMouseEnter={() => handleRangeMouseEnter(range.id)}
                                        onMouseLeave={handleRangeMouseLeave}
                                        whileHover={{ scale: 1.3 }}
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
      
      <div className="mt-4 flex justify-center items-center gap-6">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#3b82f6' }}></div>
          <span className="text-xs">Leaseholder</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#9ca3af' }}></div>
          <span className="text-xs">Replica</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: '#9ca3af', border: '1px solid #f97316' }}></div>
          <span className="text-xs">Hot Range</span>
        </div>
      </div>
      
      {/* Information about highlighted range - always present with fixed height */}
      <div className="mt-2 text-center text-sm h-6" style={{ color: '#4b5563' }}>
        {highlightedRangeId ? (
          <>
            <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>Range {highlightedRangeId}</span> selected
            {' - '}
            <span>
              {getRangeById(highlightedRangeId)?.replicas.length} replicas 
              {getRangeById(highlightedRangeId)?.load > 50 ? ' (Hot Range)' : ''}
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
    </div>
  );
}
