document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('treeCanvas');
    const ctx = canvas.getContext('2d');

    // --- SETUP: High Resolution Canvas ---
    const pixelRatio = window.devicePixelRatio || 1;
    
    function resizeCanvas() {
        canvas.width = canvas.offsetWidth * pixelRatio;
        canvas.height = canvas.offsetHeight * pixelRatio;
        ctx.scale(pixelRatio, pixelRatio);
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);


    // --- CONFIGURATION ---
    const config = {
        // Color Palette
        colors: [
            '#ff0055', '#ff3366', '#ff5500', '#ffcc00', '#ff99cc', '#ffffff'
        ],
        // Tree Structure
        trunkColor: '#ffb6c1',
        trunkWidth: 22,
        trunkHeight: 260,
        branchCount: 20,       // Added a few more branches for support
        
        // FOLIAGE SETTINGS
        heartCount: 2500,      // Dense foliage
        heartSizeMin: 12,
        heartSizeMax: 25,
        bloomSpeed: 2.5        // Fast bloom speed (Turbo mode)
    };

    // Animation State
    let frame = 0;
    let phase = 'TRUNK'; 
    let trunk = { h: 0, maxH: config.trunkHeight };
    let branches = [];
    let particles = [];

    // --- HELPER: Draw Heart Shape ---
    function drawHeart(ctx, x, y, size, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        const topCurve = size * 0.3;
        ctx.moveTo(x, y + topCurve);
        ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + topCurve);
        ctx.bezierCurveTo(x - size / 2, y + (size + topCurve) / 2, x, y + (size * 1.2), x, y + size);
        ctx.bezierCurveTo(x, y + (size * 1.2), x + size / 2, y + (size + topCurve) / 2, x + size / 2, y + topCurve);
        ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + topCurve);
        ctx.fill();
        ctx.closePath();
    }

    // --- GENERATION LOGIC ---
    const logicalWidth = canvas.width / pixelRatio;
    const logicalHeight = canvas.height / pixelRatio;
    const centerX = logicalWidth / 2;
    const bottomY = logicalHeight;
    const trunkTopY = bottomY - config.trunkHeight;

    // 2. Generate Branch Data
    for (let i = 0; i < config.branchCount; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2; 
        const length = 50 + Math.random() * 120;
        branches.push({
            x: centerX,
            y: trunkTopY + 20,
            angle: angle,
            length: length,
            currentLength: 0,
            width: 7 - (Math.random() * 3)
        });
    }

    // 3. Generate Heart (Leaf) Data
    for (let i = 0; i < config.heartCount; i++) {
        const t = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()); 
        
        const spreadX = 20 * r; 
        const spreadY = 18 * r; 

        let dx = 16 * Math.pow(Math.sin(t), 3);
        let dy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        
        const x = centerX + dx * spreadX;
        
        // --- KEY FIX HERE ---
        // Changed (trunkTopY - 120) to (trunkTopY - 180)
        // This lifts the entire heart section up by 60 pixels
        const y = (trunkTopY - 180) + dy * spreadY; 

        particles.push({
            x: x,
            y: y,
            size: 0, 
            targetSize: config.heartSizeMin + Math.random() * (config.heartSizeMax - config.heartSizeMin),
            color: config.colors[Math.floor(Math.random() * config.colors.length)],
            delay: Math.random() * 60, // Short delay for fast animation
            swaySpeed: 0.01 + Math.random() * 0.02,
            swayOffset: Math.random() * Math.PI * 2
        });
    }

    // --- MAIN ANIMATION LOOP ---
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. DRAW TRUNK
        if (phase !== 'WAIT') {
            ctx.fillStyle = config.trunkColor;
            ctx.beginPath();
            const w = config.trunkWidth;
            ctx.moveTo(centerX - w, bottomY); 
            ctx.lineTo(centerX + w, bottomY);
            ctx.lineTo(centerX + (w * 0.5), bottomY - trunk.h); 
            ctx.lineTo(centerX - (w * 0.5), bottomY - trunk.h);
            ctx.fill();

            // Fast Trunk Growth
            if (phase === 'TRUNK') {
                trunk.h += 10; 
                if (trunk.h >= trunk.maxH) phase = 'BRANCHES';
            }
        }

        // 2. DRAW BRANCHES
        if (phase === 'BRANCHES' || phase === 'HEARTS' || phase === 'DONE') {
            let branchesDone = true;
            ctx.strokeStyle = config.trunkColor;
            ctx.lineCap = 'round';
            
            branches.forEach(b => {
                // Fast Branch Growth
                if (phase === 'BRANCHES' && b.currentLength < b.length) {
                    b.currentLength += 6; 
                    branchesDone = false;
                }
                
                ctx.lineWidth = b.width;
                ctx.beginPath();
                ctx.moveTo(b.x, b.y);
                const ex = b.x + Math.cos(b.angle) * b.currentLength;
                const ey = b.y + Math.sin(b.angle) * b.currentLength;
                ctx.lineTo(ex, ey);
                ctx.stroke();
            });

            if (phase === 'BRANCHES' && branchesDone) phase = 'HEARTS';
        }

        // 3. DRAW HEARTS
        if (phase === 'HEARTS' || phase === 'DONE') {
            let allBloomed = true;
            
            // Lower shadowBlur for performance with high count
            ctx.shadowBlur = 8;
            
            particles.forEach(p => {
                ctx.shadowColor = p.color;

                if (phase === 'HEARTS') {
                    if (p.delay > 0) {
                        p.delay -= 4; // Fast start
                        allBloomed = false;
                        return;
                    }
                    if (p.size < p.targetSize) {
                        p.size += config.bloomSpeed;
                        allBloomed = false;
                    }
                }

                const windX = Math.sin(frame * p.swaySpeed + p.swayOffset) * 3;
                const windY = Math.cos(frame * p.swaySpeed + p.swayOffset) * 1.5;
                
                drawHeart(ctx, p.x + windX, p.y + windY, p.size, p.color);
            });
            
            ctx.shadowBlur = 0;

            if (phase === 'HEARTS' && allBloomed) {
                phase = 'DONE';
                revealText();
            }
        }

        frame++;
        requestAnimationFrame(animate);
    }

    // --- TEXT REVEAL ---
    function revealText() {
        const lines = document.querySelectorAll('.msg-line');
        let delay = 100;
        lines.forEach((line) => {
            setTimeout(() => {
                line.classList.add('visible');
            }, delay);
            delay += 800; // Fast text reveal
        });
    }

    animate();
});