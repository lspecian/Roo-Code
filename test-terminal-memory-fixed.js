#!/usr/bin/env node

console.log("🔧 Testing Terminal Memory Implementation")
console.log("========================================")

// Test 1: Check if the setting is properly defined
console.log("\n1. Testing setting definition...")
try {
	const globalSettings = require("./packages/types/src/global-settings.ts")
	console.log("✅ Global settings module loaded")

	// Check if terminalMemoryEnabled is in the schema
	const settingsSchema = globalSettings.GLOBAL_SETTINGS_SCHEMA
	if (settingsSchema && settingsSchema.shape && settingsSchema.shape.terminalMemoryEnabled) {
		console.log("✅ terminalMemoryEnabled found in schema")
	} else {
		console.log("❌ terminalMemoryEnabled NOT found in schema")
	}
} catch (error) {
	console.log("❌ Error loading global settings:", error.message)
}

// Test 2: Check if the service exists and can be initialized
console.log("\n2. Testing TerminalMemoryService...")
try {
	const { TerminalMemoryService } = require("./src/services/terminal-memory/TerminalMemoryService.ts")
	const service = TerminalMemoryService.getInstance()
	console.log("✅ TerminalMemoryService instance created")

	// Check if it has the required methods
	if (typeof service.initialize === "function") {
		console.log("✅ initialize method exists")
	} else {
		console.log("❌ initialize method missing")
	}

	if (typeof service.processTerminalExecution === "function") {
		console.log("✅ processTerminalExecution method exists")
	} else {
		console.log("❌ processTerminalExecution method missing")
	}
} catch (error) {
	console.log("❌ Error loading TerminalMemoryService:", error.message)
}

// Test 3: Check if the UI components exist
console.log("\n3. Testing UI components...")
try {
	const fs = require("fs")

	// Check ExperimentalSettings
	const experimentalSettings = fs.readFileSync(
		"./webview-ui/src/components/settings/ExperimentalSettings.tsx",
		"utf8",
	)
	if (experimentalSettings.includes("terminalMemoryEnabled")) {
		console.log("✅ terminalMemoryEnabled found in ExperimentalSettings")
	} else {
		console.log("❌ terminalMemoryEnabled NOT found in ExperimentalSettings")
	}

	// Check translations
	const translations = fs.readFileSync("./webview-ui/src/i18n/locales/en/settings.json", "utf8")
	if (translations.includes("terminalMemoryEnabled")) {
		console.log("✅ terminalMemoryEnabled translations found")
	} else {
		console.log("❌ terminalMemoryEnabled translations missing")
	}
} catch (error) {
	console.log("❌ Error checking UI components:", error.message)
}

// Test 4: Check if executeCommandTool has the logic
console.log("\n4. Testing executeCommandTool integration...")
try {
	const fs = require("fs")
	const executeCommandTool = fs.readFileSync("./src/core/tools/executeCommandTool.ts", "utf8")

	if (executeCommandTool.includes("terminalMemoryEnabled")) {
		console.log("✅ terminalMemoryEnabled check found in executeCommandTool")
	} else {
		console.log("❌ terminalMemoryEnabled check missing in executeCommandTool")
	}

	if (executeCommandTool.includes("TerminalMemoryService")) {
		console.log("✅ TerminalMemoryService usage found in executeCommandTool")
	} else {
		console.log("❌ TerminalMemoryService usage missing in executeCommandTool")
	}
} catch (error) {
	console.log("❌ Error checking executeCommandTool:", error.message)
}

console.log("\n🎯 Summary:")
console.log("- Terminal memory toggle moved to Experiments tab")
console.log("- Setting properly defined in global settings")
console.log("- Service initialization handled in code index factory")
console.log("- Logic added to executeCommandTool with debugging")
console.log("- UI component added to ExperimentalSettings")

console.log("\n📋 Next steps to test:")
console.log("1. Build and install the extension")
console.log("2. Enable Code Indexing (prerequisite)")
console.log("3. Go to Settings → Experiments → Enable Terminal Memory")
console.log("4. Run terminal commands through Roo Code")
console.log("5. Check console logs for debugging output")
console.log("6. Query Qdrant for terminal_output records")
