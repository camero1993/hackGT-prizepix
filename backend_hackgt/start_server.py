"""
Simple startup script for the NBA Betting Simulator API.
"""

import uvicorn
import sys
import os

def start_server(host="0.0.0.0", port=8000, reload=True):
    """Start the FastAPI server."""
    print("🏀 Starting NBA Betting Simulator API...")
    print(f"   Host: {host}")
    print(f"   Port: {port}")
    print(f"   Reload: {reload}")
    print(f"   URL: http://{host}:{port}")
    print(f"   Docs: http://{host}:{port}/docs")
    print()
    
    try:
        uvicorn.run(
            "app:app",
            host=host,
            port=port,
            reload=reload,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Server failed to start: {e}")
        sys.exit(1)


if __name__ == "__main__":
    # Check if we're in development mode
    is_dev = "--dev" in sys.argv or "--reload" in sys.argv
    
    # Parse port if provided
    port = 8000
    for arg in sys.argv:
        if arg.startswith("--port="):
            try:
                port = int(arg.split("=")[1])
            except ValueError:
                print("❌ Invalid port number")
                sys.exit(1)
    
    # Start server
    start_server(
        host="127.0.0.1" if is_dev else "0.0.0.0",
        port=port,
        reload=is_dev
    )
