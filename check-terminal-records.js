#!/usr/bin/env node

/**
 * Quick check for terminal records in Qdrant
 */

async function checkTerminalRecords() {
	console.log("🔍 Checking for terminal records in Qdrant...")

	const qdrantUrl = "http://localhost:6333"

	try {
		// Get collections
		const response = await fetch(`${qdrantUrl}/collections`)
		const data = await response.json()
		const collections = data.result.collections.map((c) => c.name)

		console.log(`✅ Found ${collections.length} collections:`, collections)

		let totalTerminalRecords = 0

		for (const collection of collections) {
			try {
				// Search for terminal records
				const searchResponse = await fetch(`${qdrantUrl}/collections/${collection}/points/search`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						vector: new Array(1536).fill(0),
						filter: {
							must: [{ key: "type", match: { value: "terminal_output" } }],
						},
						limit: 10,
						with_payload: true,
					}),
				})

				if (searchResponse.ok) {
					const searchData = await searchResponse.json()
					const terminalRecords = searchData.result || []

					if (terminalRecords.length > 0) {
						console.log(`🎯 Found ${terminalRecords.length} terminal records in ${collection}:`)
						terminalRecords.forEach((record, i) => {
							console.log(`   ${i + 1}. Command: ${record.payload.command}`)
							console.log(`      Output: ${record.payload.outputChunk.substring(0, 50)}...`)
							console.log(`      Timestamp: ${record.payload.timestamp}`)
						})
						totalTerminalRecords += terminalRecords.length
					}
				}
			} catch (error) {
				console.warn(`⚠️  Could not search collection ${collection}:`, error.message)
			}
		}

		if (totalTerminalRecords === 0) {
			console.log("❌ No terminal records found in any collection")
			console.log("🔧 This means the terminal memory feature is still not working")
		} else {
			console.log(`✅ SUCCESS! Found ${totalTerminalRecords} terminal records total`)
			console.log("🎉 Terminal memory feature is working!")
		}
	} catch (error) {
		console.error("❌ Failed to check Qdrant:", error)
	}
}

checkTerminalRecords().catch(console.error)
