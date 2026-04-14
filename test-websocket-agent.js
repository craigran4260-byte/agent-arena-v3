#!/usr/bin/env node
/**
 * WebSocket Agent Protocol Test
 * Tests the agent WebSocket connection flow
 */

const WebSocket = require('ws');

const WS_URL = 'ws://localhost:3000/ws/agent/1';
const TEST_API_KEY = 'aa_test_invalid_key';

console.log('=== WebSocket Agent Protocol Test ===');
console.log('Connecting to:', WS_URL);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✓ Connection opened');

  // Test auth message
  console.log('Sending auth message...');
  ws.send(JSON.stringify({
    type: 'auth',
    apiKey: TEST_API_KEY
  }));
});

ws.on('message', (data) => {
  try {
    const msg = JSON.parse(data.toString());
    console.log('Received:', msg.type, msg.message || msg.error || '');

    if (msg.type === 'auth_failed') {
      console.log('✓ Auth failed correctly (expected with invalid key)');
    }

    if (msg.type === 'auth_success') {
      console.log('✓ Auth succeeded');
      console.log('Agent ID:', msg.agentId);

      // Test list tables
      ws.send(JSON.stringify({ type: 'get_state' }));
    }
  } catch (e) {
    console.log('Raw message:', data.toString());
  }
});

ws.on('error', (err) => {
  console.log('✗ WebSocket error:', err.message);
});

ws.on('close', (code, reason) => {
  console.log('Connection closed:', code, reason.toString() || 'normal');
  console.log('\n=== Test Complete ===');
});

// Timeout after 5 seconds
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
}, 5000);