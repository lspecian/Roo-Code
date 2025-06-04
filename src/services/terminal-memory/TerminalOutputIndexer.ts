import { IVectorStore } from "../code-index/interfaces/vector-store"
import { IEmbedder } from "../code-index/interfaces/embedder"

export interface TerminalOutputRecord {
	id: string
	command: string
	output: string
	exitCode: number
	workingDirectory: string
	timestamp: Date
	taskId?: string
	terminalId?: string
}

export interface TerminalOutputChunk {
	id: string
	command: string
	outputChunk: string
	chunkIndex: number
	totalChunks: number
	exitCode: number
	workingDirectory: string
	timestamp: Date
	taskId?: string
	terminalId?: string
}

/**
 * Service for indexing terminal output into the vector store for future reference
 */
export class TerminalOutputIndexer {
	private static instance: TerminalOutputIndexer | null = null
	private vectorStore: IVectorStore | null = null
	private embedder: IEmbedder | null = null
	private isEnabled: boolean = false

	private constructor() {}

	public static getInstance(): TerminalOutputIndexer {
		if (!TerminalOutputIndexer.instance) {
			TerminalOutputIndexer.instance = new TerminalOutputIndexer()
		}
		return TerminalOutputIndexer.instance
	}

	/**
	 * Initialize the terminal output indexer with vector store and embedder
	 */
	public initialize(vectorStore: IVectorStore, embedder: IEmbedder): void {
		this.vectorStore = vectorStore
		this.embedder = embedder
		this.isEnabled = true
		console.log("[TerminalOutputIndexer] Initialized with vector store and embedder")
	}

	/**
	 * Disable the terminal output indexer
	 */
	public disable(): void {
		this.isEnabled = false
		this.vectorStore = null
		this.embedder = null
		console.log("[TerminalOutputIndexer] Disabled")
	}

	/**
	 * Index a terminal command and its output
	 */
	public async indexTerminalOutput(record: TerminalOutputRecord): Promise<void> {
		if (!this.isEnabled || !this.vectorStore || !this.embedder) {
			return
		}

		try {
			// Split large outputs into chunks for better indexing
			const chunks = this.splitOutputIntoChunks(record)

			for (const chunk of chunks) {
				await this.indexOutputChunk(chunk)
			}

			console.log(`[TerminalOutputIndexer] Indexed terminal output for command: ${record.command}`)
		} catch (error) {
			console.error("[TerminalOutputIndexer] Failed to index terminal output:", error)
		}
	}

	/**
	 * Search for relevant terminal output based on a query
	 */
	public async searchTerminalOutput(
		query: string,
		limit: number = 10,
		workingDirectory?: string,
	): Promise<TerminalOutputRecord[]> {
		if (!this.isEnabled || !this.vectorStore || !this.embedder) {
			return []
		}

		try {
			// Generate embedding for the query
			const queryEmbedding = await this.embedder.createEmbeddings([query])
			if (queryEmbedding.embeddings.length === 0) {
				return []
			}

			// Search in vector store with terminal output filter
			const results = await this.vectorStore.search(queryEmbedding.embeddings[0], workingDirectory)

			// Convert results back to terminal output records
			const terminalRecords: TerminalOutputRecord[] = []
			const seenCommands = new Set<string>()

			for (const result of results.slice(0, limit)) {
				if (result.payload?.type === "terminal_output") {
					const commandId = result.payload.commandId
					if (!seenCommands.has(commandId)) {
						seenCommands.add(commandId)
						terminalRecords.push({
							id: result.payload.commandId,
							command: result.payload.command,
							output: result.payload.fullOutput || result.payload.outputChunk,
							exitCode: result.payload.exitCode,
							workingDirectory: result.payload.workingDirectory,
							timestamp: new Date(result.payload.timestamp),
							taskId: result.payload.taskId,
							terminalId: result.payload.terminalId,
						})
					}
				}
			}

			return terminalRecords
		} catch (error) {
			console.error("[TerminalOutputIndexer] Failed to search terminal output:", error)
			return []
		}
	}

	/**
	 * Get recent terminal output for context
	 */
	public async getRecentTerminalOutput(
		limit: number = 5,
		workingDirectory?: string,
	): Promise<TerminalOutputRecord[]> {
		// For now, we'll use a simple search for recent commands
		// In a more sophisticated implementation, we could maintain a separate recent commands cache
		return this.searchTerminalOutput("recent command output", limit, workingDirectory)
	}

	/**
	 * Split large terminal output into manageable chunks
	 */
	private splitOutputIntoChunks(record: TerminalOutputRecord): TerminalOutputChunk[] {
		const maxChunkSize = 2000 // Maximum characters per chunk
		const output = record.output

		if (output.length <= maxChunkSize) {
			return [
				{
					...record,
					outputChunk: output,
					chunkIndex: 0,
					totalChunks: 1,
				},
			]
		}

		const chunks: TerminalOutputChunk[] = []
		const lines = output.split("\n")
		let currentChunk = ""
		let chunkIndex = 0

		for (const line of lines) {
			if (currentChunk.length + line.length + 1 > maxChunkSize && currentChunk.length > 0) {
				chunks.push({
					...record,
					outputChunk: currentChunk,
					chunkIndex,
					totalChunks: 0, // Will be set after all chunks are created
				})
				currentChunk = line
				chunkIndex++
			} else {
				currentChunk += (currentChunk.length > 0 ? "\n" : "") + line
			}
		}

		if (currentChunk.length > 0) {
			chunks.push({
				...record,
				outputChunk: currentChunk,
				chunkIndex,
				totalChunks: 0,
			})
		}

		// Set total chunks count
		chunks.forEach((chunk) => (chunk.totalChunks = chunks.length))

		return chunks
	}

	/**
	 * Index a single output chunk
	 */
	private async indexOutputChunk(chunk: TerminalOutputChunk): Promise<void> {
		if (!this.vectorStore || !this.embedder) {
			return
		}

		// Create a searchable text combining command and output
		const searchableText = `Command: ${chunk.command}\nWorking Directory: ${chunk.workingDirectory}\nOutput: ${chunk.outputChunk}`

		// Generate embedding
		const embeddingResponse = await this.embedder.createEmbeddings([searchableText])
		if (embeddingResponse.embeddings.length === 0) {
			throw new Error("Failed to generate embedding for terminal output")
		}
		const embedding = embeddingResponse.embeddings[0]

		// Create unique ID for this chunk
		const chunkId = this.generateChunkId(chunk)

		// Create point for vector store
		const point = {
			id: chunkId,
			vector: embedding,
			payload: {
				type: "terminal_output",
				commandId: chunk.id,
				command: chunk.command,
				outputChunk: chunk.outputChunk,
				chunkIndex: chunk.chunkIndex,
				totalChunks: chunk.totalChunks,
				exitCode: chunk.exitCode,
				workingDirectory: chunk.workingDirectory,
				timestamp: chunk.timestamp.toISOString(),
				taskId: chunk.taskId,
				terminalId: chunk.terminalId,
				// Include full output for single-chunk commands
				...(chunk.totalChunks === 1 && { fullOutput: chunk.outputChunk }),
			},
		}

		// Upsert to vector store
		await this.vectorStore.upsertPoints([point])
	}

	/**
	 * Generate a unique ID for a terminal output chunk
	 */
	private generateChunkId(chunk: TerminalOutputChunk): string {
		const data = `${chunk.id}-${chunk.chunkIndex}-${chunk.timestamp.getTime()}`
		// Simple hash alternative without crypto dependency
		let hash = 0
		for (let i = 0; i < data.length; i++) {
			const char = data.charCodeAt(i)
			hash = (hash << 5) - hash + char
			hash = hash & hash // Convert to 32bit integer
		}
		return `terminal_${Math.abs(hash).toString(16)}`
	}

	/**
	 * Clear old terminal output records (for cleanup)
	 */
	public async clearOldTerminalOutput(olderThanDays: number = 30): Promise<void> {
		// This would require implementing a cleanup mechanism in the vector store
		// For now, we'll log the intent
		console.log(`[TerminalOutputIndexer] Would clear terminal output older than ${olderThanDays} days`)
	}
}
