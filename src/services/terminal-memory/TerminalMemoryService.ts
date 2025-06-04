import { TerminalOutputIndexer, TerminalOutputRecord } from "./TerminalOutputIndexer"
import { DirectoryContextManager, DirectoryContext, CommandHistory } from "./DirectoryContextManager"
import { IVectorStore } from "../code-index/interfaces/vector-store"
import { IEmbedder } from "../code-index/interfaces/embedder"

/**
 * Unified service that combines terminal output indexing and directory context management
 * This service provides comprehensive terminal memory and context awareness
 */
export class TerminalMemoryService {
	private static instance: TerminalMemoryService | null = null
	private terminalOutputIndexer: TerminalOutputIndexer
	private directoryContextManager: DirectoryContextManager
	private isInitialized: boolean = false

	private constructor() {
		this.terminalOutputIndexer = TerminalOutputIndexer.getInstance()
		this.directoryContextManager = DirectoryContextManager.getInstance()
	}

	public static getInstance(): TerminalMemoryService {
		if (!TerminalMemoryService.instance) {
			TerminalMemoryService.instance = new TerminalMemoryService()
		}
		return TerminalMemoryService.instance
	}

	/**
	 * Initialize the terminal memory service with vector store and embedder
	 */
	public initialize(vectorStore: IVectorStore, embedder: IEmbedder, workspaceRoot: string): void {
		this.terminalOutputIndexer.initialize(vectorStore, embedder)
		this.directoryContextManager.initialize(workspaceRoot)
		this.isInitialized = true
		console.log("[TerminalMemoryService] Initialized with vector store, embedder, and workspace root")
	}

	/**
	 * Process a terminal command execution with full context tracking
	 */
	public async processTerminalExecution(
		command: string,
		output: string,
		exitCode: number,
		workingDirectory: string,
		taskId?: string,
		terminalId?: string,
	): Promise<void> {
		if (!this.isInitialized) {
			console.warn("[TerminalMemoryService] Service not initialized, skipping terminal execution processing")
			return
		}

		try {
			// Update directory context first
			this.directoryContextManager.updateWorkingDirectory(workingDirectory, command, exitCode)

			// Create terminal output record
			const terminalRecord: TerminalOutputRecord = {
				id: this.generateRecordId(command, workingDirectory),
				command,
				output,
				exitCode,
				workingDirectory,
				timestamp: new Date(),
				taskId,
				terminalId,
			}

			// Index the terminal output
			await this.terminalOutputIndexer.indexTerminalOutput(terminalRecord)

			console.log(`[TerminalMemoryService] Processed terminal execution: ${command} in ${workingDirectory}`)
		} catch (error) {
			console.error("[TerminalMemoryService] Failed to process terminal execution:", error)
		}
	}

	/**
	 * Get enhanced environment details including terminal history and directory context
	 */
	public getEnhancedEnvironmentDetails(): string {
		if (!this.isInitialized) {
			return ""
		}

		let details = ""

		// Add directory context information
		const directoryContext = this.directoryContextManager.getContextSummary()
		if (directoryContext) {
			details += "## Directory Context\n"
			details += directoryContext + "\n\n"
		}

		// Add recent terminal history
		const recentCommands = this.directoryContextManager.getRecentCommands(10)
		if (recentCommands.length > 0) {
			details += "## Recent Terminal History\n"
			recentCommands.forEach((cmd, index) => {
				const relativeDir = this.getRelativeDirectory(cmd.workingDirectory)
				details += `${index + 1}. \`${cmd.command}\` (${relativeDir}) - Exit: ${cmd.exitCode}\n`
			})
			details += "\n"
		}

		return details
	}

	/**
	 * Search for relevant terminal output based on a query
	 */
	public async searchTerminalHistory(
		query: string,
		limit: number = 5,
		workingDirectory?: string,
	): Promise<TerminalOutputRecord[]> {
		if (!this.isInitialized) {
			return []
		}

		return this.terminalOutputIndexer.searchTerminalOutput(query, limit, workingDirectory)
	}

	/**
	 * Get context-aware command suggestions based on current directory and history
	 */
	public getCommandSuggestions(currentDirectory: string): string[] {
		if (!this.isInitialized) {
			return []
		}

		const suggestions: string[] = []
		const directoryContext = this.directoryContextManager.getDirectoryContext(currentDirectory)

		if (directoryContext) {
			// Get recent commands from this directory
			const recentCommands = directoryContext.recentCommands.slice(0, 3)
			suggestions.push(...recentCommands.map((cmd) => cmd.command))

			// Add directory-specific suggestions based on directory type
			switch (directoryContext.directoryType) {
				case "project_root":
					suggestions.push("npm install", "npm run dev", "git status", "git pull")
					break
				case "src":
					suggestions.push("npm run build", "npm run test", "git add .")
					break
				case "test":
					suggestions.push("npm test", "npm run test:watch", "jest")
					break
				case "docs":
					suggestions.push("npm run docs", "git add .", "markdown-lint")
					break
			}
		}

		// Remove duplicates and return
		return [...new Set(suggestions)]
	}

	/**
	 * Suggest the best working directory for a command
	 */
	public suggestWorkingDirectory(command: string): string {
		if (!this.isInitialized) {
			return ""
		}

		return this.directoryContextManager.suggestWorkingDirectory(command)
	}

	/**
	 * Get current working directory
	 */
	public getCurrentWorkingDirectory(): string {
		if (!this.isInitialized) {
			return ""
		}

		return this.directoryContextManager.getCurrentWorkingDirectory()
	}

	/**
	 * Get directory context for a specific directory
	 */
	public getDirectoryContext(directory: string): DirectoryContext | undefined {
		if (!this.isInitialized) {
			return undefined
		}

		return this.directoryContextManager.getDirectoryContext(directory)
	}

	/**
	 * Get recent commands for a specific directory
	 */
	public getDirectoryCommands(directory: string, limit: number = 5): CommandHistory[] {
		if (!this.isInitialized) {
			return []
		}

		return this.directoryContextManager.getDirectoryCommands(directory, limit)
	}

	/**
	 * Check if a command might change the working directory
	 */
	public isDirectoryChangeCommand(command: string): boolean {
		const trimmedCommand = command.trim().toLowerCase()
		return (
			trimmedCommand.startsWith("cd ") ||
			trimmedCommand === "cd" ||
			trimmedCommand.startsWith("pushd ") ||
			trimmedCommand.startsWith("popd")
		)
	}

	/**
	 * Extract the target directory from a cd command
	 */
	public extractTargetDirectory(command: string, currentDirectory: string): string {
		const trimmedCommand = command.trim()

		if (trimmedCommand.toLowerCase().startsWith("cd ")) {
			const targetPath = trimmedCommand.substring(3).trim()

			// Handle special cases
			if (targetPath === "" || targetPath === "~") {
				return "~" // Home directory
			}

			if (targetPath === "..") {
				return this.getParentDirectory(currentDirectory)
			}

			if (targetPath.startsWith("/")) {
				return targetPath // Absolute path
			}

			// Relative path
			return this.joinPaths(currentDirectory, targetPath)
		}

		return currentDirectory
	}

	/**
	 * Cleanup old terminal data
	 */
	public async cleanup(olderThanDays: number = 30): Promise<void> {
		if (!this.isInitialized) {
			return
		}

		// Cleanup old terminal output
		await this.terminalOutputIndexer.clearOldTerminalOutput(olderThanDays)

		// Cleanup old directory contexts
		this.directoryContextManager.clearOldContexts(olderThanDays * 24)

		console.log(`[TerminalMemoryService] Cleaned up data older than ${olderThanDays} days`)
	}

	/**
	 * Disable the terminal memory service
	 */
	public disable(): void {
		this.terminalOutputIndexer.disable()
		this.isInitialized = false
		console.log("[TerminalMemoryService] Disabled")
	}

	/**
	 * Generate a unique record ID for terminal output
	 */
	private generateRecordId(command: string, workingDirectory: string): string {
		const timestamp = Date.now()
		const data = `${command}-${workingDirectory}-${timestamp}`

		// Simple hash function
		let hash = 0
		for (let i = 0; i < data.length; i++) {
			const char = data.charCodeAt(i)
			hash = (hash << 5) - hash + char
			hash = hash & hash // Convert to 32bit integer
		}

		return `cmd_${Math.abs(hash).toString(16)}_${timestamp}`
	}

	/**
	 * Get relative directory path for display
	 */
	private getRelativeDirectory(directory: string): string {
		const currentContext = this.directoryContextManager.getCurrentDirectoryContext()
		if (currentContext.projectRoot && directory.startsWith(currentContext.projectRoot)) {
			const relative = directory.substring(currentContext.projectRoot.length)
			return relative.startsWith("/") || relative.startsWith("\\") ? relative.substring(1) : relative || "."
		}
		return directory
	}

	/**
	 * Simple path joining
	 */
	private joinPaths(base: string, relative: string): string {
		if (base.endsWith("/") || base.endsWith("\\")) {
			return base + relative
		}
		return base + "/" + relative
	}

	/**
	 * Get parent directory
	 */
	private getParentDirectory(directory: string): string {
		const parts = directory.replace(/\\/g, "/").split("/")
		parts.pop()
		return parts.join("/") || "/"
	}
}
