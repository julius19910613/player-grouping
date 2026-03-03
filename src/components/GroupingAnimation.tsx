import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { BasketballPosition } from '../types/basketball';
import { POSITION_DETAILS } from '../types/basketball';

interface Player {
  id: string;
  name: string;
  position: BasketballPosition;
}

interface Group {
  id: number;
  name: string;
  players: Player[];
}

interface GroupingAnimationProps {
  groups: Group[];
  isAnimating?: boolean;
}

export const GroupingAnimation: React.FC<GroupingAnimationProps> = ({ groups, isAnimating = false }) => {
  const cardVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.8,
      rotate: isAnimating ? (Math.random() * 30 - 15) : 0
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 20,
        delay: (isAnimating ? Math.random() * 0.5 : 0)
      }
    },
    shuffle: {
      x: isAnimating ? (Math.random() * 100 - 50) : 0,
      y: isAnimating ? (Math.random() * 100 - 50) : 0,
      rotate: isAnimating ? (Math.random() * 360) : 0,
      scale: isAnimating ? 0.8 : 1,
      transition: {
        duration: 0.3,
        ease: 'easeInOut' as const
      }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="grouping-animation" style={{ padding: '20px' }}>
      <AnimatePresence mode="wait">
        {groups.length > 0 ? (
          <motion.div
            key="groups"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '20px'
            }}
          >
            {groups.map((group) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '16px',
                  padding: '20px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  border: '2px solid #e0e0e0'
                }}
              >
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#333',
                  textAlign: 'center',
                  paddingBottom: '12px',
                  borderBottom: '2px solid #f0f0f0'
                }}>
                  {group.name}
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {group.players.map((player) => {
                    const positionDetails = POSITION_DETAILS[player.position];
                    return (
                      <motion.div
                        key={player.id}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ scale: 1.03 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px',
                          backgroundColor: `${positionDetails.color}10`,
                          borderRadius: '8px',
                          borderLeft: `4px solid ${positionDetails.color}`
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          backgroundColor: positionDetails.color,
                          color: '#fff',
                          fontSize: '20px',
                          flexShrink: 0
                        }}>
                          {positionDetails.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#333',
                            marginBottom: '2px'
                          }}>
                            {player.name}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#666',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>{positionDetails.name}</span>
                            <span style={{ opacity: 0.5 }}>({positionDetails.englishName})</span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {group.players.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{
                        textAlign: 'center',
                        padding: '24px',
                        color: '#999',
                        fontSize: '14px'
                      }}
                    >
                      暂无球员
                    </motion.div>
                  )}
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  style={{
                    marginTop: '16px',
                    paddingTop: '12px',
                    borderTop: '1px solid #f0f0f0',
                    textAlign: 'center',
                    fontSize: '14px',
                    color: '#666'
                  }}
                >
                  共 {group.players.length} 名球员
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#999'
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏀</div>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>暂无分组</div>
            <div style={{ fontSize: '14px' }}>添加球员后开始分组</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};