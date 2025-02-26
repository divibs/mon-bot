// runScripts.js

import { spawn } from 'child_process';

/**
 * Runs a script using Node.js.
 * @param {string} scriptPath - The relative path to the script file.
 * @returns {Promise<void>} - Resolves when the script finishes successfully.
 */
function runScript(scriptPath) {
  return new Promise((resolve, reject) => {
    console.log(`Starting ${scriptPath}...`);
    // Spawn a new Node process for the given script.
    const proc = spawn('node', [scriptPath], { stdio: 'inherit' });
    
    proc.on('error', (error) => {
      console.error(`Error launching ${scriptPath}:`, error);
      reject(error);
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`${scriptPath} finished successfully.`);
        resolve();
      } else {
        console.error(`${scriptPath} exited with code ${code}.`);
        reject(new Error(`${scriptPath} exited with code ${code}`));
      }
    });
  });
}

/**
 * Runs the specified scripts in sequence.
 */
async function runScriptsSequentially() {
  try {
    // Run ambient.js first
    await runScript('ambient.js');
    // Then run uniswap.mjs
    await runScript('uniswap.cjs');
    // Finally, run magmastaking.mjs
    await runScript('magmastaking.mjs');
    console.log('All scripts executed successfully.');
  } catch (err) {
    console.error('Script execution halted:', err);
    process.exit(1);
  }
}

runScriptsSequentially();
