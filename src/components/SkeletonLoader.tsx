import { motion } from 'framer-motion';

interface SkeletonLoaderProps {
  type?: 'card' | 'page' | 'text';
  className?: string;
}

export default function SkeletonLoader({ type = 'card', className = '' }: SkeletonLoaderProps) {
  if (type === 'page') {
    return (
      <div className={`min-h-screen bg-background paper-texture flex items-center justify-center ${className}`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-xl w-full px-6"
        >
          {/* Story text skeleton */}
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                className={`h-4 bg-muted/50 rounded-full ${
                  i === 5 ? 'w-2/3' : 'w-full'
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
            className={`h-3 bg-muted/50 rounded-full ${
              i === 3 ? 'w-1/2' : 'w-full'
            }`}
          />
        ))}
      </div>
    );
  }

  // Card skeleton
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`book-cover p-6 flex flex-col ${className}`}
    >
      {/* Icon skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-24 h-24 rounded-full bg-muted/50 mb-4"
        />
        
        {/* Name skeleton */}
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
          className="h-6 w-32 bg-muted/50 rounded-full mb-2"
        />
        
        {/* Type skeleton */}
        <motion.div
          initial={{ opacity: 0.3 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
          className="h-4 w-20 bg-muted/50 rounded-full mb-4"
        />
        
        {/* Traits skeleton */}
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 + i * 0.1 }}
              className="h-5 w-16 bg-muted/50 rounded-full"
            />
          ))}
        </div>
      </div>
      
      {/* Button skeleton */}
      <motion.div
        initial={{ opacity: 0.3 }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
        className="h-10 w-full bg-muted/50 rounded-xl mt-4"
      />
    </motion.div>
  );
}