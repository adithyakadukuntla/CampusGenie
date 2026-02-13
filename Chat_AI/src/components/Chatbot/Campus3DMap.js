import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line, Sphere, Stars } from '@react-three/drei';

const LocationNode = ({ position, label, isHighlighted }) => {
  return (
    <group position={position}>
      <Sphere args={[1.2, 16, 16]}>
        <meshStandardMaterial 
          color={isHighlighted ? "#00ffcc" : "#888"} 
          emissive={isHighlighted ? "#00ffcc" : "#444"}
          emissiveIntensity={isHighlighted ? 3 : 0.5}
        />
      </Sphere>
      <Text
        position={[0, 2.5, 0]}
        fontSize={1.2}
        color="white"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.1}
        outlineColor="#000"
      >
        {label}
      </Text>
    </group>
  );
};

const PathLine = ({ points, color, lineWidth, opacity = 1 }) => {
  if (!points || points.length < 2) return null;
  return (
    <Line
      points={points}
      color={color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
    />
  );
};

const MapContent = ({ navigation }) => {
  const { nodes = [], edges = [], path = [] } = navigation || {};

  // Map node IDs to their positions
  const nodeMap = useMemo(() => {
    const map = {};
    nodes.forEach(node => {
      if (node && node.id) {
        map[node.id] = [node.x || 0, node.y || 0, node.z || 0];
      }
    });
    return map;
  }, [nodes]);

  // Extract path coordinates
  const pathPoints = useMemo(() => {
    return path.map(node => [node.x || 0, node.y || 0, node.z || 0]);
  }, [path]);

  // Highlight path IDs
  const pathIds = useMemo(() => new Set(path.map(n => n.id)), [path]);

  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[100, 100, 100]} intensity={1.5} />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      {/* Render all edges safely */}
      {edges.map((edge, idx) => {
        const p1 = nodeMap[edge.from];
        const p2 = nodeMap[edge.to];
        if (!p1 || !p2) return null;
        return (
          <PathLine
            key={`edge-${idx}`}
            points={[p1, p2]}
            color="#555"
            lineWidth={1}
            opacity={0.2}
          />
        );
      })}

      {/* Render shortest path */}
      {pathPoints.length > 1 && (
        <PathLine
          points={pathPoints}
          color="#00ffcc"
          lineWidth={8}
        />
      )}

      {/* Render nodes */}
      {nodes.map(node => (
        <LocationNode
          key={node.id}
          position={[node.x || 0, node.y || 0, node.z || 0]}
          label={node.label}
          isHighlighted={pathIds.has(node.id)}
        />
      ))}

      <OrbitControls makeDefault />
    </>
  );
};

const Campus3DMap = ({ navigation }) => {
  if (!navigation || !navigation.nodes || navigation.nodes.length === 0) {
    return (
      <div style={{ padding: '10px', color: '#ff4444', background: '#222', borderRadius: '8px', marginTop: '10px' }}>
        ⚠️ Navigation map data is unavailable or incomplete for this route.
      </div>
    );
  }

  return (
    <div style={{ height: '450px', width: '100%', background: '#080808', borderRadius: '15px', overflow: 'hidden', marginTop: '20px', border: '1px solid #333', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
      <Canvas camera={{ position: [60, 60, 100], fov: 45 }}>
        <MapContent navigation={navigation} />
      </Canvas>
      <div style={{ position: 'absolute', bottom: '15px', left: '15px', color: '#00ffcc', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: '5px', backdropFilter: 'blur(4px)' }}>
        3D Interactive Campus Map
      </div>
    </div>
  );
};

export default Campus3DMap;
