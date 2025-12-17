'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QRScanner } from '@/components/QRScanner'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { MobileNav } from '@/components/layout/MobileNav'
import { getDB } from '@/lib/db'
import { tasksApi } from '@/lib/tasks-api'
import { toast } from 'react-toastify'
import { QrCode, MapPin, Clock, Package, Zap, CheckCircle2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { TaskStatus } from '@/types/tasks'
import { Machine } from '@/types/machines'

export default function ScanPage() {
  const router = useRouter()
  const [showScanner, setShowScanner] = useState(false)
  const [scannedMachine, setScannedMachine] = useState<Machine | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [location, setLocation] = useState<GeolocationPosition | null>(null)

  // Get my active tasks
  const { data: myTasks } = useQuery({
    queryKey: ['tasks', 'my-active'],
    queryFn: () => tasksApi.getAll({ status: TaskStatus.ASSIGNED }),
  })

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine)

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(position)
        },
        (error) => {
          console.error('[Geolocation] Error:', error)
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      )
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleScan = async (qrData: string) => {
    try {
      // QR data format: "VH-{machine_number}" or just machine_number
      const machineNumber = qrData.startsWith('VH-') ? qrData.substring(3) : qrData

      // Try to fetch machine from API
      if (isOnline) {
        try {
          // Fetch machine from API (assuming there's a getMachineByNumber endpoint)
          const response = await fetch(`/api/machines?machine_number=${machineNumber}`)
          const machines = await response.json()

          if (machines && machines.length > 0) {
            const machine = machines[0]
            setScannedMachine(machine)

            // Cache machine for offline use
            const db = await getDB()
            await db.cacheMachine(machine)

            toast.success(`Аппарат ${machine.machine_number} найден!`)
          } else {
            toast.error('Аппарат не найден в системе')
          }
        } catch (error) {
          console.error('[API] Error fetching machine:', error)
          // Fallback to cache
          await checkCache(machineNumber)
        }
      } else {
        // Offline mode - check cache
        await checkCache(machineNumber)
      }
    } catch (error) {
      console.error('[QR] Error processing scan:', error)
      toast.error('Ошибка обработки QR-кода')
    }
  }

  const checkCache = async (machineNumber: string) => {
    try {
      const db = await getDB()
      const machine = await db.getMachineByQR(machineNumber)

      if (machine) {
        setScannedMachine(machine)
        toast.info(`Аппарат ${machine.machine_number} (из кэша)`)
      } else {
        toast.error('Аппарат не найден в кэше. Требуется подключение к интернету.')
      }
    } catch (error) {
      console.error('[Cache] Error:', error)
      toast.error('Ошибка доступа к кэшу')
    }
  }

  const createTask = (taskType: string) => {
    if (!scannedMachine) {return}

    // Navigate to task creation with pre-filled machine
    router.push(
      `/dashboard/tasks/create?machine_id=${scannedMachine.id}&type=${taskType}&lat=${location?.coords.latitude}&lng=${location?.coords.longitude}`
    )
  }

  const viewMachine = () => {
    if (!scannedMachine) {return}
    router.push(`/dashboard/machines/${scannedMachine.id}`)
  }

  const startExistingTask = (taskId: string) => {
    router.push(`/dashboard/tasks/${taskId}`)
  }

  // Check if there's an existing task for this machine
  const existingTask = myTasks?.find((task) => task.machine_id === scannedMachine?.id)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MobileHeader title="Сканер QR" />

      {!showScanner && !scannedMachine && (
        <div className="p-6 space-y-6">
          {/* Scanner button */}
          <button
            onClick={() => setShowScanner(true)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-8 shadow-lg active:scale-98 transition-transform touch-manipulation"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
                <QrCode className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Сканировать QR-код</h2>
                <p className="text-indigo-100 text-sm">
                  Наведите камеру на QR-код аппарата
                </p>
              </div>
            </div>
          </button>

          {/* Status indicators */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-orange-500'}`} />
                <span className="text-sm font-medium text-gray-700">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                {isOnline ? 'Синхронизация включена' : 'Работа из кэша'}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Геолокация</span>
              </div>
              <p className="text-xs text-gray-500">
                {location ? 'Определена' : 'Определение...'}
              </p>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Как использовать
            </h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="font-semibold">1.</span>
                <span>Нажмите кнопку "Сканировать QR-код"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">2.</span>
                <span>Разрешите доступ к камере</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">3.</span>
                <span>Наведите на QR-код на корпусе аппарата</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold">4.</span>
                <span>Выберите действие (создать задачу, просмотреть данные)</span>
              </li>
            </ol>
          </div>

          {/* Active tasks */}
          {myTasks && myTasks.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 px-1">
                Мои активные задачи ({myTasks.length})
              </h3>
              <div className="space-y-3">
                {myTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => startExistingTask(task.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        startExistingTask(task.id)
                      }
                    }}
                    className="bg-white rounded-xl p-4 border border-gray-200 active:bg-gray-50 touch-manipulation cursor-pointer"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 mb-1">{task.type_code}</p>
                        {task.machine && (
                          <p className="text-sm text-gray-600">
                            {task.machine.machine_number}
                          </p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scanned machine details */}
      {scannedMachine && !showScanner && (
        <div className="p-6 space-y-6">
          {/* Success message */}
          <div className="bg-green-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900">Аппарат найден!</h3>
                <p className="text-sm text-green-700">Выберите действие</p>
              </div>
            </div>
          </div>

          {/* Machine info */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
              <h2 className="text-2xl font-bold mb-1">{scannedMachine.machine_number}</h2>
              <p className="text-indigo-100 text-sm">{scannedMachine.name}</p>
            </div>

            <div className="p-4 space-y-3">
              {scannedMachine.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600">Локация</p>
                    <p className="font-medium text-gray-900">{scannedMachine.location.name}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-600">Статус</p>
                  <p className="font-medium text-gray-900">{scannedMachine.status}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Existing task alert */}
          {existingTask && (
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <h3 className="font-semibold text-orange-900 mb-2">
                У вас есть задача для этого аппарата
              </h3>
              <p className="text-sm text-orange-700 mb-3">
                {existingTask.type_code} - {existingTask.status}
              </p>
              <button
                onClick={() => startExistingTask(existingTask.id)}
                className="w-full bg-orange-600 text-white px-4 py-3 rounded-lg font-medium active:bg-orange-700 touch-manipulation"
              >
                Перейти к задаче
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 px-1">Создать задачу</h3>

            <button
              onClick={() => createTask('refill')}
              className="w-full bg-white rounded-xl p-4 border border-gray-200 active:bg-gray-50 touch-manipulation flex items-center gap-3"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">Пополнение</p>
                <p className="text-sm text-gray-600">Загрузить товары в аппарат</p>
              </div>
            </button>

            <button
              onClick={() => createTask('collection')}
              className="w-full bg-white rounded-xl p-4 border border-gray-200 active:bg-gray-50 touch-manipulation flex items-center gap-3"
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">Инкассация</p>
                <p className="text-sm text-gray-600">Забрать наличные из аппарата</p>
              </div>
            </button>

            <button
              onClick={() => createTask('maintenance')}
              className="w-full bg-white rounded-xl p-4 border border-gray-200 active:bg-gray-50 touch-manipulation flex items-center gap-3"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">🔧</span>
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">Обслуживание</p>
                <p className="text-sm text-gray-600">Техническое обслуживание</p>
              </div>
            </button>
          </div>

          {/* Secondary actions */}
          <div className="flex gap-3">
            <button
              onClick={viewMachine}
              className="flex-1 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium active:bg-gray-200 touch-manipulation"
            >
              Подробнее
            </button>
            <button
              onClick={() => {
                setScannedMachine(null)
                setShowScanner(false)
              }}
              className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-medium active:bg-indigo-700 touch-manipulation"
            >
              Сканировать ещё
            </button>
          </div>
        </div>
      )}

      {/* QR Scanner */}
      {showScanner && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
          continuous={false}
        />
      )}

      <MobileNav />
    </div>
  )
}
