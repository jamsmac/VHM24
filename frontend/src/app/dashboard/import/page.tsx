'use client';

import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors?: Array<{ row: any; error: string }>;
  message?: string;
}

type ImportType = 'nomenclature' | 'counterparties' | 'locations' | 'machines' | 'opening-balances';

export default function ImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importType, setImportType] = useState<ImportType>('nomenclature');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      alert('Неверный формат файла. Поддерживаются только CSV и Excel файлы.');
      return;
    }

    setSelectedFile(file);
    setResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Выберите файл для импорта');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const token = localStorage.getItem('access_token');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', importType);

      // Use intelligent-import endpoint
      const response = await axios.post(
        'http://localhost:3000/intelligent-import/upload',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setResult({
        success: true,
        imported: response.data.imported || response.data.created || 0,
        failed: response.data.failed || 0,
        errors: response.data.errors || [],
        message: response.data.message,
      });
    } catch (error: any) {
      console.error('Failed to import:', error);
      setResult({
        success: false,
        imported: 0,
        failed: 1,
        message: error.response?.data?.message || 'Ошибка при импорте файла',
      });
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setResult(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Импорт данных</h1>
        <p className="text-gray-600 mt-1">
          Загрузите CSV или Excel файл для массового импорта данных
        </p>
      </div>

      {/* Import Type Selection */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Тип импортируемых данных
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <button
            onClick={() => setImportType('nomenclature')}
            className={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${
              importType === 'nomenclature'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-gray-900">Номенклатура</div>
            <div className="text-xs text-gray-500 mt-1">Товары и ингредиенты</div>
          </button>

          <button
            onClick={() => setImportType('counterparties')}
            className={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${
              importType === 'counterparties'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-gray-900">Контрагенты</div>
            <div className="text-xs text-gray-500 mt-1">Поставщики и клиенты</div>
          </button>

          <button
            onClick={() => setImportType('locations')}
            className={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${
              importType === 'locations'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-gray-900">Локации</div>
            <div className="text-xs text-gray-500 mt-1">Точки размещения</div>
          </button>

          <button
            onClick={() => setImportType('machines')}
            className={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${
              importType === 'machines'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-gray-900">Аппараты</div>
            <div className="text-xs text-gray-500 mt-1">Вендинговые аппараты</div>
          </button>

          <button
            onClick={() => setImportType('opening-balances')}
            className={`px-4 py-3 rounded-lg border-2 text-left transition-colors ${
              importType === 'opening-balances'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium text-gray-900">Начальные остатки</div>
            <div className="text-xs text-gray-500 mt-1">Opening balances</div>
          </button>
        </div>
      </div>

      {/* File Upload Area */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Загрузка файла
        </h2>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          {selectedFile ? (
            <div>
              <svg
                className="mx-auto h-12 w-12 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-2 text-base font-medium text-gray-900">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-500">
                {(selectedFile.size / 1024).toFixed(2)} KB
              </p>
              <Button
                variant="secondary"
                onClick={clearSelection}
                className="mt-4"
              >
                Выбрать другой файл
              </Button>
            </div>
          ) : (
            <div>
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="text-blue-600 hover:text-blue-700 font-medium">
                    Выберите файл
                  </span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                </label>
                <span className="text-gray-600"> или перетащите сюда</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                CSV, XLS, XLSX до 10 MB
              </p>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="mt-6 flex justify-end">
            <Button onClick={handleUpload} disabled={loading}>
              {loading ? 'Импортируется...' : 'Начать импорт'}
            </Button>
          </div>
        )}
      </div>

      {/* Import Results */}
      {result && (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Результаты импорта
          </h2>

          {result.success ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg
                  className="h-6 w-6 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-lg font-medium text-green-700">
                  Импорт завершен успешно
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="text-sm text-gray-600">Импортировано</div>
                  <div className="text-2xl font-bold text-green-600">
                    {result.imported}
                  </div>
                </div>

                {result.failed > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-sm text-gray-600">Ошибок</div>
                    <div className="text-2xl font-bold text-red-600">
                      {result.failed}
                    </div>
                  </div>
                )}
              </div>

              {result.message && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">{result.message}</p>
                </div>
              )}

              {result.errors && result.errors.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Детали ошибок:
                  </h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {result.errors.map((err, index) => (
                      <div
                        key={index}
                        className="p-3 bg-red-50 rounded text-sm text-red-700"
                      >
                        <span className="font-medium">Строка {index + 1}:</span>{' '}
                        {err.error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <svg
                  className="h-6 w-6 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-lg font-medium text-red-700">
                  Ошибка импорта
                </span>
              </div>

              {result.message && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-800">{result.message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Format Help */}
      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          Формат файла
        </h3>

        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>Номенклатура:</strong> SKU, Название, Категория, Единица измерения,
            Цена закупки, Цена продажи, Ингредиент (да/нет)
          </p>
          <p>
            <strong>Контрагенты:</strong> Название, ИНН, Телефон, Email, Адрес, Тип
            (поставщик/клиент)
          </p>
          <p>
            <strong>Локации:</strong> Название, Адрес, Контактное лицо, Телефон, Тип
          </p>
          <p>
            <strong>Аппараты:</strong> Номер, Название, Локация, Модель, Статус
          </p>
          <p>
            <strong>Начальные остатки:</strong> SKU номенклатуры, Количество, Цена за единицу,
            Дата остатка
          </p>
        </div>

        <div className="mt-4">
          <Badge variant="warning">
            AI-маппинг колонок включен
          </Badge>
          <p className="text-xs text-gray-500 mt-2">
            Система автоматически определит соответствие колонок вашего файла
          </p>
        </div>
      </div>
    </div>
  );
}
