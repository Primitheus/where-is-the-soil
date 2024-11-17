var canvas = document.getElementsByTagName('canvas')[0];
canvas.width = 800;
canvas.height = 600;

var ctx = canvas.getContext('2d');
const margin = 100; // Define the margin

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

// Adjust frequency and amplitude
var frequency = 100; 
var amplitude = 2; 

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

var end = Date.now();

// Draw the topographic moisture data on the canvas
ctx.putImageData(image, 0, 0);

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

// Create multiple roots
const roots = [];
const numberOfRoots = 1; // Adjust the number of roots as needed
const maxRoots = 100; // Set a maximum limit on the number of roots


for (let i = 0; i < numberOfRoots; i++) {
    const drySpot = findDrySpot();
    roots.push({
        x: drySpot.x,
        y: drySpot.y,
        path: [{ x: drySpot.x, y: drySpot.y }],
        foundSoil: false
    });
}

function drawRoots() {
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.beginPath();
    roots.forEach(root => {
        ctx.moveTo(root.path[0].x, root.path[0].y);
        root.path.forEach((point) => {
            ctx.lineTo(point.x, point.y);
        });
    });
    ctx.stroke();
}

// Function to update the root growth (movement)
function updateRoots() {
    const directions = [
        { x: 0, y: -5 }, // Up
        { x: 0, y: 5 },  // Down
        { x: -5, y: 0 }, // Left
        { x: 5, y: 0 },  // Right
    ];

    const newRoots = [];

    roots.forEach(root => {
        if (!root.foundSoil) {
            const randomDirection = directions[Math.floor(Math.random() * directions.length)];
            const newPoint = {
                x: root.path[root.path.length - 1].x + randomDirection.x,
                y: root.path[root.path.length - 1].y + randomDirection.y
            };

            // Check if the new point is within the canvas boundaries
            if (newPoint.x >= 0 && newPoint.x < canvas.width && newPoint.y >= 0 && newPoint.y < canvas.height) {
                const moistureIndex = Math.floor(newPoint.x) + Math.floor(newPoint.y) * canvas.width;
                const moistureLevel = moistureData[moistureIndex];
                console.log("Moisture Level: ", moistureLevel);
                // Check if the moisture level is above a certain threshold
                if (moistureLevel > 0.3) { // Adjust the threshold as needed
                    root.foundSoil = true;
                } else {
                    root.path.push(newPoint);
                }
            }
        } else {
            // Move towards the direction with the highest moisture value
            let bestDirection = null;
            let highestMoisture = -1;

            directions.forEach(direction => {
                const newPoint = {
                    x: root.path[root.path.length - 1].x + direction.x,
                    y: root.path[root.path.length - 1].y + direction.y
                };

                // Check if the new point is within the canvas boundaries
                if (newPoint.x >= 0 && newPoint.x < canvas.width && newPoint.y >= 0 && newPoint.y < canvas.height) {
                    const moistureIndex = Math.floor(newPoint.x) + Math.floor(newPoint.y) * canvas.width;
                    const moistureLevel = moistureData[moistureIndex];

                    if (moistureLevel > highestMoisture) {
                        highestMoisture = moistureLevel;
                        bestDirection = direction;
                    }
                }
            });

            if (bestDirection) {
                const newPoint = {
                    x: root.path[root.path.length - 1].x + bestDirection.x,
                    y: root.path[root.path.length - 1].y + bestDirection.y
                };
                root.path.push(newPoint);

                // Consume the moisture at the new point
                const moistureIndex = Math.floor(newPoint.x) + Math.floor(newPoint.y) * canvas.width;
                moistureData[moistureIndex] = Math.max(0, moistureData[moistureIndex] - 0.1); // Adjust the consumption rate as needed

                // Check if the moisture is completely consumed
                if (moistureData[moistureIndex] === 0 && roots.length + newRoots.length < maxRoots) {
                    // Split the root into multiple new roots
                    const splitCount = 2; // Adjust the number of splits as needed
                    for (let i = 0; i < splitCount; i++) {
                        const splitDirection = directions[Math.floor(Math.random() * directions.length)];
                        const splitPoint = {
                            x: newPoint.x + splitDirection.x,
                            y: newPoint.y + splitDirection.y
                        };

                        // Check if the split point is within the canvas boundaries
                        if (splitPoint.x >= 0 && splitPoint.x < canvas.width && splitPoint.y >= 0 && splitPoint.y < canvas.height) {
                            newRoots.push({
                                x: splitPoint.x,
                                y: splitPoint.y,
                                path: [splitPoint],
                                foundSoil: false
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

function animate() {
    
    // Clear the canvas
    //ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the soil and roots
    drawRoots();

    // Update the roots' growth
    updateRoots();

    // Continue the animation
    requestAnimationFrame(animate);
}

animate();