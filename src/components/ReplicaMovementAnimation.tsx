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
  
  // Calculate positions
  const fromPosition = nodePositions[movement.fromNodeId];
  const toPosition = nodePositions[movement.toNodeId];
  
  // If we don't have positions for both nodes, don't render
  if (!fromPosition || !toPosition) {
    useEffect(() => {
      onComplete();
    }, [onComplete]);
    return null;
  }

  // Define animation properties
  const animationDuration = 0.7; // seconds - faster animations look nicer
  
  // Manage animation lifecycle
  useEffect(() => {
    // Wait a tiny bit before starting the animation for better visual sync
    const startDelay = setTimeout(() => {
      // Then wait for the full animation duration before cleaning up
      const completionTimer = setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, animationDuration * 1000);
      
      return () => clearTimeout(completionTimer);
    }, 50); // 50ms delay before starting animation to ensure placeholders are visible
    
    return () => clearTimeout(startDelay);
  }, [onComplete, animationDuration]);

  if (!isVisible) return null;
  
  // Size of our range representation (same as in ClusterMap)
  const size = 12; // Our replica squares are 4px, but we want to display larger during animation
  const offset = size / 2;
  
  return (
    <motion.div
      ref={animationRef}
      className="pointer-events-none z-50"
      style={{
        position: 'fixed',
        width: `${size}px`,
        height: `${size}px`,
        top: 0,
        left: 0,
        transform: `translate(${fromPosition.x - offset}px, ${fromPosition.y - offset}px)`
      }}
      animate={{
        transform: `translate(${toPosition.x - offset}px, ${toPosition.y - offset}px)`
      }}
      transition={{
        duration: animationDuration,
        ease: "easeInOut",
        delay: 0.05 // tiny delay to ensure the source placeholder is shown first
      }}
    >
      <div 
        className={`w-full h-full rounded-sm flex items-center justify-center ${
          movement.isLeaseholder ? 'bg-blue-500' : 'bg-gray-500'
        }`}
      >
        <span className="text-[7px] text-white font-bold">
          {movement.rangeId.replace('r', '')}
        </span>
      </div>
      {/* Pulsing effect */}
      <motion.div
        className="absolute top-0 left-0 w-full h-full rounded-sm"
        style={{
          backgroundColor: movement.isLeaseholder ? 'rgba(59, 130, 246, 0.3)' : 'rgba(156, 163, 175, 0.3)',
          boxShadow: movement.isLeaseholder 
            ? '0 0 8px 4px rgba(59, 130, 246, 0.3)' 
            : '0 0 8px 4px rgba(156, 163, 175, 0.3)',
        }}
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ 
          repeat: Infinity,
          duration: 1.5
        }}
      />
    </motion.div>
  );
}