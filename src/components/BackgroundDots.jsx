import { useEffect, useRef } from 'react';

export default function BackgroundDots() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: true });
    let animationFrameId;
    let dots = [];
    let bursts = []; // { x, y, radius, alpha }
    const spacing = 26; // Space between dots
    let width, height;
    
    let mouse = { x: -1000, y: -1000 };

    const handleBurst = (e) => {
      bursts.push({
        type: e.detail.type || 'radial',
        x: e.detail.x || 0,
        y: e.detail.y || 0,
        radius: 0,
        alpha: 1
      });
    };
    window.addEventListener('burst', handleBurst);

    let mouseInViewport = true;
    const handleMouseLeave = () => { mouseInViewport = false; };
    const handleMouseEnter = () => { mouseInViewport = true; };
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('mouseenter', handleMouseEnter);

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouseInViewport = true;
    };
    
    // Add touch support for mobile
    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        mouse.x = e.touches[0].clientX;
        mouse.y = e.touches[0].clientY;
        mouseInViewport = true;
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
            baseX: i * spacing,
            baseY: j * spacing,
            vx: 0,
            vy: 0,
            baseRadius: 2, // Regular size
            radius: 2,
            targetRadius: 2,
          });
        }
      }
    };

    window.addEventListener('resize', init);
    init();

    let globalOpacity = 1;

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Update global opacity based on mouse presence
      globalOpacity += (mouseInViewport ? (1 - globalOpacity) * 0.05 : (0 - globalOpacity) * 0.05);
      
      // If fully invisible, skip heavy rendering
      if (globalOpacity < 0.01) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      
      ctx.globalAlpha = globalOpacity;
      
      const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';
      
      // Parse out the turquoise accent color visually
      const accentRGB = '64, 224, 208'; // #40E0D0
      const baseRGB = isLightMode ? '0, 0, 0' : '255, 255, 255';

      // Update bursts
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.radius += 20; // expand fast
        b.alpha -= 0.015; // fade out
        if (b.alpha <= 0) {
          bursts.splice(i, 1);
        }
      }
      
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        
        const dx = mouse.x - dot.x;
        const dy = mouse.y - dot.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // Interaction radius (wider area: 180px)
        if (dist < 180 && dist > 0) {
          // Push away from mouse
          const force = (180 - dist) / 180;
          dot.vx -= (dx / dist) * force * 0.8;
          dot.vy -= (dy / dist) * force * 0.8;
          
          // Max radius 2.2 when distance is 0
          dot.targetRadius = 2 + force * 0.2;
        } else {
          dot.targetRadius = dot.baseRadius;
        }
        
        // Easing to go back to normal slowly (trailing effect)
        // A lower multiplier makes it shrink slower
        dot.radius += (dot.targetRadius - dot.radius) * 0.035; 

        // Shockwave interaction overriding normal radius temporarily
        for (const b of bursts) {
           if (b.type === 'radial') {
             const bdx = b.x - dot.x;
             const bdy = b.y - dot.y;
             const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
             const distToWave = Math.abs(bdist - b.radius);
             if (distToWave < 80 && bdist > 0) {
               const push = (80 - distToWave) / 80; // 0 to 1
               dot.radius = Math.max(dot.radius, dot.baseRadius + push * 0.2 * b.alpha);
               dot.vx -= (bdx / bdist) * push * 8 * b.alpha;
               dot.vy -= (bdy / bdist) * push * 8 * b.alpha;
             }
           } else if (b.type === 'vertical') {
             const distToWave = Math.abs(dot.x - b.radius);
             if (distToWave < 40) {
               const push = (40 - distToWave) / 40;
               dot.radius = Math.max(dot.radius, dot.baseRadius + push * 0.2 * b.alpha);
               // Push to the right
               dot.vx += push * 3.3 * b.alpha;
             }
           }
        } 
        
        // Spring dynamics (pull back to base position)
        const springX = (dot.baseX - dot.x) * 0.05;
        const springY = (dot.baseY - dot.y) * 0.05;
        dot.vx += springX;
        dot.vy += springY;
        
        // Friction
        dot.vx *= 0.85;
        dot.vy *= 0.85;
        
        // Apply velocity
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Calculate interaction intensity for smooth color blending
        const displacementDist = Math.sqrt(Math.pow(dot.x - dot.baseX, 2) + Math.pow(dot.y - dot.baseY, 2));
        const sizeIntensity = Math.max(0, dot.radius - dot.baseRadius) / 0.2; // 0 to 1 based on growth
        const displaceIntensity = Math.min(displacementDist / 5, 1); // 0 to 1 based on movement
        const targetIntensity = Math.min(Math.max(sizeIntensity, displaceIntensity), 1);
        
        dot.intensity = dot.intensity || 0;
        if (targetIntensity > dot.intensity) {
            dot.intensity += (targetIntensity - dot.intensity) * 0.4; // Light up fast
        } else {
            dot.intensity += (targetIntensity - dot.intensity) * 0.08; // Fade out moderately fast
        }
        const totalIntensity = dot.intensity;

        if (totalIntensity > 0.01) {
          // Parse baseRGB and accentRGB into arrays
          const baseArr = baseRGB.split(',').map(n => parseInt(n.trim()));
          const accentArr = accentRGB.split(',').map(n => parseInt(n.trim()));
          
          // Interpolate RGB
          const r = Math.round(baseArr[0] + (accentArr[0] - baseArr[0]) * totalIntensity);
          const g = Math.round(baseArr[1] + (accentArr[1] - baseArr[1]) * totalIntensity);
          const b = Math.round(baseArr[2] + (accentArr[2] - baseArr[2]) * totalIntensity);
          
          // Smoothly ramp alpha from 0.2 to 1.0
          const alpha = 0.2 + totalIntensity * 0.8;
          
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, Math.max(dot.radius, 2), 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = `rgba(${baseRGB}, 0.1)`; // Base visibility
          // Using a square for the base 2px dot is faster and looks identical to a 2px circle
          ctx.fillRect(dot.baseX - 1.5, dot.baseY - 1.5, 3, 3);
        }
      }


      
      animationFrameId = requestAnimationFrame(draw);
    };
    
    draw();

    return () => {
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('mouseenter', handleMouseEnter);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', init);
      window.removeEventListener('burst', handleBurst);
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
