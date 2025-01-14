var $ = {
    canvas: null,
    ctx: null,
    canvas2: null,
    ctx2: null,
    colors: {
      sky: "#D4F5FE",
      mountains: "#83CACE",
      ground: "#8FC04C",
      groundDark: "#73B043",
      road: "#606a7c",
      roadLine: "#FFF",
      hud: "#FFF"
    },
    settings: {
      fps: 60,
      skySize: 120,
      ground: {
        size: 350,
        min: 4,
        max: 120
      },
      road: {
        min: 76,
        max: 700,
      },
      obstacles: {           // Add this new section
        baseSpeed: 0.008,  // Base movement speed
        spawnRateMin: 2000,  // Minimum ms between spawns
        spawnRateMax: 3000,  // Maximum ms between spawns
        maxConcurrent: 5,    // Max number of obstacles at once
        spawnInterval: 2000, // Base spawn interval in milliseconds
        minSpawnGap: 1000, 
    }
    },
    state: {
      bgpos: 0,
      obstacles: [],
      lastObstacleTime: Date.now(),
      obstacleSpawnInterval: 2000,    // Changed from 3000 to 2500
      minSpawnInterval: 2000,         // Add this new line
      maxSpawnInterval: 3000,   
      offset: 0,
      startDark: true,
      curve: 0,
      currentCurve: 0,
      turn: 1,
      speed: 27,
      xpos: 0,
      section: 50,
      car: {
        maxSpeed: 35,
        friction: 0.4,
        acc: 0.85,
        deAcc: 0.5
      },
      keypress: {
        up: false,
        left: false,
        right: false,
        down: false
      },
      gameStartTime: null,
      gameStarted: false
    },
    storage: {
      bg: null
    }
  };

$.canvas = document.getElementsByTagName('canvas')[0];
$.ctx = $.canvas.getContext('2d');
$.canvas2 = document.createElement('canvas');
$.canvas2.width = $.canvas.width;
$.canvas2.height = $.canvas.height;
$.ctx2 = $.canvas2.getContext('2d');
window.addEventListener("keydown", keyDown, false);
window.addEventListener("keyup", keyUp, false);

$.state = $.state || {};
$.state.debugMode = true;
// Add the state initialization RIGHT HERE, after canvas setup
$.state.obstacleSpawnInterval = $.settings.obstacles.spawnInterval;
$.state.lastObstacleTime = Date.now();
// Initialize when the page loads
window.addEventListener('load', () => {
  const timeDisplay = document.getElementById('time');
  timeDisplay.textContent = "3:00"; // Set initial display
  startCountdown();
});

// At the top with your other state variables
let timeLeft = 2 * 60; // 5 minutes
let isGameStarted = false;
let countdownValue = 4;
let countdownTimer = null;
let isCountdownActive = true;
let difficultyMultiplier = 1;
let timerInterval = null;

let gameStartTime = 0;
let lastObstacleTime = 0;


let score = 0;
let lastScoreUpdate = Date.now();

// Add these variables at the top with your other state variables
let scoreAnimations = [];
let timeAnimations = [];

// Add this at the top of your script with other variables
let lastCollisionTime = 0;
const COLLISION_COOLDOWN = 2000; // 2 seconds cooldown


let isGameOver = false;
let copCarActive = true; // Track cop car state

let copCarAnimation;


function initCopCar() {
    const copHead = document.querySelector('.cop-head');
    const mirrorGlass = document.querySelector('.mirror-glass');
    const mirrorWidth = mirrorGlass.offsetWidth;
    let position = -50;
    let movingRight = true;
    const speed = 4;
    let copHeadVisible = false;
    let lastSpawnTime = 0;
    let visibilityStartTime = 0;
    const spawnInterval = 5000;
    const spawnChance = 0.4;
    const visibilityDuration = 5000;
    let sirenColor = 'blue';


       
      // Initially hide the cop head
      copHead.style.display = 'none';


    // Create overlay for siren effect
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        opacity: 0;
        z-index: 1000;
    `;
    document.body.appendChild(overlay);
 

 
  
    
    function checkSpeedAndApplyEffects() {
        if (copHeadVisible && $.state.speed > 34) {
            // Toggle siren colors
            if (sirenColor === 'blue') {
                overlay.style.background = 'radial-gradient(rgba(0, 0, 255, 0.3), transparent)';
                sirenColor = 'red';
            } else {
                overlay.style.background = 'radial-gradient(rgba(255, 0, 0, 0.3), transparent)';
                sirenColor = 'blue';
            }
            overlay.style.opacity = '1';

            // Apply score penalty
            const currentTime = Date.now();
            if (currentTime - lastPenaltyTime >= 1000) {
                const scoreElement = document.getElementById('score');
                let currentScore = parseInt(scoreElement.textContent);
                currentScore = Math.max(0, currentScore - 3);
                scoreElement.textContent = currentScore.toString().padStart(4, '0');
                lastPenaltyTime = currentTime;
            }
        } else {
            overlay.style.opacity = '0';
        }
    }

    function animateCop() {

        if (isGameOver) {
            copHead.style.display = 'none';  // Hide the cop head
            return;  // Stop the animation loop
        }
        const currentTime = Date.now();

        // Check if cop head should disappear
        if (copHeadVisible && (currentTime - visibilityStartTime > visibilityDuration)) {
            copHeadVisible = false;
            copHead.style.display = 'none';
            lastSpawnTime = currentTime;
            overlay.style.opacity = '0';
        }
        // Check for spawn conditions
        if (!copHeadVisible && $.state.gameStarted && currentTime - gameStartTime > 10000) {
            if (currentTime - lastSpawnTime > spawnInterval) {
                lastSpawnTime = currentTime;
                if (Math.random() < spawnChance) {
                    copHeadVisible = true;
                    copHead.style.display = 'block';
                    visibilityStartTime = currentTime;
                    position = -50;
                    movingRight = true;
                }
            }
        }

        // Animate if visible
        if (copHeadVisible) {
            if (movingRight) {
                position += speed;
                copHead.style.transform = 'scaleX(1)';
            } else {
                position -= speed;
                copHead.style.transform = 'scaleX(-1)';
            }
            
            if (position > mirrorWidth - 50) {
                movingRight = false;
            } else if (position < -50) {
                movingRight = true;
            }
            
            copHead.style.left = `${position}px`;
        }

        requestAnimationFrame(animateCop);
    }

    // Start the siren effect interval
    const sirenInterval = setInterval(checkSpeedAndApplyEffects, 500); // Check every 500ms

    // Start the animation
    animateCop();

    // Return cleanup function
    return function cleanup() {
        clearInterval(sirenInterval);
        overlay.remove(); // Remove the overlay instead of changing canvas style
    };
}


// Initialize when document loads
document.addEventListener('DOMContentLoaded', function() {
    const cleanup = initCopCar();
    $.state.cleanupCop = cleanup;
});






// First, load your car image at the start of your script
const carImage = new Image();
carImage.src = './assets/images/car_up.png'; // Make sure this path is correct


const steeringWheel = document.getElementById('steeringWheel');
steeringWheel.style.transition = 'transform 0.2s ease-out';
const rotationAmount = 45; // Maximum rotation angle

let batteryLevel = 100;
let batteryDrainRate = 0.1;
const batteryElement = document.getElementById('battery-level');

const batteryImage = new Image();
batteryImage.src = './assets/images/battery_powerup.png';



$.state.batteries = [];
$.state.lastBatteryTime = 0;
$.state.batterySpawnInterval = 5000; // Spawn every 5 seconds

const screen = document.querySelector('.control-panel .screen');



drawBg();
draw();

function draw() {
    if (isGameOver) {
        // Draw game over screen
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        
        // Clear everything first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Add dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set up text styling
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const timeSpan = document.getElementById('time');
        if (timeSpan && timeSpan.textContent === "00:00") {
            // Game Complete text
            ctx.font = 'bold 48px Arial';
            ctx.fillText('Game Complete!', canvas.width / 2, canvas.height / 2 - 50);
        } else {
            // Battery Dead text
            ctx.font = 'bold 48px Arial';
            ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 50);
            ctx.font = '36px Arial';
            ctx.fillText('Battery Dead!', canvas.width / 2, canvas.height / 2);
        }
        // Draw Score
        const scoreElement = document.getElementById('score');
        const score = scoreElement ? scoreElement.textContent : '0000';
        ctx.font = '32px Arial';
        ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 50);

        // Draw refresh message
        ctx.font = '24px Arial';
        ctx.fillText('Refresh page to play again', canvas.width / 2, canvas.height / 2 + 90);

        // Deactivate cop car
    copCarActive = false;
        
        return; // Stop the game loop
    }
setTimeout(function() {
  calcMovement();

       // Update background
       if ($.state.speed > 0) {
        $.state.bgpos += ($.state.currentCurve * 0.02) * ($.state.speed * 0.2);
        $.state.bgpos = $.state.bgpos % $.canvas.width;
        
        $.ctx.putImageData($.storage.bg, $.state.bgpos, 5);
        $.ctx.putImageData($.storage.bg, $.state.bgpos > 0 ? $.state.bgpos - $.canvas.width : $.state.bgpos + $.canvas.width, 5);
    }
  
  //if($.state.speed > 0) {
    $.state.bgpos += ($.state.currentCurve * 0.02) * ($.state.speed * 0.2);
    $.state.bgpos = $.state.bgpos % $.canvas.width;
    
    $.ctx.putImageData($.storage.bg, $.state.bgpos, 5);
    $.ctx.putImageData($.storage.bg, $.state.bgpos > 0 ? $.state.bgpos - $.canvas.width : $.state.bgpos + $.canvas.width, 5);
  //}
  
  $.state.offset += $.state.speed * 0.05;
  if($.state.offset > $.settings.ground.min) {
    $.state.offset = $.settings.ground.min - $.state.offset;
    $.state.startDark = !$.state.startDark;
  }
  drawGround($.ctx, $.state.offset, $.colors.ground, $.colors.groundDark, $.canvas.width);
  
  drawRoad($.settings.road.min + 6, $.settings.road.max + 36, 10, $.colors.roadLine);
  drawRoad($.settings.road.min, $.settings.road.max, 10, $.colors.road);
  checkOutOfBounds();  // Add this line after drawing the roads
  drawRoad(3, 24, 0, $.ctx.createPattern($.canvas2, 'repeat'));
  drawGround($.ctx2, $.state.offset, $.colors.roadLine, $.colors.road, $.canvas.width);
  spawnBattery();
  updateBatteries();
  drawBatteries();
  drawCar();
  drawHUD($.ctx, 630, 340, $.colors.hud);



  spawnObstacle();
  updateObstacles();
  drawObstacles();




     
    // Add these new draws
  
  
  if (isCountdownActive) {
      drawCountdown();
  }
  
  
  requestAnimationFrame(draw);
}, 1000 / $.settings.fps);


  // Update timer every second if game is active
  if ($.state.speed > 0 && isGameStarted) {
  }
// Add this line after your existing code
    updateScore();

}
function drawHUD(ctx, centerX, centerY, color) {
  const radius = 50;
  const startAngle = -220 * (Math.PI / 180);
  const endAngle = 40 * (Math.PI / 180);
  
  // Initialize currentDisplaySpeed if it doesn't exist in state
  if (typeof $.state.currentDisplaySpeed === 'undefined') {
      $.state.currentDisplaySpeed = 0;
  }

  // Get speed value and ensure it's positive
  const rawSpeed = Math.abs($.state.speed); // Use absolute value of speed
  console.log('Raw speed:', rawSpeed);
  
  // Map the raw speed (0-35) to display speed (0-100)
  const mappedSpeed = (rawSpeed / 35) * 100;
  console.log('Mapped speed:', mappedSpeed);
  
  // Smooth speed transition
  $.state.currentDisplaySpeed = lerp($.state.currentDisplaySpeed, mappedSpeed, 0.05);
  
  // Round the display speed
  const displaySpeed = Math.round($.state.currentDisplaySpeed);
  console.log('Display speed:', displaySpeed);
  
  // Calculate progress (0-1 range)
  const progress = displaySpeed / 100;
  const progressAngle = startAngle + (endAngle - startAngle) * progress;

  // Draw background circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fill();
  
  // Draw base track
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 7;
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.stroke();

  // Draw progress arc with gradient
  ctx.beginPath();
  const gradient = ctx.createLinearGradient(
      centerX - radius, centerY - radius,
      centerX + radius, centerY + radius
  );

  // Color gradient based on speed
  if (displaySpeed < 30) {
      gradient.addColorStop(0, '#00fff2');
      gradient.addColorStop(1, '#0099ff');
  } else if (displaySpeed < 70) {
      gradient.addColorStop(0, '#00ff66');
      gradient.addColorStop(1, '#00cc44');
  } else {
      gradient.addColorStop(0, '#ff3300');
      gradient.addColorStop(1, '#cc2200');
  }

  ctx.strokeStyle = gradient;
  ctx.lineWidth = 7;
  ctx.arc(centerX, centerY, radius, startAngle, progressAngle);
  ctx.stroke();

  // Draw speed text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displaySpeed, centerX, centerY);

  // Draw KM/H text
  ctx.font = '12px Arial';
  ctx.fillText('KM/H', centerX, centerY + 20);
}

// Helper function for smooth transitions
function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}


// Helper functions
function map(value, inMin, inMax, outMin, outMax) {
  return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}




// Helper function if you still need it
function map(value, inMin, inMax, outMin, outMax) {
    return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}


function drawPointer(ctx, color, radius, centerX, centerY, angle) {
var point = getCirclePoint(centerX, centerY, radius - 20, angle),
    point2 = getCirclePoint(centerX, centerY, 2, angle + 90),
    point3 = getCirclePoint(centerX, centerY, 2, angle - 90);

ctx.beginPath();
ctx.strokeStyle = "#FF9166";
ctx.lineCap = 'round';
ctx.lineWidth = 4;
ctx.moveTo(point2.x, point2.y);
ctx.lineTo(point.x, point.y);
ctx.lineTo(point3.x, point3.y);
ctx.stroke();

ctx.beginPath();
ctx.arc(centerX, centerY, 9, 0, 2 * Math.PI, false);
ctx.fillStyle = color;
ctx.fill();
}

function drawTig(ctx, x, y, radius, angle, size) {
var startPoint = getCirclePoint(x, y, radius - 4, angle),
    endPoint = getCirclePoint(x, y, radius - size, angle)

ctx.beginPath();
ctx.lineCap = 'round';
ctx.moveTo(startPoint.x, startPoint.y);
ctx.lineTo(endPoint.x, endPoint.y);
ctx.stroke();
}

function getCirclePoint(x, y, radius, angle) {
  var radian = (angle / 180) * Math.PI;

  return {
    x: x + radius * Math.cos(radian),
    y: y + radius * Math.sin(radian)
  }
}

function updateBatteryVisuals(increase = 0) {
    const batteryElement = document.getElementById('battery-level');
    const batteryPercentage = document.getElementById('battery-percentage');
    const screen = document.querySelector('.screen');

    // Handle battery increase if specified
    if (increase > 0) {
        batteryLevel += increase;
        // Make sure battery doesn't exceed 100%
        batteryLevel = Math.min(100, batteryLevel);
    }

    // Only proceed if the elements exist
    if (!batteryElement || !batteryPercentage) {
        console.warn('Battery elements not found');
        return;
    }
    
    // Update battery width
    batteryElement.style.width = batteryLevel + '%';

    // Update percentage display
    batteryPercentage.textContent = Math.round(batteryLevel) + '%';
    
    // Update colors and messages based on battery level
    if (batteryLevel > 60) {
        batteryElement.style.backgroundColor = '#32cd32'; // Green
        if (screen) screen.textContent = ''; // Clear message
    } else if (batteryLevel > 30) {
        batteryElement.style.backgroundColor = '#ffd700'; // Yellow
        if (screen) screen.textContent = ''; // Clear message
    } else if (batteryLevel > 0) {
        batteryElement.style.backgroundColor = '#ff4444'; // Red
        showScreenMessage('Battery Low!', '#ff4444');
    }
}




function calcMovement() {
  var move = $.state.speed * 0.01,
      newCurve = 0;

 // Only stop when completely depleted
 // Only stop when completely depleted
 if (batteryLevel <= 0) {
    console.log('Battery depleted, showing game over');
    isGameOver = true; // Set game over state
    $.state.speed = 0;
    batteryLevel = 0;
    $.state.keypress = {}; // Clear any active key presses
    return; // Stop further processing
}
  // Handle acceleration and battery drain
  if ($.state.keypress.up) {
    if (batteryLevel > 0) {  // Only allow acceleration if there's battery power
        $.state.speed += $.state.car.acc - ($.state.speed * 0.015);
            
        // Drain battery
        batteryLevel -= batteryDrainRate;
        batteryLevel = Math.max(0, batteryLevel);
        updateBatteryVisuals();


         // Update the battery level display
         const batteryElement = document.getElementById('battery-level');
         if (batteryElement) {
             batteryElement.style.width = batteryLevel + '%';
         }
    }
  } else if ($.state.speed > 0) {
    $.state.speed -= $.state.car.friction;
  } if(batteryLevel < 0) {
    $.state.speed = Math.max(0, $.state.speed - $.state.car.friction * 2);

  }
  // Handle braking
  if ($.state.keypress.down && $.state.speed > 0) {
      $.state.speed -= 1;
  }

  batteryElement.style.width = batteryLevel + '%';
  if (batteryLevel > 60) {
      batteryElement.style.backgroundColor = '#32cd32'; // Green
      document.querySelector('.screen').textContent = ''; // Clear message
  } else if (batteryLevel > 30) {
      batteryElement.style.backgroundColor = '#ffd700'; // Yellow
      document.querySelector('.screen').textContent = ''; // Clear message
  } else {
      batteryElement.style.backgroundColor = '#ff4444'; // Red
  }

  // Left and right movement
  $.state.xpos -= ($.state.currentCurve * $.state.speed) * 0.005;

  if ($.state.speed) {
      if ($.state.keypress.left) {
          $.state.xpos += (Math.abs($.state.turn) + 7 + ($.state.speed > $.state.car.maxSpeed / 4 ? ($.state.car.maxSpeed - ($.state.speed / 2)) : $.state.speed)) * 0.2;
          $.state.turn -= 1;
      }

      if ($.state.keypress.right) {
          $.state.xpos -= (Math.abs($.state.turn) + 7 + ($.state.speed > $.state.car.maxSpeed / 4 ? ($.state.car.maxSpeed - ($.state.speed / 2)) : $.state.speed)) * 0.2;
          $.state.turn += 1;
      }

      if ($.state.turn !== 0 && !$.state.keypress.left && !$.state.keypress.right) {
          $.state.turn += $.state.turn > 0 ? -0.25 : 0.25;
      }
  }

  // Clamp values
  $.state.turn = clamp($.state.turn, -5, 5);
  $.state.speed = clamp($.state.speed, 0, $.state.car.maxSpeed);

  // Section handling
  $.state.section -= $.state.speed;

  if ($.state.section < 0) {
      $.state.section = randomRange(1000, 9000);
      if (Math.random() > 0.2) {
          $.state.curve = 0;
      } else {
          newCurve = (Math.random() * 2 - 1) * 25;
          if (Math.abs($.state.curve - newCurve) < 20) {
              newCurve = (Math.random() * 2 - 1) * 25;
          }
          $.state.curve = newCurve;
      }
  }

  $.state.currentCurve += ($.state.curve - $.state.currentCurve) * 0.01;

  if ($.state.currentCurve < $.state.curve && move < Math.abs($.state.currentCurve - $.state.curve)) {
      $.state.currentCurve += move;
  } else if ($.state.currentCurve > $.state.curve && move < Math.abs($.state.currentCurve - $.state.curve)) {
      $.state.currentCurve -= move;
  }

  if (Math.abs($.state.xpos) > 550) {
      $.state.speed *= 0.96;
  }

  $.state.xpos = clamp($.state.xpos, -650, 650);
}


function keyUp(e) {
  move(e, false);

    // Reset car image when left or right key is released
    if (e.keyCode === 37 || e.keyCode === 39 || e.keyCode === 68 || e.keyCode === 65) {
        carImage.src = './assets/images/car_up.png';
        steeringWheel.style.transform = `rotate(0deg)`; // Return wheel to center

      }
}

function keyDown(e) {
     // Change car image based on the arrow keys
     if (e.keyCode === 37 || e.keyCode === 65) { // Left arrow key
        carImage.src = './assets/images/car_left.png';
        steeringWheel.style.transform = `rotate(-${rotationAmount}deg)`; // Rotate wheel left
    } else if (e.keyCode === 39 || e.keyCode === 68) { // Right arrow key
        carImage.src = './assets/images/car_right.png';
        steeringWheel.style.transform = `rotate(${rotationAmount}deg)`; // Rotate wheel right
    } else if (e.keyCode === 38 || e.keyCode === 87) { // Up arrow key
        steeringWheel.style.transform = `rotate(0deg)`; // Center the wheel
    }
  move(e, true);

}

function move(e, isKeyDown) {
    if((e.keyCode >= 37 && e.keyCode <= 40) || // Arrow keys
       (e.keyCode >= 65 && e.keyCode <= 87)) {  // WASD keys
        e.preventDefault();
    }

    // Left: arrow left (37) or A (65)
    if(e.keyCode === 37 || e.keyCode === 65) {
        $.state.keypress.left = isKeyDown;
    } 

  // Up: arrow up (38) or W (87)
  if(e.keyCode === 38 || e.keyCode === 87) {
    $.state.keypress.up = isKeyDown;
} 

  // Right: arrow right (39) or D (68)
  if(e.keyCode === 39 || e.keyCode === 68) {
    $.state.keypress.right = isKeyDown;
} 

   // Down: arrow down (40) or S (83)
   if(e.keyCode === 40 || e.keyCode === 83) {
    $.state.keypress.down = isKeyDown;
}
}

function randomRange(min, max) {
return min + Math.random() * (max - min);
}

function norm(value, min, max) {
return (value - min) / (max - min);
}

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end;
}

function map(value, sourceMin, sourceMax, destMin, destMax) {
return lerp(norm(value, sourceMin, sourceMax), destMin, destMax);
}

function clamp(value, min, max) {
return Math.min(Math.max(value, min), max);
}

function drawBg() {
$.ctx.fillStyle = $.colors.sky;
$.ctx.fillRect(0, 0, $.canvas.width, $.settings.skySize);
drawMountain(0, 60, 200);
drawMountain(280, 40, 200);
drawMountain(400, 80, 200);
drawMountain(550, 60, 200);

$.storage.bg = $.ctx.getImageData(0, 0, $.canvas.width, $.canvas.height);
}

function drawMountain(pos, height, width) {
$.ctx.fillStyle = $.colors.mountains;
$.ctx.strokeStyle = $.colors.mountains;
$.ctx.lineJoin = "round";
$.ctx.lineWidth = 20;
$.ctx.beginPath();
$.ctx.moveTo(pos, $.settings.skySize);
$.ctx.lineTo(pos + (width / 2), $.settings.skySize - height);
$.ctx.lineTo(pos + width, $.settings.skySize);
$.ctx.closePath();
$.ctx.stroke();
$.ctx.fill();
}

function drawSky() {
$.ctx.fillStyle = $.colors.sky;
$.ctx.fillRect(0, 0, $.canvas.width, $.settings.skySize);
}

function drawRoad(min, max, squishFactor, color) {
var basePos = $.canvas.width + $.state.xpos;

$.ctx.fillStyle = color;
$.ctx.beginPath();
$.ctx.moveTo(((basePos + min) / 2) - ($.state.currentCurve * 3), $.settings.skySize);
$.ctx.quadraticCurveTo((((basePos / 2) + min)) + ($.state.currentCurve / 3) + squishFactor, $.settings.skySize + 52, (basePos + max) / 2, $.canvas.height);
$.ctx.lineTo((basePos - max) / 2, $.canvas.height);
$.ctx.quadraticCurveTo((((basePos / 2) - min)) + ($.state.currentCurve / 3) - squishFactor, $.settings.skySize + 52, ((basePos - min) / 2) - ($.state.currentCurve * 3), $.settings.skySize);
$.ctx.closePath();
$.ctx.fill();
}

function drawCar() {
    const carWidth = 150;  // Width of the car
    const carHeight = 120;  // Height of the car
    const bottomPadding = 20;  // Padding from bottom of canvas
    
    const carX = ($.canvas.width / 2) - (carWidth / 2) + $.state.turn;
    const carY = $.canvas.height - carHeight - 20; // 20 is bottom padding

    drawShadow(carX, carY, carWidth, carHeight);


    if (carImage.complete) {
      $.ctx.drawImage(carImage, carX, carY, carWidth, carHeight);
  }

    
}

function drawShadow(carX, carY, carWidth, carHeight) {
    const shadowWidth = carWidth;
    const shadowHeight = 40;
    const shadowY = carY + carHeight - 50; // Changed from -20 to -50 to move shadow up
    
    $.ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
    $.ctx.beginPath();
    
    // Draw curved shadow (inverted curve)
    $.ctx.moveTo(carX - 1 + $.state.turn, shadowY);
    $.ctx.quadraticCurveTo(
        carX + (shadowWidth / 2) + $.state.turn, // control point x
        shadowY + 30, // Control point for downward curve
        carX + shadowWidth + $.state.turn, // end point x
        shadowY // end point y
    );
    
    // Add more thickness to shadow
    $.ctx.lineTo(carX + shadowWidth + $.state.turn, shadowY + 40);
    $.ctx.quadraticCurveTo(
        carX + (shadowWidth / 2) + $.state.turn,
        shadowY + 65,
        carX - 1 + $.state.turn,
        shadowY + 40
    );
    
    $.ctx.closePath();
    $.ctx.fill();
}




function drawGround(ctx, offset, lightColor, darkColor, width) {
var pos = ($.settings.skySize - $.settings.ground.min) + offset, stepSize = 1, drawDark = $.state.startDark, firstRow = true;
ctx.fillStyle = lightColor;
ctx.fillRect(0, $.settings.skySize, width, $.settings.ground.size);

ctx.fillStyle =  darkColor;
while(pos <= $.canvas.height) {
  stepSize = norm(pos, $.settings.skySize, $.canvas.height) * $.settings.ground.max;
  if(stepSize < $.settings.ground.min) {
    stepSize = $.settings.ground.min;
  }

  if(drawDark) {
    if(firstRow) {
      ctx.fillRect(0, $.settings.skySize, width, stepSize - (offset > $.settings.ground.min ? $.settings.ground.min : $.settings.ground.min - offset));
    } else {
      ctx.fillRect(0, pos < $.settings.skySize ? $.settings.skySize : pos, width, stepSize);
    }
  }
  
  firstRow = false;
  pos += stepSize;
  drawDark = !drawDark;
}
}


function createGradient(ctx, x, y, radius) {
    const gradient = ctx.createLinearGradient(
        x - radius, y - radius, 
        x + radius, y + radius
    );
    gradient.addColorStop(0, '#00fff2');    // Cyan
    gradient.addColorStop(0.5, '#0099ff');  // Blue
    gradient.addColorStop(1, '#0062ff');    // Deep Blue
    return gradient;
}

function createGlowEffect(ctx, x, y, radius) {
    const gradient = ctx.createRadialGradient(
        x, y, radius - 5,
        x, y, radius + 5
    );
    gradient.addColorStop(0, 'rgba(0, 247, 255, 0.5)');
    gradient.addColorStop(1, 'rgba(0, 247, 255, 0)');
    return gradient;
}

function drawModernTicks(ctx, x, y, radius, startAngle, endAngle) {
    const totalTicks = 20;
    const angleRange = endAngle - startAngle;
    
    for (let i = 0; i <= totalTicks; i++) {
        const angle = startAngle + (angleRange * (i / totalTicks));
        const tickLength = i % 2 === 0 ? 15 : 10;
        
        const outerPoint = {
            x: x + (radius + 5) * Math.cos(angle),
            y: y + (radius + 5) * Math.sin(angle)
        };
        
        const innerPoint = {
            x: x + (radius - tickLength) * Math.cos(angle),
            y: y + (radius - tickLength) * Math.sin(angle)
        };

        ctx.beginPath();
        ctx.strokeStyle = i % 2 === 0 ? 
            'rgba(255, 255, 255, 0.8)' : 
            'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = i % 2 === 0 ? 2 : 1;
        ctx.moveTo(innerPoint.x, innerPoint.y);
        ctx.lineTo(outerPoint.x, outerPoint.y);
        ctx.stroke();
    }
}

// Usage example in your game loop:
function gameLoop() {

   // Update and check collisions for all obstacles
// Modify your collision check loop
$.state.obstacles.forEach(obstacle => {
  if (obstacle.visible && !obstacle.hasCollided) {
      const currentTime = Date.now();
      
      // Check if enough time has passed since last collision
      if (currentTime - lastCollisionTime >= COLLISION_COOLDOWN) {
          if (obstacle.checkCollision($.state.xpos)) {
              console.log('Collision detected in game loop');
              obstacle.hasCollided = true; // Mark this obstacle as collided
              lastCollisionTime = currentTime; // Update collision time
              // showCrashPopup();
              
              // Reset obstacle collision state after cooldown
              setTimeout(() => {
                  obstacle.hasCollided = false;
              }, COLLISION_COOLDOWN);
          }
      }
  }
});
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw game elements
    // ...
    
    // Draw the futuristic HUD
    drawHUD(
        ctx,
        canvas.width - 100,  // x position
        canvas.height - 100, // y position
        80,                  // radius
        currentSpeed,        // current value
        maxSpeed            // maximum value
    );
    
    requestAnimationFrame(gameLoop);

}


function startIndependentTimer() {
  // Clear any existing timer first
  if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
  }

  let timeLeft = 2 * 60; // 3 minute game length
  const timeSpan = document.getElementById('time');
  
  console.log("Starting independent timer..."); // Debug log

  timerInterval = setInterval(() => {
      if (isGameStarted && !isCountdownActive) {
          if (timeLeft >= 0) {
              const minutes = Math.floor(timeLeft / 60);
              const seconds = timeLeft % 60;
              
              // Update display with leading zeros
              timeSpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
              console.log(`Timer: ${timeSpan.textContent}`); // Debug log
              timeLeft--;
          } else {
              clearInterval(timerInterval);
              timeSpan.textContent = "00:00";
              isGameStarted = false;
              // Add game over logic here
              console.log("Timer finished!"); // Debug log
          }
      }
  }, 1000);
}

// Add this to your JavaScript file
document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.querySelector('.menu-btn');
    const dropdownContent = document.querySelector('.dropdown-content');

    // Close dropdown when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.matches('.menu-btn')) {
            const dropdowns = document.getElementsByClassName('dropdown-content');
            for (let dropdown of dropdowns) {
                if (dropdown.style.display === 'block') {
                    dropdown.style.display = 'none';
                }
            }
        }
    });


    // Toggle dropdown on menu button click
    menuBtn.addEventListener('click', function(event) {
        event.stopPropagation();
        dropdownContent.style.display = 
            dropdownContent.style.display === 'block' ? 'none' : 'block';
    });
});




class Obstacle {
    constructor(canvas) {
      this.canvas = canvas;
      this.width = 200;
      this.height = 200;
      this.progress = 0;
      this.x = 0;
      this.y = 0;
      this.lane = 0;
      this.hasCollided = false;
      this.collisionBox = {
          width: this.width * 0.6, // Smaller collision box
          height: this.height * 0.6
      };// Add this flag to track collision
      this.collisionThreshold = 0.7; // Only check collision when obstacle is 70% down the screen

        
        // Use the same road parameters as drawRoad
        const basePos = this.canvas.width + $.state.xpos;
        const min = $.settings.road.min;
        const max = $.settings.road.max;
        
        // Randomly choose left or right side of the road center
        const isLeftSide = Math.random() < 0.5;
        
        // Calculate spawn position within road boundaries
        if (isLeftSide) {
            // Left half of the road
            const leftEdge = ((basePos - min) / 2) - ($.state.currentCurve * 3);
            const centerLine = ((basePos) / 2) - ($.state.currentCurve * 3);
            this.x = leftEdge + (centerLine - leftEdge) / 2; // Middle of left lane
        } else {
            // Right half of the road
            const rightEdge = ((basePos + min) / 2) - ($.state.currentCurve * 3);
            const centerLine = ((basePos) / 2) - ($.state.currentCurve * 3);
            this.x = centerLine + (rightEdge - centerLine) / 2; // Middle of right lane
        }
        
        this.y = $.settings.skySize;
        
        this.image = new Image();
        this.image.src = './assets/images/car_01.png';
    }

       // Add collision detection method

       drawDebugBoxes(pLeft, pTop, pWidth, pHeight, oLeft, oTop, oWidth, oHeight, isColliding) {
        // Draw player car box (blue when no collision, red when colliding)
        $.ctx.strokeStyle = isColliding ? 'red' : 'blue';
        $.ctx.lineWidth = 2;
        $.ctx.strokeRect(pLeft, pTop, pWidth, pHeight);

        // Draw obstacle box (green when no collision, red when colliding)
        $.ctx.strokeStyle = isColliding ? 'red' : 'green';
        $.ctx.strokeRect(oLeft, oTop, oWidth, oHeight);
    }
    
    checkCollision() {
      // Car dimensions
      const carWidth = 180;
      const carHeight = 130;
      const bottomPadding = 20;
      
      // Calculate car position
      const carX = (this.canvas.width / 2) - (carWidth / 2);
      const carY = this.canvas.height - carHeight - bottomPadding;
      
      // Player car collision box
      const collisionScale = 0.6;
      const playerWidth = carWidth * collisionScale;
      const playerHeight = carHeight * collisionScale;
      const playerLeft = carX + (carWidth - playerWidth) / 2;
      const playerRight = playerLeft + playerWidth;
      const playerTop = carY + (carHeight - playerHeight) / 2;
      const playerBottom = playerTop + playerHeight;
  
      // Use the same scale as in draw() method
      const scale = 0.3 + (this.progress * 0.7);
      const obstacleWidth = this.width * scale * 0.8;
      const obstacleHeight = this.height * scale * 0.8;
      
      // Obstacle collision box
      const obstacleLeft = this.x - (obstacleWidth / 2);
      const obstacleRight = obstacleLeft + obstacleWidth;
      const obstacleTop = this.y;
      const obstacleBottom = this.y + obstacleHeight;
  
      // Calculate overlap percentages
      const overlapX = Math.min(
          playerRight - obstacleLeft,
          obstacleRight - playerLeft
      );
      const overlapY = Math.min(
          playerBottom - obstacleTop,
          obstacleBottom - playerTop
      );
  
      // Calculate minimum required overlap (25% of the smaller dimension)
      const minOverlapX = Math.min(playerWidth, obstacleWidth) * 0.25;
      const minOverlapY = Math.min(playerHeight, obstacleHeight) * 0.25;
  
      // Check if there's significant overlap (more than 25%)
      const collision = (
          overlapX > minOverlapX &&
          overlapY > minOverlapY &&
          playerLeft < obstacleRight &&
          playerRight > obstacleLeft &&
          playerTop < obstacleBottom &&
          playerBottom > obstacleTop
      );
  
      // If there's a collision and we haven't registered it yet
   
     // When collision is detected
 // Then in your collision detection code
// Inside your checkCollision method
if (collision && !this.hasCollided) {
  this.hasCollided = true;
  updateScore(-5);
  flashScreen('red') // Add this line
}
else if (!collision) {
  this.hasCollided = false;
}




  

      // Always draw debug boxes
      // this.drawDebugBoxes(
      //     playerLeft, playerTop, playerWidth, playerHeight,
      //     obstacleLeft, obstacleTop, obstacleWidth, obstacleHeight,
      //     collision
      // );
  
      return collision;
  }
  
  
  
  
    
    
  
update() {
  const basePos = $.canvas.width + $.state.xpos;
  const dividerPos = ((basePos + (3 + 24) / 2) / 2);

  if ($.state.speed > 0) {
    this.progress += 0.005; // You can adjust this value to change speed


      // Handle lane movement
      if (this.moveProgress < 1) {
          this.moveProgress += 0.03;
      }

      // Calculate curve offset based on road curve
      const curveOffset = $.state.currentCurve * (this.progress * 2);

      // Maintain lane position while following road curve
      if (this.lane === 'left') {
          this.x = dividerPos - 100 + curveOffset; // 100 is the laneOffset
      } else {
          this.x = dividerPos + 100 + curveOffset; // 100 is the laneOffset
      }

      // Calculate Y position for forward movement
      const startY = $.settings.skySize;
      const endY = this.canvas.height;
      this.y = startY + (endY - startY) * this.progress;

      this.lastX = this.x;
      this.lastY = this.y;
      this.visible = true;
      this.checkCollision();
  } else {
      this.x = this.lastX;
      this.y = this.lastY;
      
      if (this.y <= $.settings.skySize) {
          this.visible = false;
      }
  }

  // if (this.checkCollision($.state.xpos, 300)) {
  //     this.hasCollided = true;
  //     // showCrashPopup();
  // }
 // Check if car is out of bounds
 checkOutOfBounds();
  return this.progress >= 1;
}


  draw(ctx) {
    if (this.image.complete && this.visible && this.y > $.settings.skySize) {
        const scale = 0.3 + (this.progress * 0.7);
        const width = this.width * scale;
        const height = this.height * scale;
        
        const x = this.x - (width / 2);
        
        // Draw the obstacle
        ctx.drawImage(this.image, x, this.y, width, height);

        // // Draw collision box (for debugging)
        // ctx.strokeStyle = 'red';
        // ctx.lineWidth = 2;
        // ctx.strokeRect(
        //     this.x - (width / 2),
        //     this.y - (height / 2),
        //     width,
        //     height
        // );
    }
}
}





// Put this at the top level of your script.js, outside any classes

// Add CSS for the flash effect
const style = document.createElement('style');
style.textContent = `
    .control-panel .screen {
        transition: background-color 0.3s ease;
    }
    
    .screen-flash {
        background-color: red !important;
    }
`;
document.head.appendChild(style);

function flashScreen(color = 'red') {
  // Create keyframes dynamically
  const keyframes = `
      @keyframes flash-${color} {
          0% { background-color: transparent; }
          50% { background-color: ${color === 'red' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 0, 0.3)'}; }
          100% { background-color: transparent; }
      }
  `;

  // Add keyframes to document
  const styleSheet = document.createElement('style');
  styleSheet.textContent = keyframes;
  document.head.appendChild(styleSheet);

  // Apply animation
  screen.style.animation = `flash-${color} 0.5s`;

  // Clean up
  setTimeout(() => {
      screen.style.animation = '';
      document.head.removeChild(styleSheet);
  }, 500);
}





function spawnObstacle() {
  const currentTime = Date.now();
  
  $.state.obstacleSpawnInterval = 2000;


  if (!$.state.gameStarted || currentTime - $.state.lastObstacleTime < $.state.obstacleSpawnInterval) {
      return;
  }

  if ($.state.obstacles.length < 3) {
      const basePos = $.canvas.width + $.state.xpos;
      
      // Get divider line position (center of the pattern)
      const dividerPos = ((basePos + (3 + 24) / 2) / 2);
      
      // Increased lane offset to use more of each half of the road
      const laneOffset = 100; // Increased from 70 to use more road width
      
      // Two distinct spawn positions using more of each lane half
      const leftSpawnX = dividerPos - laneOffset;  // Further left in left lane
      const rightSpawnX = dividerPos + laneOffset; // Further right in right lane
      
      // Force random 50/50 choice between lanes
      const lane = Math.floor(Math.random() * 2); // 0 or 1
      const spawnX = lane === 0 ? leftSpawnX : rightSpawnX;

      const newObstacle = new Obstacle($.canvas);
      newObstacle.x = spawnX;
      newObstacle.y = $.settings.skySize;
      newObstacle.lane = lane === 0 ? 'left' : 'right';
      newObstacle.originalOffset = spawnX - dividerPos;
      // const minProgress = 0.3;
      // const maxProgress = 0.7;
      newObstacle.progress = 0.2;
      
      $.state.obstacles.push(newObstacle);
      $.state.lastObstacleTime = currentTime;
  }
}

















    
    
    function updateObstacles() {
        $.state.obstacles = $.state.obstacles.filter(obstacle => !obstacle.update());
    }
 // Update your drawObstacles function to respect visibility
function drawObstacles() {
    $.state.obstacles.forEach(obstacle => {
        if (obstacle.visible && obstacle.y > $.settings.skySize) {
            obstacle.draw($.ctx);
        }
    });
}

function startCountdown() {
    // Reset game state
    isGameStarted = false;
    isCountdownActive = true;
    countdownValue = 4;  // Changed from 3 to 4
    
    const timeSpan = document.getElementById('time');
    timeSpan.textContent = "02:00";
  
    function updateCountdown() {
        if (countdownValue > 0) {
            console.log(`Countdown: ${countdownValue}`);
            countdownValue--;
            setTimeout(updateCountdown, 1000);
        } else {
            console.log("GO!");
            isCountdownActive = false;
            isGameStarted = true;
            
            // Start the game timer here
            let timerInterval = setInterval(updateTimer, 1000);
            
            // Add 5 second delay before allowing obstacles to spawn
            setTimeout(() => {
                $.state.gameStarted = true;  // Only allow obstacles after 5 seconds
                console.log("Obstacles can now spawn!");
            }, 3000);
            
            startIndependentTimer();
            draw();
        }
    }
  
    updateCountdown();
  }
  









function drawCountdown() {
  if (isCountdownActive) {
      $.ctx.save();
      $.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      $.ctx.fillRect(0, 0, $.canvas.width, $.canvas.height);
      
      $.ctx.fillStyle = '#ffffff';
      $.ctx.font = 'bold 72px Arial';
      $.ctx.textAlign = 'center';
      $.ctx.textBaseline = 'middle';
      
      const text = countdownValue === 0 ? 'GO!' : countdownValue.toString();
      $.ctx.fillText(text, $.canvas.width / 2, $.canvas.height / 2);
      $.ctx.restore();
  }
}


function resetGame() {
  if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
  }
  isGameStarted = false;
  isCountdownActive = false;
  const timeSpan = document.getElementById('time');
  timeSpan.textContent = "03:00";
}

function updateScore(decrease = false) {
  const currentTime = Date.now();
  const timeDiff = currentTime - lastScoreUpdate;
  
      // For collision-based score decrease
      if (decrease) {
        // Make sure decrease is treated as a number
        const decreaseAmount = Number(decrease);
        console.log('Decrease amount:', decreaseAmount); // Debug log
        
        // Decrease score
        score -= decreaseAmount;
        
        // Prevent negative scores
        score = Math.max(0, score);
        
        // Format and update score immediately
        const formattedScore = score.toString().padStart(4, '0');
        const scoreElement = document.getElementById('score');
        if (scoreElement) {
            scoreElement.textContent = formattedScore;
        }
        
        console.log('Score decreased by:', decreaseAmount, 'New score:', score); // Debug log
        return;
    }
  
  // Rest of the function remains the same...
  const isMoving = (
      $.state.keypress.up || 
      $.state.keypress.down || 
      $.state.keypress.left || 
      $.state.keypress.right
  );
  
  if (timeDiff >= 3000 && isMoving) {
      score += 10;
      lastScoreUpdate = currentTime;
      const formattedScore = score.toString().padStart(4, '0');
      const scoreElement = document.getElementById('score');
      if (scoreElement) {
          scoreElement.textContent = formattedScore;
      }
  }
}


  function drawBattery() {
    // Define battery dimensions
    const batteryWidth = 50;  // Adjust size as needed
    const batteryHeight = 50; // Adjust size as needed
    
    // Position the battery on the road
    const batteryX = Math.random() * ($.canvas.width - batteryWidth);  // Random X position
    const batteryY = $.settings.skySize + 100;  // Position it below the sky on the road
    
    // Draw the battery if image is loaded
    if (batteryImage.complete) {
        $.ctx.drawImage(batteryImage, batteryX, batteryY, batteryWidth, batteryHeight);
    }
}


class Battery {
  constructor(canvas) {
    this.canvas = canvas;
    this.width = 50;
    this.height = 50;
    this.progress = 0.2;  // Start at same progress as obstacles
    this.moveProgress = 0;
    this.x = 0;
    this.y = 0;
    this.lane = '';  // 'left' or 'right'
    this.visible = true;
    this.lastX = 0;
    this.lastY = 0;
}

update() {
  const basePos = $.canvas.width + $.state.xpos;
  const dividerPos = ((basePos + (3 + 24) / 2) / 2);

  if ($.state.speed > 0) {
      this.progress += 0.005; // Same rate as obstacles

      // Handle lane movement
      if (this.progress > 0.7 && this.progress < 0.9) { // Only check collision in this range
        if (this.checkCollision()) {
            // Handle collision
            updateBatteryVisuals(30);
            return true; // Remove battery
        }
    }
    

      // Calculate curve offset based on road curve
      const curveOffset = $.state.currentCurve * (this.progress * 2);

      // Maintain lane position while following road curve
      if (this.lane === 'left') {
          this.x = dividerPos - 100 + curveOffset; // 100 is the laneOffset
      } else {
          this.x = dividerPos + 100 + curveOffset; // 100 is the laneOffset
      }

      // Calculate Y position for forward movement
      const startY = $.settings.skySize;
      const endY = this.canvas.height;
      this.y = startY + (endY - startY) * this.progress;

      this.lastX = this.x;
      this.lastY = this.y;
      this.visible = true;
  } else {
      this.x = this.lastX;
      this.y = this.lastY;
      
      if (this.y <= $.settings.skySize) {
          this.visible = false;
      }
  }

  return this.progress >= 1;
}



  draw(ctx) {
      if (batteryImage.complete && this.visible && this.y > $.settings.skySize) {
          const scale = 0.3 + (this.progress * 0.7);
          const width = this.width * scale;
          const height = this.height * scale;
          
          const x = this.x - (width / 2);
          ctx.drawImage(batteryImage, x, this.y, width, height);
      }
  }

  checkCollision(carX, carY) {
    if (!this.visible) return false;
    
    // Car dimensions - adjust these to match your car's visual size
    const carWidth = 60;
    const carHeight = 30;
    
    // Calculate car position (centered on screen)
    const carLeft = (this.canvas.width / 2) - (carWidth / 2); // Center car horizontally
    const carRight = carLeft + carWidth;
    const carTop = this.canvas.height - carHeight - 50; // Adjust height from bottom
    const carBottom = carTop + carHeight;
    
    // Calculate battery size
    const scale = 0.3 + (this.progress * 0.7);
    const batteryWidth = this.width * scale;
    const batteryHeight = this.height * scale;
    
    // Calculate battery bounds
    const batteryLeft = this.x - (batteryWidth / 2);
    const batteryRight = batteryLeft + batteryWidth;
    const batteryTop = this.y;
    const batteryBottom = this.y + batteryHeight;
    
    // Add debug visualization
    if ($.settings.debug) { // Add a debug flag in your settings
        // Draw car hitbox
        $.ctx.strokeStyle = 'red';
        $.ctx.lineWidth = 2;
        $.ctx.strokeRect(carLeft, carTop, carWidth, carHeight);
        
        // Draw battery hitbox
        $.ctx.strokeStyle = 'blue';
        $.ctx.strokeRect(batteryLeft, batteryTop, batteryWidth, batteryHeight);
        
        // Draw collision info
        $.ctx.fillStyle = 'white';
        $.ctx.font = '12px Arial';
        $.ctx.fillText(`Car: ${Math.round(carLeft)},${Math.round(carTop)}`, carLeft, carTop - 10);
        $.ctx.fillText(`Battery: ${Math.round(batteryLeft)},${Math.round(batteryTop)}`, batteryLeft, batteryTop - 10);
    }
    
    // Check for significant overlap (25% of the smaller dimension)
    const overlapX = Math.min(carRight - batteryLeft, batteryRight - carLeft);
    const overlapY = Math.min(carBottom - batteryTop, batteryBottom - carTop);
    
    // Calculate minimum required overlap
    const minOverlapX = Math.min(carWidth, batteryWidth) * 0.25;
    const minOverlapY = Math.min(carHeight, batteryHeight) * 0.25;
    
    // Check if there's significant overlap
    const collision = overlapX > minOverlapX && 
                     overlapY > minOverlapY && 
                     batteryLeft < carRight && 
                     batteryRight > carLeft && 
                     batteryTop < carBottom && 
                     batteryBottom > carTop;
    
    if (collision) {
        console.log('Collision detected!', {
            overlapX,
            overlapY,
            minOverlapX,
            minOverlapY
        });
    }
    
    return collision;
}

}





function spawnBattery() {
  const currentTime = Date.now();
  
  if (currentTime - $.state.lastBatteryTime > $.state.batterySpawnInterval) {
      if ($.state.batteries.length < 2) {
          const basePos = $.canvas.width + $.state.xpos;
          
          // Get divider line position (center of the pattern)
          const dividerPos = ((basePos + (3 + 24) / 2) / 2);
          
          // Use same lane offset as obstacles
          const laneOffset = 100;
          
          // Random lane selection
          const lane = Math.floor(Math.random() * 2);
          const spawnX = lane === 0 ? dividerPos - laneOffset : dividerPos + laneOffset;

          const newBattery = new Battery($.canvas);
          newBattery.x = spawnX;
          newBattery.lane = lane === 0 ? 'left' : 'right';
          newBattery.originalOffset = spawnX - dividerPos;
          
          $.state.batteries.push(newBattery);
          $.state.lastBatteryTime = currentTime;
      }
  }
}

function updateBatteries() {
  $.state.batteries = $.state.batteries.filter(battery => {
      if (battery.update()) return false;
      
      // Now we don't need to pass car position since we're calculating it inside checkCollision
      if (battery.checkCollision()) {
          console.log('Battery collected!');
          updateBatteryVisuals(30);
          createCollectionEffect(battery.x, battery.y);
          return false;
      }
      return true;
  });
}


function drawBatteries() {
  $.state.batteries.forEach(battery => {
      if (battery.visible && battery.y > $.settings.skySize) {
          battery.draw($.ctx);
      }
  });
}

function createCollectionEffect(x, y) {
  const floatingText = document.createElement('div');
  floatingText.style.position = 'absolute';
  floatingText.style.left = x + 'px';
  floatingText.style.top = y + 'px';
  floatingText.style.color = '#32cd32';
  floatingText.style.fontWeight = 'bold';
  floatingText.textContent = '+30%';
  floatingText.style.animation = 'floatUp 1s ease-out forwards';
  document.body.appendChild(floatingText);
  
  setTimeout(() => {
      document.body.removeChild(floatingText);
  }, 1000);
}


function checkOutOfBounds() {
  // Get the road boundaries with the same offset as the road lines
  const leftBoundary = $.settings.road.min + 6;  // Match the road line offset
  const rightBoundary = $.settings.road.max + 36; // Match the road line offset
  
  // Calculate car's position relative to the road
  const carPosition = $.state.xpos + ($.canvas.width / 2);
  
  // Add debounce to prevent multiple rapid calls
  if (!this.lastPenaltyTime) {
      this.lastPenaltyTime = 0;
  }
  
  // Check if car is outside road boundaries
  if (carPosition < leftBoundary || carPosition > rightBoundary) {
      if (Date.now() - this.lastPenaltyTime > 500) { // 500ms cooldown
          console.log("Out of bounds - deducting 2 points"); // Debug log
          score -= 2;
          
          // Update display
          const formattedScore = score.toString().padStart(4, '0');
          const scoreElement = document.getElementById('score');
          if (scoreElement) {
              scoreElement.textContent = formattedScore;
          }
          
          flashScreen('yellow'); // Use yellow for out of bounds
          this.lastPenaltyTime = Date.now();
      }
  }
}



function showGameOver() {
    console.log('Showing game over screen'); // Debug log
    
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found!');
        return;
    }
    console.log('Canvas found, dimensions:', canvas.width, 'x', canvas.height);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context!');
        return;
    }
    console.log('Got canvas context');
    
    try {
        // Clear the canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        console.log('Canvas cleared');
        
        // Add semi-transparent black overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        console.log('Overlay added');
        
        // Set up text properties
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw "Game Over!"
        ctx.font = 'bold 48px Arial';
        ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 50);
        console.log('Game Over text drawn');
        
        // Draw "Battery Dead!"
        ctx.font = '36px Arial';
        ctx.fillText('Battery Dead!', canvas.width / 2, canvas.height / 2);
        console.log('Battery Dead text drawn');
        
        // Get and draw score
        const scoreElement = document.getElementById('score');
        const score = scoreElement ? scoreElement.textContent : '0000';
        ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 50);
        console.log('Score drawn');

        ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2 + 50);
        console.log('Score drawn');
        
        
    } catch (error) {
        console.error('Error in showGameOver:', error);
    }
}


function showGameComplete() {
    console.log('Showing game complete screen'); // Debug log
    
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found!');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get canvas context!');
        return;
    }
    
    try {
        // Clear the canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Add semi-transparent black overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Set up text properties
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw "Game Complete!"
        ctx.font = 'bold 48px Arial';
        ctx.fillText('Game Complete!', canvas.width / 2, canvas.height / 2 - 50);
        
        // Get and draw score
        const scoreElement = document.getElementById('score');
        const score = scoreElement ? scoreElement.textContent : '0000';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 50);
        
    } catch (error) {
        console.error('Error in showGameComplete:', error);
    }
}

function updateTimer() {
    const timeSpan = document.getElementById('time');
    let time = timeSpan.textContent;
    let [minutes, seconds] = time.split(':').map(Number);
    
    // Check if we're about to hit zero
    if (minutes === 0 && seconds === 0) {
        console.log("Timer reached zero!"); // Debug log
        isGameOver = true;  // Set game over state
        return;
    }
    
    // Decrease the time
    if (seconds === 0) {
        minutes--;
        seconds = 59;
    } else {
        seconds--;
    }
    
    // If we're going to hit zero after decreasing
    if (minutes === 0 && seconds === 0) {
        console.log("Timer reaching zero!"); // Debug log
        isGameOver = true;
        timeSpan.textContent = "00:00";
        return;
    }
    
    timeSpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}


