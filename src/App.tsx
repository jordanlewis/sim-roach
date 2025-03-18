import { motion } from 'framer-motion';

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-4xl font-bold mb-4 text-cockroach-blue">
          CockroachDB Simulator
        </h1>
        <p className="text-xl mb-8 max-w-2xl">
          An interactive visualization of CockroachDB's resilience, 
          scalability, and locality features
        </p>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-cockroach-green text-white font-bold py-2 px-6 rounded-full shadow-lg"
        >
          Start Exploring
        </motion.button>
      </motion.div>
    </div>
  );
}

export default App;