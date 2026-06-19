import { useEffect, useRef } from 'react';

export default function BackgroundDots() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    let animationFrameId;
    let dots = [];
    const spacing = 26; // Space between dots
    let width, height;
    
    let mouse = { x: -1000, y: -1000 };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    
    // Add touch support for mobile
    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove);

    const init = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      
      const cols = Math.floor(width / spacing) + 1;
      const rows = Math.floor(height / spacing) + 1;
      
      dots = [];
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          dots.push({
            x: i * spacing,
            y: j * spacing,
            baseRadius: 2, // Regular size
            radius: 2,
            targetRadius: 2,
          });
        }
      }
    };

    window.addEventListener('resize', init);
    init();

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Parse out the turquoise accent color visually
      const accentRGB = '64, 224, 208'; // #40E0D0
      const baseRGB = '255, 255, 255';
      
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        
        const dx = mouse.x - dot.x;
        const dy = mouse.y - dot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Interaction radius (wider area: 180px)
        if (dist < 180) {
          // Max radius 4 when distance is 0
          dot.targetRadius = 4 - (dist / 180) * 2;
        } else {
          dot.targetRadius = dot.baseRadius;
        }
        
        // Easing to go back to normal slowly (trailing effect)
        // A lower multiplier makes it shrink slower
        dot.radius += (dot.targetRadius - dot.radius) * 0.035; 
        
        // Render optimization: only fill arcs if they are actively visible/glowing, 
        // otherwise use fillRect for the tiny 1px dots for massive performance boost
        if (dot.radius > 2.1) {
          const intensity = Math.min((dot.radius - 2) / 2, 1);
          ctx.fillStyle = `rgba(${accentRGB}, ${0.1 + intensity * 0.5})`;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(${baseRGB}, 0.1)`; // Slightly more visible
          // Using a square for the base 2px dot is faster and looks identical to a 2px circle
          ctx.fillRect(dot.x - 1.5, dot.y - 1.5, 3, 3);
        }
      }
      
      animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: -1
      }}
    />
  );
}
