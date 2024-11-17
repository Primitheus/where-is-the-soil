var canvas = document.getElementsByTagName('canvas')[0];
var ctx = canvas.getContext('2d');
const margin = 100; // Define the margin

function updateCanvasSize() {
    canvas.width = parseInt(document.getElementById('canvasWidth').value);
    canvas.height = parseInt(document.getElementById('canvasHeight').value);
    image = ctx.createImageData(canvas.width, canvas.height);
    data = image.data;
    resetSimulation();
}

var image = ctx.createImageData(canvas.width, canvas.height);
var data = image.data;

var start = Date.now();

function getColor(value) {
    if (value < 0.3) return [97, 38, 1]; // Dry
    if (value < 0.4) return [71, 22, 1]; 
    if (value < 0.6) return [51, 16, 1]; 
    if (value < 0.8) return [36, 12, 1];  
    if (value < 0.9) return [26, 8, 1];  
    if (value < 1) return [19, 6, 1]; 
    return [1, 19, 66]; // 100% wet.
}

// Seed the noise function with a random value
noise.seed(Math.random());

var moistureData = new Array(canvas.width * canvas.height);

function generateMoistureData() {
    var frequency = parseFloat(document.getElementById('frequency').value);
    var amplitude = parseFloat(document.getElementById('amplitude').value);

    for (var x = 0; x < canvas.width; x++) {
        for (var y = 0; y < canvas.height; y++) {
            var elevation = Math.abs(noise.perlin2(x / frequency, y / frequency)) * amplitude;
            var moisture = elevation; // Higher elevation means more moisture
            moistureData[x + y * canvas.width] = moisture;

            var color = getColor(moisture);

            var cell = (x + y * canvas.width) * 4;
            data[cell] = color[0];
            data[cell + 1] = color[1];
            data[cell + 2] = color[2];
            data[cell + 3] = 255; // alpha.
        }
    }

    // Draw the topographic moisture data on the canvas
    ctx.putImageData(image, 0, 0);
}

function resetSimulation() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Generate new moisture data
    generateMoistureData();

    // Reset roots
    roots.length = 0;
    const numberOfRoots = parseInt(document.getElementById('numberOfRoots').value);
    for (let i = 0; i < numberOfRoots; i++) {
        const drySpot = findDrySpot();
        roots.push({
            x: drySpot.x,
            y: drySpot.y,
            path: [{ x: drySpot.x, y: drySpot.y }],
            foundSoil: false,
            color: getRandomColor()
        });
    }
}

generateMoistureData();

ctx.font = '16px sans-serif'
ctx.textAlign = 'center';

// Function to find a random dry spot for the root
function findDrySpot() {
    let rootX, rootY, rootMoisture;
    do {
        rootX = Math.floor(Math.random() * canvas.width);
        rootY = Math.floor(Math.random() * canvas.height);
        rootMoisture = moistureData[rootX + rootY * canvas.width];
    } while (rootMoisture >= 0.3);
    return { x: rootX, y: rootY };
}

// Function to generate a random color
function getRandomColor() {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    return `rgb(${r},${g},${b})`;
}

// Create multiple roots
const roots = [];
const numberOfRoots = parseInt(document.getElementById('numberOfRoots').value);
const maxRoots = 100; // Set a maximum limit on the number of roots

for (let i = 0; i < numberOfRoots; i++) {
    const drySpot = findDrySpot();
    roots.push({
        x: drySpot.x,
        y: drySpot.y,
        path: [{ x: drySpot.x, y: drySpot.y }],
        foundSoil: false,
        color: getRandomColor()
    });
}

function drawRoots() {
    roots.forEach(root => {
        ctx.strokeStyle = root.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(root.path[0].x, root.path[0].y);
        root.path.forEach((point) => {
            ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
    });
}

// Function to update the root growth (movement)
function updateRoots() {
    const increment = parseFloat(document.getElementById('increment').value);
    const directions = [
        { x: 0, y: -increment }, // Up
        { x: 0, y: increment },  // Down
        { x: -increment, y: 0 }, // Left
        { x: increment, y: 0 },  // Right
    ];

    const newRoots = [];
    const enableBacktracking = document.getElementById('backtracking').checked;

    // Helper function to create a unique key for a point
    function pointToKey(point) {
        return `${point.x},${point.y}`;
    }

    roots.forEach(root => {
        // Initialize a set of visited points for each root if not already present
        if (!root.visited) {
            root.visited = new Set();
            root.path.forEach(point => root.visited.add(pointToKey(point)));
        }

        if (!root.foundSoil) {
            const randomDirection = directions[Math.floor(Math.random() * directions.length)];
            const lastPoint = root.path[root.path.length - 1];
            const newPoint = {
                x: lastPoint.x + randomDirection.x,
                y: lastPoint.y + randomDirection.y
            };

            // Check if the new point is within the canvas boundaries and not revisited
            const pointKey = pointToKey(newPoint);
            if (
                newPoint.x >= 0 && newPoint.x < canvas.width &&
                newPoint.y >= 0 && newPoint.y < canvas.height &&
                (!root.visited.has(pointKey) || enableBacktracking)
            ) {
                const moistureIndex = Math.floor(newPoint.x) + Math.floor(newPoint.y) * canvas.width;
                const moistureLevel = moistureData[moistureIndex];
                console.log("Moisture Level: ", moistureLevel);

                // Check if the moisture level is above a certain threshold
                if (moistureLevel > 0.3) { // Adjust the threshold as needed
                    root.foundSoil = true;
                } else {
                    root.path.push(newPoint);
                    root.visited.add(pointKey);
                }
            }
        } else {
            // Move towards the direction with the highest moisture value, avoiding revisited points when possible
            const lastPoint = root.path[root.path.length - 1];
            let bestDirection = null;
            let highestMoisture = -1;
            let fallbackDirection = null;

            directions.forEach(direction => {
                const newPoint = {
                    x: lastPoint.x + direction.x,
                    y: lastPoint.y + direction.y
                };

                // Check if the new point is within canvas boundaries
                const pointKey = pointToKey(newPoint);
                if (
                    newPoint.x >= 0 && newPoint.x < canvas.width &&
                    newPoint.y >= 0 && newPoint.y < canvas.height
                ) {
                    const moistureIndex = Math.floor(newPoint.x) + Math.floor(newPoint.y) * canvas.width;
                    const moistureLevel = moistureData[moistureIndex];

                    if (!root.visited.has(pointKey) || enableBacktracking) {
                        // Prefer unvisited points with higher moisture
                        if (moistureLevel > highestMoisture) {
                            highestMoisture = moistureLevel;
                            bestDirection = direction;
                        }
                    } else if (!fallbackDirection || moistureLevel > highestMoisture) {
                        // Save the revisitable direction with the highest moisture as a fallback
                        fallbackDirection = direction;
                    }
                }
            });

            const chosenDirection = bestDirection || fallbackDirection;

            if (chosenDirection) {
                const newPoint = {
                    x: lastPoint.x + chosenDirection.x,
                    y: lastPoint.y + chosenDirection.y
                };

                root.path.push(newPoint);
                root.visited.add(pointToKey(newPoint));

                // Consume the moisture at the new point
                const moistureIndex = Math.floor(newPoint.x) + Math.floor(newPoint.y) * canvas.width;
                moistureData[moistureIndex] = Math.max(0, moistureData[moistureIndex] - 0.1); // Adjust the consumption rate as needed

                // Check if the moisture is completely consumed
                if (moistureData[moistureIndex] === 0 && roots.length + newRoots.length < maxRoots) {
                    // Split the root into multiple new roots
                    const splitCount = parseInt(document.getElementById('splitCount').value); // Adjust the number of splits as needed
                    for (let i = 0; i < splitCount; i++) {
                        const splitDirection = directions[Math.floor(Math.random() * directions.length)];
                        const splitPoint = {
                            x: newPoint.x + splitDirection.x,
                            y: newPoint.y + splitDirection.y
                        };

                        const splitKey = pointToKey(splitPoint);
                        // Check if the split point is within the canvas boundaries and not revisited
                        if (
                            splitPoint.x >= 0 && splitPoint.x < canvas.width &&
                            splitPoint.y >= 0 && splitPoint.y < canvas.height &&
                            (!root.visited.has(splitKey) || enableBacktracking)
                        ) {
                            newRoots.push({
                                x: splitPoint.x,
                                y: splitPoint.y,
                                path: [splitPoint],
                                visited: new Set([splitKey]),
                                foundSoil: false,
                                color: root.color // Inherit color from parent root
                            });
                        }
                    }
                }
            }
        }
    });

    // Add new roots to the roots array
    roots.push(...newRoots);
}

let animationId;
let isAnimating = false;

function animate() {
    // Clear the canvas
    //ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the soil and roots
    drawRoots();

    // Update the roots' growth
    updateRoots();

    // Continue the animation
    animationId = requestAnimationFrame(animate);
}

document.getElementById('toggleButton').addEventListener('click', function() {
    if (isAnimating) {
        cancelAnimationFrame(animationId);
        this.textContent = 'Start';
    } else {
        generateMoistureData();
        animate();
        this.textContent = 'Stop';
    }
    isAnimating = !isAnimating;
});

document.getElementById('frequency').addEventListener('change', resetSimulation);
document.getElementById('amplitude').addEventListener('change', resetSimulation);
document.getElementById('increment').addEventListener('change', resetSimulation);
document.getElementById('numberOfRoots').addEventListener('change', resetSimulation);
document.getElementById('splitCount').addEventListener('change', resetSimulation);
document.getElementById('canvasWidth').addEventListener('change', updateCanvasSize);
document.getElementById('canvasHeight').addEventListener('change', updateCanvasSize);

// Call updateCanvasSize on window load
window.addEventListener('load', updateCanvasSize);