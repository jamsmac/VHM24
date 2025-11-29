export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">VendHub Manager</h1>
        <p className="text-xl text-gray-600 mb-8">
          Система управления сетью вендинговых автоматов
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
          >
            Войти
          </a>
          <a
            href="/api/docs"
            target="_blank"
            className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            API Документация
          </a>
        </div>
      </div>
    </main>
  )
}
