import 'dotenv/config';
import { MCPClientManager } from '../api/lib/mcp-client.ts';

async function testMCP() {
  const projectId = process.env.SUPABASE_PROJECT_ID;
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  console.log('--- MCP Connection Test ---');
  console.log('Project ID:', projectId);
  console.log('Access Token defined:', !!accessToken);

  if (!projectId || !accessToken) {
    console.error('Error: SUPABASE_PROJECT_ID or SUPABASE_ACCESS_TOKEN not found in environment.');
    process.exit(1);
  }

  const manager = MCPClientManager.getInstance();

  try {
    console.log('Connecting to MCP Server...');
    await manager.connect(projectId);
    console.log('Connected successfully!');

    console.log('Fetching tools...');
    const tools = await manager.getTools();
    console.log(`Found ${tools.length} tools:`);
    tools.forEach(t => console.log(` - ${t.name}: ${t.description?.slice(0, 60)}`));

    // Test execute_sql with correct parameter name: query (not sql)
    console.log('\n--- Testing execute_sql with query parameter ---');
    try {
      const result = await manager.callTool('execute_sql', {
        query: 'SELECT COUNT(*) as total FROM players'
      });
      console.log('SUCCESS! Tool result:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.error('Tool execution error:', e);
    }

    await manager.disconnect();
    console.log('Disconnected.');
  } catch (error) {
    console.error('MCP Test failed:', error);
    process.exit(1);
  }
}

testMCP();
