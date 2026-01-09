'use client'

import { useState } from 'react'

interface PvPRoomData {
  _id: string
  lastPvpTime: number
}

interface PvPShardData {
  time: number
  rooms: PvPRoomData[]
}

interface PvPApiResponse {
  ok: number
  pvp: {
    shard0?: PvPShardData
    shard1?: PvPShardData
    shard2?: PvPShardData
    shard3?: PvPShardData
  }
  shardTickSpeeds?: Record<string, number>
  error?: string
}


export default function PvPStatusPage() {
  const [interval, setInterval] = useState('100')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<PvPApiResponse | null>(null)

  const fetchData = async () => {
    const intervalNum = parseInt(interval)
    if (isNaN(intervalNum) || intervalNum <= 0) {
      setError('请输入有效的间隔时间')
      return
    }

    setLoading(true)
    setError('')
    setData(null)

    try {
      const response = await fetch(`/api/screeps?action=pvp&interval=${intervalNum}`)
      const result: PvPApiResponse = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || `请求失败: ${response.status}`)
      }
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取数据失败')
    } finally {
      setLoading(false)
    }
  }

  const shards = ['shard0', 'shard1', 'shard2', 'shard3'] as const
  const roomsByShard: Record<string, PvPRoomData[]> = {}
  const activeShards: string[] = []
  let totalRooms = 0
  let activeBattles = 0
  let avgTickSpeed = 0

  if (data?.ok === 1 && data.pvp) {
    let totalTickSpeed = 0
    let shardCount = 0
    
    Object.entries(data.pvp).forEach(([shard, shardData]) => {
      if (shardData && shardData.rooms.length > 0) {
        activeShards.push(shard)
        roomsByShard[shard] = shardData.rooms
        totalRooms += shardData.rooms.length
        activeBattles += shardData.rooms.filter(room => shardData.time - room.lastPvpTime <= 10).length
        
        if (data.shardTickSpeeds?.[shard]) {
          totalTickSpeed += data.shardTickSpeeds[shard]
          shardCount++
        }
      }
    })
    
    if (shardCount > 0) {
      avgTickSpeed = totalTickSpeed / shardCount
    }
  }

  function formatTickSpeed(ms: number): string {
    const seconds = (ms / 1000).toFixed(1)
    return `${seconds} 秒/tick`
  }

  return (
    <div className="min-h-screen screeps-bg">
      <div className="grid-bg" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold gradient-text">PvP 战争情况</h1>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-indigo-500/10 relative z-20">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">查询间隔（ticks）</label>
                <input
                  type="number"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  placeholder="100"
                  min="1"
                  className="w-full h-10 px-3 bg-gray-700/80 border border-gray-600/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="px-6 h-10 btn-primary rounded-lg text-sm font-medium text-white disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {loading ? '加载中...' : '查询'}
                </button>
              </div>
            </div>
            {error && (
              <div className="mt-3 text-sm text-red-400 bg-red-900/20 rounded-lg p-3 border border-red-500/30">
                {error}
              </div>
            )}
          </div>

          {data && (
            <>
              <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-indigo-500/10">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700/50">
                    <div className="text-xs text-gray-400">活跃 Shard</div>
                    <div className="text-lg font-bold text-white">{activeShards.length}</div>
                    <div className="text-xs text-gray-500">共 4 个 Shard</div>
                  </div>
                  <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700/50">
                    <div className="text-xs text-gray-400">战斗房间数</div>
                    <div className="text-lg font-bold text-red-400">{totalRooms}</div>
                    <div className="text-xs text-gray-500">最近 {interval} ticks</div>
                  </div>
                  <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700/50">
                    <div className="text-xs text-gray-400">正在战斗</div>
                    <div className="text-lg font-bold text-green-400">{activeBattles}</div>
                    <div className="text-xs text-gray-500">10 ticks 内</div>
                  </div>
                  <div className="bg-gray-900/60 rounded-lg p-3 border border-gray-700/50">
                    <div className="text-xs text-gray-400">Tick 速度</div>
                    <div className="text-lg font-bold text-indigo-400">
                      {avgTickSpeed > 0 ? formatTickSpeed(avgTickSpeed) : '-'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {avgTickSpeed > 0 ? `${Math.round(avgTickSpeed)}ms` : '无数据'}
                    </div>
                  </div>
                </div>
              </div>

              {totalRooms > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {shards.map((shard) => {
                    const rooms = roomsByShard[shard]
                    if (!rooms || rooms.length === 0) return null

                    const shardData = data.pvp?.[shard]
                    const shardTime = shardData?.time || 0

                    return (
                      <div key={shard} className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-4 border border-indigo-500/10">
                        <div className="flex items-center justify-between mb-3">
                          <h2 className="text-sm font-semibold text-gray-200">⚔️ {shard}</h2>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>
                              Tick: <span className="text-white font-mono">{shardTime.toLocaleString()}</span>
                            </span>
                            {data.shardTickSpeeds?.[shard] && (
                              <span>
                                速度: <span className="text-indigo-400 font-mono">{formatTickSpeed(data.shardTickSpeeds[shard])}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-400 border-b border-gray-700/50">
                                <th className="pb-3 pr-4 font-medium">房间名称</th>
                                <th className="pb-3 pr-4 font-medium">战斗时间</th>
                                <th className="pb-3 pr-4 font-medium">距离现在</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rooms.map((room) => {
                                const timeAgo = shardTime - room.lastPvpTime
                                return (
                                  <tr 
                                    key={room._id} 
                                    className="border-b border-gray-700/30 hover:bg-gray-700/30 transition-colors"
                                  >
                                    <td className="py-3 pr-4">
                                      <span className="text-white font-mono">{room._id}</span>
                                    </td>
                                    <td className="py-3 pr-4">
                                      <span className="text-gray-400">{room.lastPvpTime.toLocaleString()}</span>
                                    </td>
                                    <td className="py-3">
                                       <span className={timeAgo <= 100 ? 'text-red-400 font-medium' : 'text-gray-400'}>
                                          {timeAgo} ticks
                                        </span>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="bg-gray-800/60 backdrop-blur-sm rounded-xl p-8 border border-indigo-500/10 text-center">
                  <div className="text-4xl mb-3">🕊️</div>
                  <div className="text-gray-400">在最近 {interval} ticks 内没有发生 PvP 战斗</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
