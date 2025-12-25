/**
 * Token Refresh Demo Component
 *
 * This example demonstrates how the automatic token refresh works
 * in the VendHub frontend application.
 *
 * You don't need to use this component - it's just for demonstration purposes.
 */

'use client'

import { useState, useEffect } from 'react'
import { authStorage } from '@/lib/auth-storage'
import apiClient from '@/lib/axios'

export function TokenRefreshDemo() {
  const [tokenInfo, setTokenInfo] = useState({
    hasToken: false,
    isExpired: false,
    expiresIn: 0,
  })
  const [refreshLog, setRefreshLog] = useState<string[]>([])

  // Update token info every second
  useEffect(() => {
    const interval = setInterval(() => {
      const token = authStorage.getAccessToken()
      const isExpired = authStorage.isTokenExpired()

      setTokenInfo({
        hasToken: !!token,
        isExpired,
        expiresIn: 0, // Would need to calculate this
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const handleTestRequest = async () => {
    const log = `[${new Date().toLocaleTimeString()}] Making API request...`
    setRefreshLog(prev => [...prev, log])

    try {
      // This will automatically refresh token if needed
      const response = await apiClient.get('/machines')

      setRefreshLog(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✅ Request successful (${response.data.length} machines)`,
      ])
    } catch (error) {
      setRefreshLog(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ Request failed: ${error}`,
      ])
    }
  }

  const handleManualRefresh = async () => {
    const log = `[${new Date().toLocaleTimeString()}] Manually refreshing token...`
    setRefreshLog(prev => [...prev, log])

    const success = await authStorage.refreshAccessToken()

    if (success) {
      setRefreshLog(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✅ Token refreshed successfully`,
      ])
    } else {
      setRefreshLog(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ Token refresh failed`,
      ])
    }
  }

  const handleTestRaceCondition = async () => {
    const log = `[${new Date().toLocaleTimeString()}] Testing race condition protection (10 simultaneous requests)...`
    setRefreshLog(prev => [...prev, log])

    // Make 10 simultaneous requests
    const promises = Array(10)
      .fill(null)
      .map((_, i) =>
        apiClient.get('/machines').then(() => {
          setRefreshLog(prev => [
            ...prev,
            `[${new Date().toLocaleTimeString()}] ✅ Request ${i + 1} completed`,
          ])
        })
      )

    try {
      await Promise.all(promises)
      setRefreshLog(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ✅ All requests completed (should only refresh once!)`,
      ])
    } catch {
      setRefreshLog(prev => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] ❌ Some requests failed`,
      ])
    }
  }

  const handleClearLog = () => {
    setRefreshLog([])
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Token Refresh Demo</h1>

      {/* Token Status */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Token Status</h2>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Has Token:</span>
            <span className={tokenInfo.hasToken ? 'text-green-600' : 'text-red-600'}>
              {tokenInfo.hasToken ? '✓ Yes' : '✗ No'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Is Expired:</span>
            <span className={tokenInfo.isExpired ? 'text-red-600' : 'text-green-600'}>
              {tokenInfo.isExpired ? '✗ Yes (will refresh on next request)' : '✓ No'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleTestRequest}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Test API Request
          </button>
          <button
            onClick={handleManualRefresh}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Manual Refresh Token
          </button>
          <button
            onClick={handleTestRaceCondition}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Test Race Condition
          </button>
          <button
            onClick={handleClearLog}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Clear Log
          </button>
        </div>
      </div>

      {/* Refresh Log */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Refresh Log</h2>
        <div className="bg-gray-900 text-gray-100 rounded p-4 font-mono text-sm h-96 overflow-y-auto">
          {refreshLog.length === 0 ? (
            <div className="text-gray-500">No events yet. Click a button above to test.</div>
          ) : (
            refreshLog.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>
            <strong>Test API Request:</strong> Makes a request to /machines. Token is automatically
            refreshed if expired (within 5 min of expiry).
          </li>
          <li>
            <strong>Manual Refresh:</strong> Manually calls refreshAccessToken() to get a new token.
          </li>
          <li>
            <strong>Test Race Condition:</strong> Makes 10 simultaneous requests. You should see
            only ONE refresh happen (check browser Network tab).
          </li>
        </ul>
      </div>
    </div>
  )
}
