import fetch from 'node-fetch';

async function verify() {
  try {
    const res = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello',
        conversationId: 'test-conv-123',
        workspaceId: 'ws-enterprise-legal',
        ragMode: 'strict',
        locale: 'ar'
      })
    });
    
    if (!res.ok) {
        const err = await res.text();
        console.error("Chat API failed:", err);
    } else {
        const data = await res.json();
        console.log("Chat API succeeded:", data);
    }
  } catch (err) {
    console.error("Fetch error:", err);
  }
}
verify();
