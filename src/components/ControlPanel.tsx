import { motion } from 'framer-motion';

interface ControlPanelProps {
  onAddNode: () => void;
  onAddRange: () => void;
}

export default function ControlPanel({ onAddNode, onAddRange }: ControlPanelProps) {
  return (
    <div className="rounded-lg p-4 shadow-md w-full" style={{ backgroundColor: 'white' }}>
      <h2 className="text-xl font-bold mb-4">Controls</h2>
      
      <div className="flex flex-wrap gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAddNode}
          className="text-white py-2 px-4 rounded flex-1"
          style={{ backgroundColor: '#2563eb' }}
        >
          Add Node
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAddRange}
          className="text-white py-2 px-4 rounded flex-1"
          style={{ backgroundColor: '#9333ea' }}
        >
          Add Range
        </motion.button>
      </div>
    </div>
  );
}
