// Test script to verify terminal memory functionality
const { TerminalMemoryService } = require("./src/services/terminal-memory/TerminalMemoryService")

async function testTerminalMemory() {
	console.log("Testing Terminal Memory Service...")

	const service = TerminalMemoryService.getInstance()

	// Check if initialized
	console.log("Service initialized:", service.isInitialized)

	// Test processing a command
	await service.processTerminalExecution(
		"ls -la",
		"-rw-rw-r-- 1 user user 32 Jun 4 05:48 test-file.txt",
		0,
		"/tmp",
		"test-task-id",
		"test-terminal-id",
	)

	console.log("Terminal memory test completed")
}

testTerminalMemory().catch(console.error)
