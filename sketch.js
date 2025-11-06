let pipes = [];
let controlStations = [];
let videos = {};
let activeStation = null;

// Keyframe system for glow animation
// Each keyframe: position (0-100% where glow should be), pauseDuration (seconds to pause at that position)
let glowKeyframes = {
  station0: [
    { position: 0, pauseDuration: 0.2 },
    { position: 10, pauseDuration: 0.5 },
    { position: 13, pauseDuration: 1 },
    { position: 35, pauseDuration: 1 },
    { position: 52, pauseDuration: 1.3},
    { position: 66, pauseDuration: 4.9 },
    { position: 90, pauseDuration: 1.5 },
    { position: 100, pauseDuration: 0 }
  ],
  station1: [
    { position: 0, pauseDuration: 0 },
    { position: 8, pauseDuration: 1.05 },
    { position: 11, pauseDuration: 0.9 },
    { position: 13, pauseDuration: 1.6 },
    { position: 22, pauseDuration: 1.3 },
    { position: 30, pauseDuration: 1.1 },
    { position: 35, pauseDuration: 1.2 },
    { position: 41, pauseDuration: 1 },
    { position: 45, pauseDuration: 0.8 },
    { position: 48, pauseDuration: 0.2},
    { position: 50, pauseDuration: 3.3},
    { position: 53, pauseDuration: 0.5 },
    { position: 56,pauseDuration: 0.5 }

  ],
  station2: [
    { position: 0, pauseDuration: 0 },
    { position: 30, pauseDuration: 1 },
    { position: 100, pauseDuration: 0 }
  ]
};

// Visual parameters for the glow
let glowParams = {
  size: 60,
  brightness: 200,
  fadeLength: 40
};

// Individual speed multipliers for each station's glow
let glowSpeedMultipliers = {
  station0: 0.2,   // Adjust speed for station 0
  station1: 0.05,   // Adjust speed for station 1
  station2: 0.25   // Adjust speed for station 2
};

let glowPosition = 0;
let videoScale = 1.2;

// Define pipe paths - each path is a series of connected segments
let pipePaths = [];

function preload() {
  videos.station0 = createVideo('sewage_cam-01.mp4');
  videos.station1 = createVideo('sewage_cam-02.mp4');
  videos.station2 = createVideo('video3.mp4');
  
  for (let key in videos) {
    videos[key].hide();
    videos[key].loop();
    videos[key].pause();
  }
}

function setup() {
  createCanvas(1400, 700);
  createPipeNetwork();
  createControlStations();
}

function draw() {
  background(0);
  
  // Left half - video display or black
  if (activeStation !== null) {
    let video = videos[`station${activeStation}`];
    if (video && video.loadedmetadata) {
      let videoAspect = video.width / video.height;
      let displayWidth = width / 2;
      let displayHeight = height;
      let displayAspect = displayWidth / displayHeight;
      
      let drawWidth, drawHeight, drawX, drawY;
      
      if (videoAspect > displayAspect) {
        drawWidth = displayWidth * videoScale;
        drawHeight = (displayWidth / videoAspect) * videoScale;
        drawX = ((displayWidth - drawWidth) / 2) - 25;
        drawY = (displayHeight - drawHeight) / 2;
      } else {
        drawHeight = displayHeight * videoScale;
        drawWidth = (displayHeight * videoAspect) * videoScale;
        drawX = ((displayWidth - drawWidth) / 2) - 25;
        drawY = (displayHeight - drawHeight) / 2;
      }
      
      fill(0);
      noStroke();
      rect(0, 0, width / 2, height);
      
      image(video, drawX, drawY, drawWidth, drawHeight);
    }
  } else {
    fill(0);
    noStroke();
    rect(0, 0, width / 2, height);
  }
  
  // Right half - darker sand court
  fill(60, 58, 55);
  rect(width / 2, 0, width / 2, height);
  
  // Update glow position based on video playback and keyframes
  if (activeStation !== null) {
    let video = videos[`station${activeStation}`];
    if (video && video.duration() > 0) {
      let currentTime = video.time();
      glowPosition = getGlowPositionAtTime(activeStation, currentTime);
    }
  }
  
  // Draw pipes
  push();
  translate(width / 2, 0);
  
  for (let i = 0; i < pipePaths.length; i++) {
    let shouldGlow = false;
    
    if (activeStation !== null) {
      let station = controlStations[activeStation];
      shouldGlow = isPipePathConnectedToStation(pipePaths[i], station);
    }
    
    drawPipePath(pipePaths[i], shouldGlow);
  }
  pop();
  
  // Draw control stations
  push();
  translate(width / 2, 0);
  for (let i = 0; i < controlStations.length; i++) {
    drawControlStation(controlStations[i], i);
  }
  pop();
  
  displayInfo();
}

function getGlowPositionAtTime(stationIndex, currentTime) {
  let keyframes = glowKeyframes[`station${stationIndex}`];
  let speedMultiplier = glowSpeedMultipliers[`station${stationIndex}`];
  
  let normalizedKeyframes = keyframes.map(kf => ({
    position: kf.position / 100,
    pauseDuration: kf.pauseDuration
  }));
  
  let cumulativeTime = 0;
  
  for (let i = 0; i < normalizedKeyframes.length - 1; i++) {
    let kf = normalizedKeyframes[i];
    let nextKf = normalizedKeyframes[i + 1];
    
    let distance = abs(nextKf.position - kf.position);
    let movementTime = distance / speedMultiplier;
    let totalSegmentTime = kf.pauseDuration + movementTime;
    
    if (currentTime <= cumulativeTime + totalSegmentTime) {
      if (currentTime <= cumulativeTime + kf.pauseDuration) {
        return kf.position;
      } else {
        let timeInMovement = currentTime - cumulativeTime - kf.pauseDuration;
        let progress = timeInMovement / movementTime;
        return lerp(kf.position, nextKf.position, progress);
      }
    }
    
    cumulativeTime += totalSegmentTime;
  }
  
  return normalizedKeyframes[normalizedKeyframes.length - 1].position;
}

function isPipePathConnectedToStation(path, station) {
  let threshold = 10;
  
  for (let segment of path.segments) {
    if (segment.type === 'vertical') {
      if (abs(segment.x - station.x) < threshold && 
          segment.y1 <= station.y && segment.y2 >= station.y) {
        return true;
      }
    } else if (segment.type === 'horizontal') {
      if (abs(segment.y - station.y) < threshold && 
          segment.x1 <= station.x && segment.x2 >= station.x) {
        return true;
      }
    }
  }
  return false;
}

function drawPipePath(path, shouldGlow) {
  let pipeRadius = 7.5;
  let ridgeSpacing = 8;
  
  // Calculate total path length
  let totalLength = 0;
  let segmentLengths = [];
  
  for (let segment of path.segments) {
    let length;
    if (segment.type === 'vertical') {
      length = abs(segment.y2 - segment.y1);
    } else {
      length = abs(segment.x2 - segment.x1);
    }
    segmentLengths.push(length);
    totalLength += length;
  }
  
  // Draw each segment
  let cumulativeLength = 0;
  
  for (let i = 0; i < path.segments.length; i++) {
    let segment = path.segments[i];
    let segmentLength = segmentLengths[i];
    
    if (segment.type === 'vertical') {
      // Draw main pipe body
      fill(160, 45, 45);
      noStroke();
      rect(segment.x - pipeRadius, segment.y1, pipeRadius * 2, segment.y2 - segment.y1);
      
      // Draw glow if active
      if (shouldGlow) {
        let segmentStart = cumulativeLength / totalLength;
        let segmentEnd = (cumulativeLength + segmentLength) / totalLength;
        
        if (glowPosition >= segmentStart && glowPosition <= segmentEnd) {
          let posInSegment = (glowPosition - segmentStart) / (segmentEnd - segmentStart);
          let glowY = segment.y1 + (segment.y2 - segment.y1) * posInSegment;
          
          for (let j = 0; j < glowParams.size; j++) {
            let fadeIn = min(j / glowParams.fadeLength, 1);
            let fadeOut = min((glowParams.size - j) / glowParams.fadeLength, 1);
            let alpha = glowParams.brightness * fadeIn * fadeOut;
            
            fill(255, 220, 150, alpha);
            noStroke();
            rect(segment.x - pipeRadius, glowY + j - glowParams.size/2, pipeRadius * 2, 1);
          }
        }
      }
      
      // Draw ridges
      stroke(180, 50, 50);
      strokeWeight(2);
      for (let y = segment.y1; y < segment.y2; y += ridgeSpacing) {
        line(segment.x - pipeRadius, y, segment.x + pipeRadius, y);
      }
      
    } else if (segment.type === 'horizontal') {
      // Draw main pipe body
      fill(160, 45, 45);
      noStroke();
      rect(segment.x1, segment.y - pipeRadius, segment.x2 - segment.x1, pipeRadius * 2);
      
      // Draw glow if active
      if (shouldGlow) {
        let segmentStart = cumulativeLength / totalLength;
        let segmentEnd = (cumulativeLength + segmentLength) / totalLength;
        
        if (glowPosition >= segmentStart && glowPosition <= segmentEnd) {
          let posInSegment = (glowPosition - segmentStart) / (segmentEnd - segmentStart);
          let glowX = segment.x1 + (segment.x2 - segment.x1) * posInSegment;
          
          for (let j = 0; j < glowParams.size; j++) {
            let fadeIn = min(j / glowParams.fadeLength, 1);
            let fadeOut = min((glowParams.size - j) / glowParams.fadeLength, 1);
            let alpha = glowParams.brightness * fadeIn * fadeOut;
            
            fill(255, 220, 150, alpha);
            noStroke();
            rect(glowX + j - glowParams.size/2, segment.y - pipeRadius, 1, pipeRadius * 2);
          }
        }
      }
      
      // Draw ridges
      stroke(180, 50, 50);
      strokeWeight(2);
      for (let x = segment.x1; x < segment.x2; x += ridgeSpacing) {
        line(x, segment.y - pipeRadius, x, segment.y + pipeRadius);
      }
    }
    
    cumulativeLength += segmentLength;
  }
}

function drawControlStation(station, index) {
  let adjustedMouseX = mouseX - width / 2;
  let isHovering = adjustedMouseX > station.x - station.size / 2 &&
                   adjustedMouseX < station.x + station.size / 2 &&
                   mouseY > station.y - station.size / 2 &&
                   mouseY < station.y + station.size / 2;
  
  if (isHovering && activeStation !== index) {
    activeStation = index;
    for (let key in videos) {
      videos[key].pause();
      videos[key].time(0);
    }
    videos[`station${index}`].loop();
    glowPosition = 0;
  }
  
  if (!isHovering && activeStation === index) {
    let overAnyStation = false;
    for (let s of controlStations) {
      if (adjustedMouseX > s.x - s.size / 2 &&
          adjustedMouseX < s.x + s.size / 2 &&
          mouseY > s.y - s.size / 2 &&
          mouseY < s.y + s.size / 2) {
        overAnyStation = true;
        break;
      }
    }
    if (!overAnyStation) {
      activeStation = null;
      for (let key in videos) {
        videos[key].pause();
      }
    }
  }
  
  if (isHovering) {
    station.glowIntensity = lerp(station.glowIntensity, 255, 0.1);
  } else {
    station.glowIntensity = lerp(station.glowIntensity, 0, 0.1);
  }
  
  fill(80);
  noStroke();
  rectMode(CENTER);
  rect(station.x, station.y, station.size, station.size, 3);
  
  if (station.glowIntensity > 1) {
    drawingContext.shadowBlur = 20;
    drawingContext.shadowColor = `rgba(255, 200, 100, ${station.glowIntensity / 255})`;
    
    noFill();
    stroke(255, 220, 150, station.glowIntensity);
    strokeWeight(3);
    rect(station.x, station.y, station.size, station.size, 3);
    
    drawingContext.shadowBlur = 0;
  }
  
  rectMode(CORNER);
}

function displayInfo() {
  fill(255);
  noStroke();
  textAlign(LEFT);
  textSize(12);
  text(`Glow Position: ${(glowPosition * 100).toFixed(1)}%`, 10, 20);
  if (activeStation !== null) {
    text(`Active Station: ${activeStation}`, 10, 40);
    text(`Speed: ${glowSpeedMultipliers[`station${activeStation}`]}`, 10, 60);
  }
}

function createPipeNetwork() {
  let rightWidth = width / 2;
  
  // Path 0: Simple vertical
  pipePaths.push({
    segments: [
      { type: 'vertical', x: 280, y1: 0, y2: height }
    ]
  });
  
  // Path 1: L-shape (horizontal then vertical)
  pipePaths.push({
    segments: [
      { type: 'horizontal', x1: 0, x2: 490, y: 200 },
      { type: 'vertical', x: 490, y1: 200, y2: height }
    ]
  });
  
  // Path 2: L-shape (vertical then horizontal) - for station 2
  pipePaths.push({
    segments: [
      { type: 'vertical', x: 140, y1: 0, y2: 580 },
      { type: 'horizontal', x1: 140, x2: rightWidth, y: 580 }
    ]
  });
  
  // Path 3: L-shape standalone
  pipePaths.push({
    segments: [
      { type: 'horizontal', x1: 0, x2: 580, y: 380 },
      { type: 'vertical', x: 580, y1: 0, y2: 380 }
    ]
  });
  
  // Path 4: Simple horizontal
  pipePaths.push({
    segments: [
      { type: 'horizontal', x1: 0, x2: rightWidth, y: 120 }
    ]
  });
}

function createControlStations() {
  let stations = [
    { x: 280, y: 350 },
    { x: 490, y: 200 },
    { x: 140, y: 580 }
  ];
  
  for (let pos of stations) {
    controlStations.push({
      x: pos.x,
      y: pos.y,
      size: 50,
      glowIntensity: 0
    });
  }
}