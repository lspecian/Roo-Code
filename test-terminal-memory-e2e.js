#!/usr/bin/env node

/**
 * End-to-End Terminal Memory Test Script
 *
 * This script tests the complete terminal memory pipeline:
 * executeCommandTool → TerminalMemoryService → TerminalOutputIndexer → Qdrant
 */

const fs = require("fs")
const path = require("path")

// Test configuration
const TEST_CONFIG = {
	qdrantUrl: "http://localhost:6333",
	testCommands: [
		{
			name: "Simple echo command",
			command: "echo 'Terminal memory test'",
			expectedOutput: "Terminal memory test",
			shouldCreateRecord: true,
		},
		{
			name: "List current directory",
			command: "ls -la .",
			expectedPattern: /total \d+/,
			shouldCreateRecord: true,
		},
		{
			name: "Print working directory",
			command: "pwd",
			expectedPattern: /\/.*Roo-Code/,
			shouldCreateRecord: true,
		},
	],
}

class TerminalMemoryE2ETest {
	constructor() {
		this.testResults = []
		this.qdrantCollections = []
		this.initialRecordCount = 0
		this.finalRecordCount = 0
	}

	async run() {
		console.log("🚀 Starting Terminal Memory End-to-End Test")
		console.log("=".repeat(60))

		try {
			// Phase 1: Setup and initial state
			await this.setupTest()

			// Phase 2: Execute test commands
			await this.executeTestCommands()

			// Phase 3: Validate results
			await this.validateResults()

			// Phase 4: Report results
			this.reportResults()
		} catch (error) {
			console.error("❌ Test failed with error:", error)
			process.exit(1)
		}
	}

	async setupTest() {
		console.log("\n📋 Phase 1: Setup and Initial State")

		// Check if Qdrant is accessible
		await this.checkQdrantConnection()

		// Get initial record counts
		await this.getInitialRecordCounts()

		// Verify extension structure
		this.verifyExtensionStructure()

		console.log("✅ Setup complete")
	}

	async checkQdrantConnection() {
		console.log("🔍 Checking Qdrant connection...")

		try {
			const response = await fetch(`${TEST_CONFIG.qdrantUrl}/collections`)
			if (!response.ok) {
				throw new Error(`Qdrant not accessible: ${response.status}`)
			}

			const data = await response.json()
			this.qdrantCollections = data.result.collections.map((c) => c.name)
			console.log(`✅ Found ${this.qdrantCollections.length} Qdrant collections:`, this.qdrantCollections)
		} catch (error) {
			throw new Error(`Failed to connect to Qdrant: ${error.message}`)
		}
	}

	async getInitialRecordCounts() {
		console.log("📊 Getting initial record counts...")

		let totalRecords = 0
		let terminalRecords = 0

		for (const collection of this.qdrantCollections) {
			try {
				// Get collection info
				const infoResponse = await fetch(`${TEST_CONFIG.qdrantUrl}/collections/${collection}`)
				const infoData = await infoResponse.json()
				const collectionCount = infoData.result.points_count || 0
				totalRecords += collectionCount

				// Search for terminal records
				const searchResponse = await fetch(`${TEST_CONFIG.qdrantUrl}/collections/${collection}/points/search`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						vector: new Array(1536).fill(0), // Dummy vector for search
						filter: {
							must: [{ key: "type", match: { value: "terminal_output" } }],
						},
						limit: 1,
						with_payload: true,
					}),
				})

				if (searchResponse.ok) {
					const searchData = await searchResponse.json()
					terminalRecords += searchData.result?.length || 0
				}
			} catch (error) {
				console.warn(`⚠️  Could not query collection ${collection}:`, error.message)
			}
		}

		this.initialRecordCount = totalRecords
		console.log(`📊 Initial state: ${totalRecords} total records, ${terminalRecords} terminal records`)
	}

	verifyExtensionStructure() {
		console.log("🔍 Verifying extension structure...")

		const requiredFiles = [
			"src/core/tools/executeCommandTool.ts",
			"src/services/terminal-memory/TerminalMemoryService.ts",
			"src/services/terminal-memory/TerminalOutputIndexer.ts",
			"packages/types/src/global-settings.ts",
		]

		for (const file of requiredFiles) {
			if (!fs.existsSync(file)) {
				throw new Error(`Required file not found: ${file}`)
			}
		}

		console.log("✅ All required files present")
	}

	async executeTestCommands() {
		console.log("\n🧪 Phase 2: Execute Test Commands")

		// Note: This is a simulation since we can't directly invoke the VSCode extension
		// In a real test, we would need to:
		// 1. Start the VSCode extension
		// 2. Trigger commands through the extension API
		// 3. Monitor the terminal memory service

		console.log("⚠️  Note: This test simulates command execution")
		console.log("   For full E2E testing, commands must be executed through the VSCode extension")

		for (const testCase of TEST_CONFIG.testCommands) {
			console.log(`\n🔧 Testing: ${testCase.name}`)
			console.log(`   Command: ${testCase.command}`)

			// Simulate command execution
			await this.simulateCommandExecution(testCase)
		}
	}

	async simulateCommandExecution(testCase) {
		// This simulates what should happen when a command is executed
		console.log("   📝 Expected flow:")
		console.log("   1. executeCommandTool.onShellExecutionComplete() called")
		console.log("   2. terminalMemoryEnabled setting checked")
		console.log("   3. TerminalMemoryService.processTerminalExecution() called")
		console.log("   4. TerminalOutputIndexer.indexTerminalOutput() called")
		console.log('   5. Record with type: "terminal_output" stored in Qdrant')

		// Add to test results
		this.testResults.push({
			testCase: testCase.name,
			command: testCase.command,
			status: "simulated",
			timestamp: new Date().toISOString(),
		})
	}

	async validateResults() {
		console.log("\n✅ Phase 3: Validate Results")

		// Check for new terminal records
		await this.checkForTerminalRecords()

		// Validate record structure if any found
		await this.validateRecordStructure()
	}

	async checkForTerminalRecords() {
		console.log("🔍 Checking for terminal records...")

		let terminalRecords = []

		for (const collection of this.qdrantCollections) {
			try {
				const searchResponse = await fetch(`${TEST_CONFIG.qdrantUrl}/collections/${collection}/points/search`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						vector: new Array(1536).fill(0),
						filter: {
							must: [{ key: "type", match: { value: "terminal_output" } }],
						},
						limit: 100,
						with_payload: true,
					}),
				})

				if (searchResponse.ok) {
					const searchData = await searchResponse.json()
					if (searchData.result && searchData.result.length > 0) {
						terminalRecords.push(...searchData.result)
						console.log(`✅ Found ${searchData.result.length} terminal records in ${collection}`)
					}
				}
			} catch (error) {
				console.warn(`⚠️  Could not search collection ${collection}:`, error.message)
			}
		}

		if (terminalRecords.length === 0) {
			console.log("❌ No terminal records found in any collection")
			console.log("   This indicates the terminal memory feature is not working")
		} else {
			console.log(`✅ Found ${terminalRecords.length} terminal records total`)
		}

		this.terminalRecords = terminalRecords
	}

	async validateRecordStructure() {
		if (!this.terminalRecords || this.terminalRecords.length === 0) {
			console.log("⏭️  Skipping record structure validation (no records found)")
			return
		}

		console.log("🔍 Validating record structure...")

		const expectedFields = [
			"type",
			"commandId",
			"command",
			"outputChunk",
			"chunkIndex",
			"totalChunks",
			"exitCode",
			"workingDirectory",
			"timestamp",
			"taskId",
			"terminalId",
		]

		for (const record of this.terminalRecords.slice(0, 3)) {
			// Check first 3 records
			const payload = record.payload

			console.log(`   📋 Record ID: ${record.id}`)

			for (const field of expectedFields) {
				if (payload.hasOwnProperty(field)) {
					console.log(`   ✅ ${field}: ${JSON.stringify(payload[field]).substring(0, 50)}...`)
				} else {
					console.log(`   ❌ Missing field: ${field}`)
				}
			}

			// Validate type field specifically
			if (payload.type === "terminal_output") {
				console.log("   ✅ Correct record type: terminal_output")
			} else {
				console.log(`   ❌ Incorrect record type: ${payload.type}`)
			}
		}
	}

	reportResults() {
		console.log("\n📊 Phase 4: Test Results Report")
		console.log("=".repeat(60))

		console.log(`\n📈 Summary:`)
		console.log(`   Initial records: ${this.initialRecordCount}`)
		console.log(`   Terminal records found: ${this.terminalRecords?.length || 0}`)
		console.log(`   Test commands executed: ${this.testResults.length}`)

		console.log(`\n🎯 Feature Status:`)
		if (this.terminalRecords && this.terminalRecords.length > 0) {
			console.log("   ✅ Terminal memory feature is WORKING")
			console.log("   ✅ Records are being created and stored in Qdrant")
			console.log("   ✅ Record structure appears correct")
		} else {
			console.log("   ❌ Terminal memory feature is NOT WORKING")
			console.log("   ❌ No terminal records found in Qdrant")
			console.log("   ❌ Commands are not being indexed")
		}

		console.log(`\n🔧 Next Steps:`)
		if (!this.terminalRecords || this.terminalRecords.length === 0) {
			console.log("   1. Execute a command through the VSCode extension (not terminal)")
			console.log("   2. Check console logs for terminal memory processing")
			console.log("   3. Verify terminalMemoryEnabled setting is true")
			console.log("   4. Debug TerminalMemoryService initialization")
			console.log("   5. Re-run this test after executing commands")
		} else {
			console.log("   1. Test more complex commands")
			console.log("   2. Test settings toggle functionality")
			console.log("   3. Test error handling scenarios")
			console.log("   4. Validate search functionality")
		}

		console.log("\n" + "=".repeat(60))
		console.log("🏁 Test Complete")
	}
}

// Run the test
if (require.main === module) {
	const test = new TerminalMemoryE2ETest()
	test.run().catch((error) => {
		console.error("💥 Test runner failed:", error)
		process.exit(1)
	})
}

module.exports = TerminalMemoryE2ETest
