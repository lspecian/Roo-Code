#!/usr/bin/env node

console.log("🔍 Debugging Terminal Memory Feature")
console.log("====================================")

// Test if we can run a simple command through Roo Code and see the logs
console.log("\n📋 To debug the terminal memory feature:")
console.log("1. Open VSCode with the Roo Code extension")
console.log("2. Open the Developer Console (Help → Toggle Developer Tools)")
console.log("3. Run a simple command through Roo Code (e.g., 'ls' or 'echo hello')")
console.log("4. Look for these log messages in the console:")
console.log("   - '[executeCommand] Terminal memory check:'")
console.log("   - '[executeCommand] Terminal memory enabled, processing command:'")
console.log("   - '[TerminalMemoryService] Service not initialized' (if not working)")
console.log("   - '[CodeIndexServiceFactory] Terminal memory service initialized' (if working)")

console.log("\n🔧 Expected behavior:")
console.log("- If codebase indexing is enabled: Terminal memory should initialize")
console.log("- If terminal memory setting is enabled: Commands should be indexed")
console.log("- If both are enabled: You should see terminal_output records in Qdrant")

console.log("\n🚨 Possible issues:")
console.log("1. Codebase indexing not enabled (prerequisite)")
console.log("2. Terminal memory service not initializing")
console.log("3. Setting not being read correctly")
console.log("4. Extension needs to be reloaded after enabling settings")

console.log("\n💡 Quick test:")
console.log("Try running this command in Roo Code and check the console:")
console.log("echo 'Testing terminal memory feature'")
