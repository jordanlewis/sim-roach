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
  
  // Calculate vector for animation direction
  const vectorX = toPosition.x - fromPosition.x;
  const vectorY = toPosition.y - fromPosition.y;
  const distance = Math.sqrt(vectorX * vectorX + vectorY * vectorY);
  
  // Prevent division by zero if positions are the same
  const normalizedX = distance > 0 ? vectorX / distance : 0;
  const normalizedY = distance > 0 ? vectorY / distance : 0;

  // Define animation properties - use a slightly longer duration for return flights
  // to ensure smooth animation (return flights may have more complex state changes)
  const animationDuration = 0.7; // seconds - faster animations look nicer
  
  // Manage animation lifecycle with guaranteed completion
  useEffect(() => {
    let completionTimer: ReturnType<typeof setTimeout>;
    let animationStartTimer: ReturnType<typeof setTimeout>;
    
    // Wait a tiny bit before starting the animation for better visual sync
    animationStartTimer = setTimeout(() => {
      // Then wait for the full animation duration before cleaning up
      // Use a longer timeout to ensure the animation has fully completed
      completionTimer = setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, animationDuration * 1000 + 100); // Add more buffer to ensure animation completes
    }, 50); // 50ms delay before starting
    
    // Failsafe - ensure animation always completes even if something goes wrong
    const finalCleanupTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete();
    }, (animationDuration + 1) * 1000); // Add a full extra second for absolute certainty
    
    return () => {
      clearTimeout(animationStartTimer);
      clearTimeout(completionTimer);
      clearTimeout(finalCleanupTimer);
    };
  }, [onComplete, animationDuration]);

  if (!isVisible) return null;
  
  // Size of our range representation (same as in ClusterMap)
  const size = 12; // Our replica squares are 4px, but we want to display larger during animation
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
          ease: "easeInOut",
          delay: 0.05 // tiny delay to ensure the source placeholder is shown first
        }}
        onAnimationComplete={() => {
          // Add a short delay before triggering completion to ensure visual continuity
          setTimeout(() => {
            setIsVisible(false);
            onComplete();
          }, 50);
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