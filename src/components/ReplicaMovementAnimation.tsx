import { motion } from 'framer-motion';
import { ReplicaMovement } from '../types';
import { useState, useEffect, useRef } from 'react';

interface ReplicaMovementAnimationProps {
  movement: ReplicaMovement;
  nodePositions: Record<string, { x: number; y: number }>;
  onComplete: () => void;
}

export default function ReplicaMovementAnimation({ 
  movement, 
  nodePositions, 
  onComplete 
}: ReplicaMovementAnimationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const animationRef = useRef<HTMLDivElement>(null);
  
  // Get base positions (top-left corner of the range grid for each node)
  const fromNodeBase = nodePositions[movement.fromNodeId];
  const toNodeBase = nodePositions[movement.toNodeId];
  
  // Define effect outside conditional block to satisfy React hooks rules
  useEffect(() => {
    // If we don't have positions for both nodes, complete the animation immediately
    if (!fromNodeBase || !toNodeBase) {
      onComplete();
    }
  }, [fromNodeBase, toNodeBase, onComplete]);
  
  // If we don't have positions for both nodes, don't render
  if (!fromNodeBase || !toNodeBase) {
    return null;
  }
  
  // Each range is 20px × 20px and grid has 6px gaps
  // Calculate the position within the grid for the range
  const calculateRangePosition = (rangeIndex: number, basePosition: {x: number, y: number}) => {
    // Each grid has 3 columns
    const col = rangeIndex % 3;
    const row = Math.floor(rangeIndex / 3);
    
    // Calculate exact position based on grid layout
    // 20px for range width/height + 6px for gaps between ranges
    const x = basePosition.x + col * (20 + 6) + 10; // 10 = half of range width (center point)
    const y = basePosition.y + 20 + row * (20 + 6) + 10; // 20px margin-top + half of range height
    
    return { x, y };
  };
  
  // Estimate the index of the range in both source and destination nodes
  // This is imprecise since we don't know the exact index, but we can make a good guess
  const fromIndex = parseInt(movement.rangeId.replace('r', '')) - 1;
  const toIndex = parseInt(movement.rangeId.replace('r', '')) - 1;
  
  // Calculate precise from/to positions
  const fromPosition = calculateRangePosition(fromIndex, fromNodeBase);
  const toPosition = calculateRangePosition(toIndex, toNodeBase);
  
  // Calculate vector for animation direction
  const vectorX = toPosition.x - fromPosition.x;
  const vectorY = toPosition.y - fromPosition.y;
  const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
  
  // Prevent division by zero if positions are the same
  const normalizedX = distance > 0 ? vectorX / distance : 0;
  const normalizedY = distance > 0 ? vectorY / distance : 0;

  // Define animation properties - use a moderate duration so the animation is visible
  // but doesn't feel sluggish
  const animationDuration = 0.6; // seconds - fast animations for precise movements
  
  // We won't need the complex timing logic anymore since we use the motion
  // component's onAnimationComplete event for reliable completion

  if (!isVisible) return null;
  
  // Size of our range representation (same as in ClusterMap)
  const size = 20; // Match exactly to the size in ClusterMap (20px)
  const offset = size / 2;
  
  // Colors based on motion type
  const primaryColor = movement.isLeaseholder ? '#3b82f6' : '#9ca3af'; // blue or gray
  const glowColor = movement.isLeaseholder 
    ? 'rgba(59, 130, 246, 0.4)' 
    : 'rgba(156, 163, 175, 0.4)';

  return (
    <>
      {/* Path indicator that shows the movement trajectory */}
      <motion.div
        className="pointer-events-none"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: distance,
          height: 2,
          backgroundColor: 'transparent',
          borderBottom: `1px dashed ${primaryColor}`,
          opacity: 0.4,
          transformOrigin: '0 0',
          transform: `translate(${fromPosition.x}px, ${fromPosition.y}px) rotate(${Math.atan2(vectorY, vectorX)}rad)`,
          zIndex: 90
        }}
        initial={{ opacity: 0, pathLength: 0 }}
        animate={{ opacity: [0, 0.4, 0], pathLength: 1 }}
        transition={{ duration: animationDuration * 0.8, ease: "easeOut" }}
      />
      
      {/* Main animated element */}
      <motion.div
        ref={animationRef}
        className="pointer-events-none z-50"
        style={{
          position: 'fixed',
          width: `${size}px`,
          height: `${size}px`,
          top: 0,
          left: 0,
          transform: `translate(${fromPosition.x - offset}px, ${fromPosition.y - offset}px)`,
          zIndex: 100
        }}
        animate={{
          transform: `translate(${toPosition.x - offset}px, ${toPosition.y - offset}px)`
        }}
        transition={{
          duration: animationDuration,
          ease: "easeInOut"
        }}
        onAnimationComplete={() => {
          // Complete immediately - we have precise positioning now
          setIsVisible(false);
          onComplete();
        }}
      >
        <div 
          className="w-full h-full rounded-sm flex items-center justify-center relative"
          style={{
            padding: '2px',
            backgroundColor: movement.isLeaseholder ? '#3b82f6' : '#9ca3af'
          }}
        >
          <span className="text-[7px] text-white font-bold">
            {movement.rangeId.replace('r', '')}
          </span>
        </div>
        
        {/* Pulsing glow effect */}
        <motion.div
          className="absolute top-0 left-0 w-full h-full rounded-sm"
          style={{
            backgroundColor: 'transparent',
            boxShadow: `0 0 8px 4px ${glowColor}`,
            zIndex: -1,
          }}
          animate={{
            boxShadow: [
              `0 0 8px 2px ${glowColor}`,
              `0 0 12px 6px ${glowColor}`,
              `0 0 8px 2px ${glowColor}`
            ]
          }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        
        {/* Trail effect */}
        <motion.div 
          className="absolute"
          style={{
            width: '12px',
            height: '4px',
            left: `${-8 * normalizedX}px`,
            top: `${-4 * normalizedY}px`,
            background: `linear-gradient(${Math.atan2(vectorY, vectorX) * (180/Math.PI)}deg, 
              transparent,
              ${movement.isLeaseholder ? 'rgba(59, 130, 246, 0.6)' : 'rgba(156, 163, 175, 0.6)'})`,
            borderRadius: '2px',
            opacity: 0.7,
            zIndex: -1,
            transformOrigin: 'center',
            transform: `rotate(${Math.atan2(vectorY, vectorX)}rad)`
          }}
          animate={{
            opacity: [0.7, 0.4, 0.7],
            width: ['12px', '20px', '12px']
          }}
          transition={{ duration: 0.6, repeat: Infinity }}
        />
      </motion.div>
    </>
  );
}