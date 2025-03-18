import { motion } from 'framer-motion';

interface ControlPanelProps {
  onAddNode: () => void;
  onAddRange: () => void;
}

export default function ControlPanel({ onAddNode, onAddRange }: ControlPanelProps) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-md w-full">
      <h2 className="text-xl font-bold mb-4">Controls</h2>
      
      <div className="flex flex-wrap gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAddNode}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 flex-1"
        >
          Add Node
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onAddRange}
          className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700 flex-1"
        >
          Add Range
        </motion.button>
      </div>
    </div>
  );
}
