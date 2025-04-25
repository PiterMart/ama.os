"use client";

import { useEffect, useState } from 'react';

export default function TestRoutes() {
  const [results, setResults] = useState({});

  useEffect(() => {
    const testRoutes = async () => {
      const testResults = {};

      // Test register endpoint
      try {
        const registerResponse = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'testuser',
            email: 'test@example.com',
            password: 'testpassword'
          })
        });
        testResults.register = {
          status: registerResponse.status,
          ok: registerResponse.ok,
          message: await registerResponse.text()
        };
      } catch (error) {
        testResults.register = { error: error.message };
      }

      // Test test endpoint
      try {
        const testResponse = await fetch('/api/test', {
          method: 'POST'
        });
        testResults.test = {
          status: testResponse.status,
          ok: testResponse.ok,
          message: await testResponse.text()
        };
      } catch (error) {
        testResults.test = { error: error.message };
      }

      // Test chat endpoint
      try {
        const chatResponse = await fetch('/api/chat', {
          method: 'GET'
        });
        testResults.chat = {
          status: chatResponse.status,
          ok: chatResponse.ok,
          message: await chatResponse.text()
        };
      } catch (error) {
        testResults.chat = { error: error.message };
      }

      setResults(testResults);
    };

    testRoutes();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>API Route Test Results</h2>
      <pre>{JSON.stringify(results, null, 2)}</pre>
    </div>
  );
} 