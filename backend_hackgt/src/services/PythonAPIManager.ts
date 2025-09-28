import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import axios from 'axios';

export class PythonAPIManager {
  private pythonProcess: ChildProcess | null = null;
  private readonly pythonAPIPort = 5001;
  private readonly pythonAPIPath = join(__dirname, '../../../newscrape');
  private readonly maxRetries = 5;
  private readonly retryDelay = 2000; // 2 seconds

  constructor() {
    console.log('🐍 Python API Manager initialized');
  }

  /**
   * Start the Python API server
   */
  async startPythonAPI(): Promise<boolean> {
    try {
      console.log('🚀 Starting Python API server...');
      
      // Check if Python API is already running
      if (await this.isPythonAPIRunning()) {
        console.log('✅ Python API is already running');
        return true;
      }

      // Start the Python process
      this.pythonProcess = spawn('python', ['api_server.py'], {
        cwd: this.pythonAPIPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      // Handle process events
      this.pythonProcess.on('error', (error) => {
        console.error('❌ Failed to start Python API:', error);
      });

      this.pythonProcess.on('exit', (code, signal) => {
        console.log(`🐍 Python API process exited with code ${code}, signal ${signal}`);
        this.pythonProcess = null;
      });

      // Log Python output
      this.pythonProcess.stdout?.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          console.log(`🐍 [Python API]: ${output}`);
        }
      });

      this.pythonProcess.stderr?.on('data', (data) => {
        const error = data.toString().trim();
        if (error) {
          console.error(`🐍 [Python API Error]: ${error}`);
        }
      });

      // Wait for the API to be ready
      const isReady = await this.waitForPythonAPI();
      
      if (isReady) {
        console.log('✅ Python API server started successfully');
        return true;
      } else {
        console.error('❌ Python API server failed to start');
        this.stopPythonAPI();
        return false;
      }

    } catch (error) {
      console.error('❌ Error starting Python API:', error);
      return false;
    }
  }

  /**
   * Stop the Python API server
   */
  stopPythonAPI(): void {
    if (this.pythonProcess) {
      console.log('🛑 Stopping Python API server...');
      this.pythonProcess.kill('SIGTERM');
      
      // Force kill after 5 seconds if it doesn't stop gracefully
      setTimeout(() => {
        if (this.pythonProcess && !this.pythonProcess.killed) {
          console.log('🔨 Force killing Python API process...');
          this.pythonProcess.kill('SIGKILL');
        }
      }, 5000);
      
      this.pythonProcess = null;
    }
  }

  /**
   * Check if Python API is running
   */
  private async isPythonAPIRunning(): Promise<boolean> {
    try {
      const response = await axios.get(`http://localhost:${this.pythonAPIPort}/health`, {
        timeout: 1000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for Python API to be ready with retries
   */
  private async waitForPythonAPI(): Promise<boolean> {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      console.log(`🔄 Checking Python API readiness (attempt ${attempt}/${this.maxRetries})...`);
      
      if (await this.isPythonAPIRunning()) {
        return true;
      }
      
      if (attempt < this.maxRetries) {
        console.log(`⏳ Waiting ${this.retryDelay}ms before retry...`);
        await this.delay(this.retryDelay);
      }
    }
    
    return false;
  }

  /**
   * Get Python API status
   */
  async getPythonAPIStatus(): Promise<{
    running: boolean;
    port: number;
    health?: any;
  }> {
    const running = await this.isPythonAPIRunning();
    let health = null;
    
    if (running) {
      try {
        const response = await axios.get(`http://localhost:${this.pythonAPIPort}/health`);
        health = response.data;
      } catch (error) {
        // Health check failed but process might still be running
      }
    }
    
    return {
      running,
      port: this.pythonAPIPort,
      health
    };
  }

  /**
   * Test Python API with a sample request
   */
  async testPythonAPI(): Promise<boolean> {
    try {
      console.log('🧪 Testing Python API with sample request...');
      
      const response = await axios.get(`http://localhost:${this.pythonAPIPort}/api/headlines?player=LeBron%20James`);
      
      if (response.status === 200 && response.data.headlines) {
        console.log('✅ Python API test successful');
        console.log(`📰 Sample headlines: ${response.data.headlines.length} found`);
        return true;
      } else {
        console.error('❌ Python API test failed - invalid response');
        return false;
      }
    } catch (error) {
      console.error('❌ Python API test failed:', error);
      return false;
    }
  }

  /**
   * Utility function to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get Python API base URL
   */
  getPythonAPIBaseURL(): string {
    return `http://localhost:${this.pythonAPIPort}`;
  }

  /**
   * Check if Python API process is still running
   */
  isProcessRunning(): boolean {
    return this.pythonProcess !== null && !this.pythonProcess.killed;
  }
}

// Export singleton instance
export const pythonAPIManager = new PythonAPIManager();
