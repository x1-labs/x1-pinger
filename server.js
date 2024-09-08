const express = require('express');
const { spawn } = require('child_process');
const net = require('net');
const app = express();
const port = 3334;

let pingTimes = [];

// Function to calculate the sliding average
function calculateSlidingAverage() {
    const sum = pingTimes.reduce((a, b) => a + b, 0);
    const average = (pingTimes.length > 0) ? sum / pingTimes.length : 0;
    return Math.round(average); // Round the average to the nearest whole number
}

// Function to calculate the median
function calculateMedian() {
    if (pingTimes.length === 0) return 0;

    const sorted = [...pingTimes].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
    } else {
        return sorted[middle];
    }
}

// Function to calculate the 90th percentile (P90)
function calculateP90() {
    if (pingTimes.length === 0) return 0;

    const sorted = [...pingTimes].sort((a, b) => a - b);
    const index = Math.floor(0.9 * sorted.length);
    return sorted[index];
}

// Function to calculate the minimum value
function calculateMin() {
    if (pingTimes.length === 0) return 0;
    return Math.min(...pingTimes);
}

// Function to check if localhost:8899 is up
function isLocalhost8899Up() {
    return new Promise((resolve) => {
        const socket = new net.Socket();
        socket.setTimeout(1000);  // 1 second timeout

        socket.on('connect', () => {
            socket.destroy();
            resolve(true);
        });

        socket.on('timeout', () => {
            socket.destroy();
            resolve(false);
        });

        socket.on('error', () => {
            resolve(false);
        });

        socket.connect(8899, 'localhost');
    });
}

// Function to start running `solana ping` and capturing its output
async function startSolanaPing() {
    const isLocalUp = await isLocalhost8899Up();
    const pingArgs = isLocalUp ? ['ping', '-u', 'http://localhost:8899'] : ['ping'];
    
    if (!isLocalUp) {
        console.log('Local RPC (localhost:8899) is down. Using default Solana RPC.');
    } else {
        console.log('Local RPC (localhost:8899) is up. Using local RPC for pinging.');
    }

    const pingProcess = spawn('solana', pingArgs);

    // Process the ping output from stderr
    pingProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            // Match the time in the format `time= 803ms` or `time=1003ms`
            const match = line.match(/time=\s*(\d+)ms/);
            if (match) {
                const time = parseInt(match[1], 10);
                if (!isNaN(time)) {
                    // Add the new ping time to the array
                    pingTimes.push(time);
                    // Keep only the last 10 values
                    if (pingTimes.length > 10) {
                        pingTimes.shift();
                    }
                    console.log(`Captured ping time: ${time}ms`);
                }
            }
        });
    });

    pingProcess.on('close', (code) => {
        console.log(`solana ping process exited with code ${code}`);
        // Optionally restart the ping command if it exits
        startSolanaPing();
    });
}

// Endpoint to get the current sliding average, median, P90, minimum value, and ping times
app.get('/ping_times', (req, res) => {
    const average = calculateSlidingAverage();
    const median = calculateMedian();
    const p90 = calculateP90();
    const min = calculateMin();
    res.json({ average: average, median: median, p90: p90, min: min, pingTimes: pingTimes });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    startSolanaPing(); // Start the ping process when the server starts
});
