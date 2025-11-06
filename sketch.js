let robots = [];
let markers = [];
const numRobots = 10;
const numMarkers = 3;
const markerRadius = 50;
let draggedMarker = null;
const robotSpeed = 1.8; // Fixed speed in pixels per frame
let sandLayer; // Graphics layer for sand texture

function setup() {
  createCanvas(800, 800);
  colorMode(HSB, 360, 100, 100, 100);
  
  // Create sand layer
  sandLayer = createGraphics(800, 800);
  sandLayer.colorMode(HSB, 360, 100, 100, 100);
  sandLayer.background(20, 15, 30); // Dark background
  
  // Create 3 markers in a triangle pattern
  let centerX = width / 2;
  let centerY = height / 2;
  let triangleRadius = 200;
  
  for (let i = 0; i < numMarkers; i++) {
    let angle = (TWO_PI / numMarkers) * i - HALF_PI;
    markers.push({
      x: centerX + cos(angle) * triangleRadius,
      y: centerY + sin(angle) * triangleRadius,
      glow: 70,
      hue: 180
    });
  }
  
  // Create robots with mandala parameters
  for (let i = 0; i < numRobots; i++) {
    robots.push({
      x: width / 2,
      y: height / 2,
      prevX: width / 2,
      prevY: height / 2,
      angle: (TWO_PI / numRobots) * i,
      baseAngleSpeed: 0.015,
      spiralRadius: 50,
      noiseOffset: random(1000)
    });
  }
}

function draw() {
  // Slowly fade the sand layer back to background
  sandLayer.fill(20, 15, 30, 2); // Very subtle fade
  sandLayer.noStroke();
  sandLayer.rect(0, 0, width, height);
  
  // Draw the sand layer
  image(sandLayer, 0, 0);
  
  colorMode(HSB, 360, 100, 100, 100);
  
  // Update marker hue if mouse is hovering
  for (let marker of markers) {
    let d = dist(mouseX, mouseY, marker.x, marker.y);
    if (d < markerRadius) {
      marker.hue = (marker.hue + 0.5) % 360;
    }
  }
  
  // Draw glowing markers
  for (let marker of markers) {
    let glowSize = marker.glow + sin(frameCount * 0.05) * 20;
    
    for (let r = glowSize; r > 0; r -= 10) {
      fill(marker.hue, 80, 80, map(r, 0, glowSize, 60, 0));
      noStroke();
      circle(marker.x, marker.y, r);
    }
    
    fill(marker.hue, 90, 100);
    circle(marker.x, marker.y, 8);
  }
  
  // CALCULATE PATTERN PARAMETERS FROM MARKER POSITIONS
  
  // 1. Center point (centroid of triangle)
  let centerX = 0, centerY = 0;
  for (let marker of markers) {
    centerX += marker.x;
    centerY += marker.y;
  }
  centerX /= markers.length;
  centerY /= markers.length;
  
  // 2. Triangle size - STRONGLY affects overall radius range
  let triangleSize = 0;
  for (let marker of markers) {
    triangleSize += dist(centerX, centerY, marker.x, marker.y);
  }
  triangleSize /= markers.length;
  
  // Scale radius range directly with triangle size
  let radiusMin = triangleSize * 0.3;
  let radiusMax = triangleSize * 2.0;
  
  // 3. Triangle shape asymmetry - affects petal count
  let distances = [];
  for (let i = 0; i < markers.length; i++) {
    let next = (i + 1) % markers.length;
    distances.push(dist(markers[i].x, markers[i].y, markers[next].x, markers[next].y));
  }
  let avgDistance = (distances[0] + distances[1] + distances[2]) / 3;
  let asymmetry = 0;
  for (let d of distances) {
    asymmetry += abs(d - avgDistance);
  }
  asymmetry /= avgDistance;
  let petalCount = floor(map(asymmetry, 0, 1, 3, 8));
  
  // 4. Triangle rotation - affects pattern rotation speed
  let triangleAngle = atan2(markers[0].y - centerY, markers[0].x - centerX);
  let rotationInfluence = map(triangleAngle, -PI, PI, 0.5, 2.0);
  
  // 5. Average hue
  let avgHue = (markers[0].hue + markers[1].hue + markers[2].hue) / 3;
  
  // 6. Hue variance - affects PATTERN TYPE
  let hueVariance = 0;
  for (let marker of markers) {
    hueVariance += abs(marker.hue - avgHue);
  }
  hueVariance /= markers.length;
  let mandalaInfluence = map(hueVariance, 0, 120, 0, 1);
  let radiusFrequency = map(hueVariance, 0, 120, 0.01, 0.05);
  
  // Update and draw robots
  for (let robot of robots) {
    // Angle speed affected by triangle rotation
    let angleSpeed = robot.baseAngleSpeed * rotationInfluence;
    robot.angle += angleSpeed;
    
    // Spiral growth - scaled by triangle size
    let spiralGrowth = (triangleSize * 0.001) * (1 - mandalaInfluence);
    robot.spiralRadius += spiralGrowth;
    if (robot.spiralRadius > radiusMax) {
      robot.spiralRadius = radiusMin;
    }
    
    // Create mandala petal pattern with dynamic petal count
    let petalPattern = sin(robot.angle * petalCount + frameCount * radiusFrequency);
    
    // Blend between spiral and mandala
    let mandalaRadius = map(petalPattern, -1, 1, radiusMin, radiusMax);
    let radius = lerp(robot.spiralRadius, mandalaRadius, mandalaInfluence);
    
    // Add noise scaled by triangle size
    let noiseVal = noise(robot.noiseOffset + frameCount * 0.01, robot.angle);
    let noiseVariation = map(noiseVal, 0, 1, -triangleSize * 0.15, triangleSize * 0.15);
    
    // Calculate target position
    let targetX = centerX + cos(robot.angle) * (radius + noiseVariation);
    let targetY = centerY + sin(robot.angle) * (radius + noiseVariation);
    
    // Secondary pattern scaled by triangle size
    let secondaryAngle = robot.angle * (3 + hueVariance * 0.01);
    let secondaryRadius = sin(frameCount * radiusFrequency * 2) * triangleSize * 0.15 * mandalaInfluence;
    targetX += cos(secondaryAngle) * secondaryRadius;
    targetY += sin(secondaryAngle) * secondaryRadius;
    
    // Store previous position
    robot.prevX = robot.x;
    robot.prevY = robot.y;
    
    // Move at CONSTANT SPEED towards target
    let dx = targetX - robot.x;
    let dy = targetY - robot.y;
    let distance = sqrt(dx * dx + dy * dy);
    
    if (distance > 0) {
      robot.x += (dx / distance) * robotSpeed;
      robot.y += (dy / distance) * robotSpeed;
    }
    
    // Find nearest marker for color
    let nearestMarker = markers[0];
    let minDist = dist(robot.x, robot.y, markers[0].x, markers[0].y);
    for (let marker of markers) {
      let d = dist(robot.x, robot.y, marker.x, marker.y);
      if (d < minDist) {
        minDist = d;
        nearestMarker = marker;
      }
    }
    // Add subtle darker edges for depth
    sandLayer.stroke(20, 15, 20); // Medium brightness
    sandLayer.strokeWeight(10);
    sandLayer.line(robot.prevX, robot.prevY, robot.x, robot.y);
    
    // Draw fresh plow trail on sand layer - brighter for new paths
    sandLayer.stroke(20, 15, 50); // Brighter for fresh trails
    sandLayer.strokeWeight(8);
    sandLayer.line(robot.prevX, robot.prevY, robot.x, robot.y);

    // Draw robot as simple circle
    fill(nearestMarker.hue, 60, 80);
    noStroke();
    circle(robot.x, robot.y, 12);
  }
}

function mousePressed() {
  for (let marker of markers) {
    let d = dist(mouseX, mouseY, marker.x, marker.y);
    if (d < markerRadius) {
      draggedMarker = marker;
      break;
    }
  }
}

function mouseDragged() {
  if (draggedMarker) {
    draggedMarker.x = constrain(mouseX, 50, width - 50);
    draggedMarker.y = constrain(mouseY, 50, height - 50);
  }
}

function mouseReleased() {
  draggedMarker = null;
}

function keyPressed() {
  // Press 'r' to reset sand
  if (key === 'r' || key === 'R') {
    sandLayer.background(20, 15, 30);
  }
}