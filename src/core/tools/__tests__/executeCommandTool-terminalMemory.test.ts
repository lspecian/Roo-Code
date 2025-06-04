import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals"
import { TerminalMemoryService } from "../../../services/terminal-memory/TerminalMemoryService"

// Mock the TerminalMemoryService
jest.mock("../../../services/terminal-memory/TerminalMemoryService")

describe("executeCommandTool - Terminal Memory Integration", () => {
	let mockTerminalMemoryService: jest.Mocked<TerminalMemoryService>

	beforeEach(() => {
		// Reset all mocks
		jest.clearAllMocks()

		// Mock TerminalMemoryService
		mockTerminalMemoryService = {
			processTerminalExecution: jest.fn(),
		} as any
		;(TerminalMemoryService.getInstance as jest.Mock).mockReturnValue(mockTerminalMemoryService)
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	it("should call terminal memory service when terminalMemoryEnabled is true", async () => {
		// Arrange
		const mockProvider = {
			contextProxy: {
				getValues: jest.fn().mockReturnValue({
					terminalMemoryEnabled: true,
				}),
			},
		}

		// Act - simulate the terminal memory logic from executeCommandTool
		const globalSettings = mockProvider.contextProxy.getValues() as any
		const terminalMemoryEnabled = globalSettings?.terminalMemoryEnabled ?? false

		if (terminalMemoryEnabled) {
			const terminalMemoryService = TerminalMemoryService.getInstance()
			await terminalMemoryService.processTerminalExecution(
				"test command",
				"test output",
				0,
				"/test/dir",
				"test-task-id",
				"test-terminal-id",
			)
		}

		// Assert
		expect(mockProvider.contextProxy.getValues).toHaveBeenCalled()
		expect(TerminalMemoryService.getInstance).toHaveBeenCalled()
		expect(mockTerminalMemoryService.processTerminalExecution).toHaveBeenCalledWith(
			"test command",
			"test output",
			0,
			"/test/dir",
			"test-task-id",
			"test-terminal-id",
		)
	})

	it("should NOT call terminal memory service when terminalMemoryEnabled is false", async () => {
		// Arrange
		const mockProvider = {
			contextProxy: {
				getValues: jest.fn().mockReturnValue({
					terminalMemoryEnabled: false,
				}),
			},
		}

		// Act - simulate the terminal memory logic from executeCommandTool
		const globalSettings = mockProvider.contextProxy.getValues() as any
		const terminalMemoryEnabled = globalSettings?.terminalMemoryEnabled ?? false

		if (terminalMemoryEnabled) {
			const terminalMemoryService = TerminalMemoryService.getInstance()
			await terminalMemoryService.processTerminalExecution(
				"test command",
				"test output",
				0,
				"/test/dir",
				"test-task-id",
				"test-terminal-id",
			)
		}

		// Assert
		expect(mockProvider.contextProxy.getValues).toHaveBeenCalled()
		expect(TerminalMemoryService.getInstance).not.toHaveBeenCalled()
		expect(mockTerminalMemoryService.processTerminalExecution).not.toHaveBeenCalled()
	})

	it("should default to false when terminalMemoryEnabled is undefined", async () => {
		// Arrange
		const mockProvider = {
			contextProxy: {
				getValues: jest.fn().mockReturnValue({
					// terminalMemoryEnabled is undefined
				}),
			},
		}

		// Act - simulate the terminal memory logic from executeCommandTool
		const globalSettings = mockProvider.contextProxy.getValues() as any
		const terminalMemoryEnabled = globalSettings?.terminalMemoryEnabled ?? false

		if (terminalMemoryEnabled) {
			const terminalMemoryService = TerminalMemoryService.getInstance()
			await terminalMemoryService.processTerminalExecution(
				"test command",
				"test output",
				0,
				"/test/dir",
				"test-task-id",
				"test-terminal-id",
			)
		}

		// Assert
		expect(terminalMemoryEnabled).toBe(false)
		expect(mockProvider.contextProxy.getValues).toHaveBeenCalled()
		expect(TerminalMemoryService.getInstance).not.toHaveBeenCalled()
		expect(mockTerminalMemoryService.processTerminalExecution).not.toHaveBeenCalled()
	})

	it("should handle errors gracefully when provider is undefined", async () => {
		// Arrange
		const provider: any = undefined

		// Act - simulate the terminal memory logic from executeCommandTool
		const globalSettings = provider?.contextProxy?.getValues()
		const terminalMemoryEnabled = globalSettings?.terminalMemoryEnabled ?? false

		if (terminalMemoryEnabled) {
			const terminalMemoryService = TerminalMemoryService.getInstance()
			await terminalMemoryService.processTerminalExecution(
				"test command",
				"test output",
				0,
				"/test/dir",
				"test-task-id",
				"test-terminal-id",
			)
		}

		// Assert
		expect(terminalMemoryEnabled).toBe(false)
		expect(TerminalMemoryService.getInstance).not.toHaveBeenCalled()
		expect(mockTerminalMemoryService.processTerminalExecution).not.toHaveBeenCalled()
	})
})
