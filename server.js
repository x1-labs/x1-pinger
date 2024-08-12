const express = require('express');
const { spawn } = require('child_process');
const app = express();
const port = 3334;

let pingTimes = [];

// Function to calculate the sliding average
function calculateSlidingAverage() {
    const sum = pingTimes.reduce((a, b) => a + b, 0);
    return (pingTimes.length > 0) ? sum / pingTimes.length : 0;
}

// Function to start running `solana ping` and capturing its output
function startSolanaPing() {
    const pingProcess = spawn('solana', ['ping']);

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

// Endpoint to get the current sliding average and ping times
app.get('/ping_times', (req, res) => {
    const average = calculateSlidingAverage();
    res.json({ average: average, pingTimes: pingTimes });
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    startSolanaPing(); // Start the ping process when the server starts
});

