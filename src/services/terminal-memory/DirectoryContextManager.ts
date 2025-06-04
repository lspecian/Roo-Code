// Simple directory context manager without Node.js dependencies

export interface DirectoryContext {
	workingDirectory: string
	lastCommand?: string
	lastCommandTime?: Date
	lastCommandExitCode?: number
	projectRoot?: string
	relativeToProject?: string
	recentCommands: CommandHistory[]
	directoryType?: DirectoryType
}

export interface CommandHistory {
	command: string
	timestamp: Date
	exitCode: number
	workingDirectory: string
}

export type DirectoryType =
	| "project_root"
	| "src"
	| "test"
	| "config"
	| "docs"
	| "build"
	| "node_modules"
	| "git"
	| "unknown"

/**
 * Service for managing directory context and working directory intelligence
 */
export class DirectoryContextManager {
	private static instance: DirectoryContextManager | null = null
	private directoryContexts: Map<string, DirectoryContext> = new Map()
	private currentWorkingDirectory: string
	private projectRoot: string

	private constructor() {
		// Default to empty, will be set during initialization
		this.projectRoot = ""
		this.currentWorkingDirectory = ""
	}

	/**
	 * Initialize with workspace root
	 */
	public initialize(workspaceRoot: string): void {
		this.projectRoot = workspaceRoot
		this.currentWorkingDirectory = workspaceRoot
	}

	public static getInstance(): DirectoryContextManager {
		if (!DirectoryContextManager.instance) {
			DirectoryContextManager.instance = new DirectoryContextManager()
		}
		return DirectoryContextManager.instance
	}

	/**
	 * Update the current working directory and track context
	 */
	public updateWorkingDirectory(newDirectory: string, command?: string, exitCode?: number): void {
		// Use the directory as-is for now
		const normalizedDirectory = newDirectory
		this.currentWorkingDirectory = normalizedDirectory

		// Get or create directory context
		let context = this.directoryContexts.get(normalizedDirectory)
		if (!context) {
			context = this.createDirectoryContext(normalizedDirectory)
			this.directoryContexts.set(normalizedDirectory, context)
		}

		// Update context with command information
		if (command) {
			context.lastCommand = command
			context.lastCommandTime = new Date()
			context.lastCommandExitCode = exitCode

			// Add to recent commands (keep last 10)
			context.recentCommands.unshift({
				command,
				timestamp: new Date(),
				exitCode: exitCode || 0,
				workingDirectory: normalizedDirectory,
			})
			context.recentCommands = context.recentCommands.slice(0, 10)
		}

		console.log(`[DirectoryContextManager] Updated working directory: ${normalizedDirectory}`)
	}

	/**
	 * Get the current working directory
	 */
	public getCurrentWorkingDirectory(): string {
		return this.currentWorkingDirectory
	}

	/**
	 * Get context for a specific directory
	 */
	public getDirectoryContext(directory: string): DirectoryContext | undefined {
		return this.directoryContexts.get(directory)
	}

	/**
	 * Get context for the current working directory
	 */
	public getCurrentDirectoryContext(): DirectoryContext {
		let context = this.directoryContexts.get(this.currentWorkingDirectory)
		if (!context) {
			context = this.createDirectoryContext(this.currentWorkingDirectory)
			this.directoryContexts.set(this.currentWorkingDirectory, context)
		}
		return context
	}

	/**
	 * Get all directory contexts for environment details
	 */
	public getAllDirectoryContexts(): DirectoryContext[] {
		return Array.from(this.directoryContexts.values())
	}

	/**
	 * Get recent commands across all directories
	 */
	public getRecentCommands(limit: number = 10): CommandHistory[] {
		const allCommands: CommandHistory[] = []

		for (const context of this.directoryContexts.values()) {
			allCommands.push(...context.recentCommands)
		}

		// Sort by timestamp (most recent first) and limit
		return allCommands.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, limit)
	}

	/**
	 * Get commands for a specific directory
	 */
	public getDirectoryCommands(directory: string, limit: number = 5): CommandHistory[] {
		const context = this.getDirectoryContext(directory)
		return context?.recentCommands.slice(0, limit) || []
	}

	/**
	 * Suggest the best working directory for a command
	 */
	public suggestWorkingDirectory(command: string): string {
		// Analyze command to suggest appropriate directory
		const commandLower = command.toLowerCase()

		// npm/yarn/pnpm commands should run in package.json directory
		if (commandLower.match(/^(npm|yarn|pnpm|bun)\s/)) {
			const packageJsonDir = this.findNearestPackageJson(this.currentWorkingDirectory)
			if (packageJsonDir) {
				return packageJsonDir
			}
		}

		// git commands should run in git repository root
		if (commandLower.match(/^git\s/)) {
			const gitRoot = this.findGitRoot(this.currentWorkingDirectory)
			if (gitRoot) {
				return gitRoot
			}
		}

		// Test commands should run in appropriate test directory
		if (commandLower.match(/test|spec|jest|vitest|mocha/)) {
			const testDir = this.findTestDirectory(this.currentWorkingDirectory)
			if (testDir) {
				return testDir
			}
		}

		// Build commands should run in project root
		if (commandLower.match(/build|compile|bundle|webpack|vite|rollup/)) {
			return this.projectRoot
		}

		// Default to current working directory
		return this.currentWorkingDirectory
	}

	/**
	 * Get directory context summary for environment details
	 */
	public getContextSummary(): string {
		const currentContext = this.getCurrentDirectoryContext()
		const recentCommands = this.getRecentCommands(5)

		let summary = `Current Working Directory: ${this.currentWorkingDirectory}\n`
		summary += `Relative to Project: ${currentContext.relativeToProject || "N/A"}\n`
		summary += `Directory Type: ${currentContext.directoryType || "unknown"}\n`

		if (currentContext.lastCommand) {
			summary += `Last Command: ${currentContext.lastCommand} (exit code: ${currentContext.lastCommandExitCode})\n`
		}

		if (recentCommands.length > 0) {
			summary += `\nRecent Commands:\n`
			recentCommands.forEach((cmd, index) => {
				const relativeDir = this.getRelativePath(this.projectRoot, cmd.workingDirectory) || "."
				summary += `  ${index + 1}. ${cmd.command} (in ${relativeDir}, exit: ${cmd.exitCode})\n`
			})
		}

		return summary
	}

	/**
	 * Create a new directory context
	 */
	private createDirectoryContext(directory: string): DirectoryContext {
		const relativeToProject = this.getRelativePath(this.projectRoot, directory) || "."
		const directoryType = this.determineDirectoryType(directory)

		return {
			workingDirectory: directory,
			projectRoot: this.projectRoot,
			relativeToProject,
			recentCommands: [],
			directoryType,
		}
	}

	/**
	 * Simple relative path calculation
	 */
	private getRelativePath(from: string, to: string): string {
		if (to.startsWith(from)) {
			const relative = to.substring(from.length)
			return relative.startsWith("/") || relative.startsWith("\\") ? relative.substring(1) : relative
		}
		return to
	}

	/**
	 * Simple path basename
	 */
	private getBasename(filePath: string): string {
		const parts = filePath.replace(/\\/g, "/").split("/")
		return parts[parts.length - 1] || ""
	}

	/**
	 * Simple path dirname
	 */
	private getDirname(filePath: string): string {
		const parts = filePath.replace(/\\/g, "/").split("/")
		parts.pop()
		return parts.join("/") || "/"
	}

	/**
	 * Simple path join
	 */
	private joinPath(...parts: string[]): string {
		return parts.join("/").replace(/\/+/g, "/")
	}

	/**
	 * Determine the type of directory
	 */
	private determineDirectoryType(directory: string): DirectoryType {
		const relativePath = this.getRelativePath(this.projectRoot, directory)
		const dirName = this.getBasename(directory)

		if (relativePath === "" || relativePath === ".") {
			return "project_root"
		}

		if (relativePath.startsWith("src") || dirName === "src") {
			return "src"
		}

		if (relativePath.includes("test") || relativePath.includes("spec") || dirName.includes("test")) {
			return "test"
		}

		if (dirName === "node_modules" || relativePath.includes("node_modules")) {
			return "node_modules"
		}

		if (dirName === ".git" || relativePath.includes(".git")) {
			return "git"
		}

		if (relativePath.includes("config") || dirName.includes("config")) {
			return "config"
		}

		if (relativePath.includes("doc") || dirName.includes("doc")) {
			return "docs"
		}

		if (relativePath.includes("build") || relativePath.includes("dist") || dirName.includes("build")) {
			return "build"
		}

		return "unknown"
	}

	/**
	 * Find the nearest directory containing package.json
	 */
	private findNearestPackageJson(startDir: string): string | null {
		// Simplified implementation - just return the project root for now
		return this.projectRoot
	}

	/**
	 * Find the git repository root
	 */
	private findGitRoot(startDir: string): string | null {
		// Simplified implementation - just return the project root for now
		return this.projectRoot
	}

	/**
	 * Find appropriate test directory
	 */
	private findTestDirectory(startDir: string): string | null {
		// Simplified implementation - return a test directory path
		return this.joinPath(this.projectRoot, "test")
	}

	/**
	 * Clear old directory contexts (for cleanup)
	 */
	public clearOldContexts(olderThanHours: number = 24): void {
		const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)

		for (const [directory, context] of this.directoryContexts.entries()) {
			if (context.lastCommandTime && context.lastCommandTime < cutoffTime) {
				this.directoryContexts.delete(directory)
			}
		}

		console.log(`[DirectoryContextManager] Cleared old directory contexts older than ${olderThanHours} hours`)
	}
}
