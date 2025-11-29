'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

interface StepStatus {
  completed: boolean;
  skipped: boolean;
  data?: any;
}

export default function SetupWizardPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [stepStatuses, setStepStatuses] = useState<Record<WizardStep, StepStatus>>({
    1: { completed: false, skipped: false },
    2: { completed: false, skipped: false },
    3: { completed: false, skipped: false },
    4: { completed: false, skipped: false },
    5: { completed: false, skipped: false },
    6: { completed: false, skipped: false },
  });

  const steps = [
    {
      number: 1,
      title: 'Контрагенты',
      description: 'Добавьте минимум 1 поставщика',
      required: true,
      path: '/counterparties',
    },
    {
      number: 2,
      title: 'Локации',
      description: 'Добавьте минимум 1 локацию',
      required: true,
      path: '/locations',
    },
    {
      number: 3,
      title: 'Аппараты',
      description: 'Добавьте минимум 1 аппарат',
      required: true,
      path: '/machines',
    },
    {
      number: 4,
      title: 'Товары/Ингредиенты',
      description: 'Добавьте минимум 3-5 позиций',
      required: true,
      path: '/products',
    },
    {
      number: 5,
      title: 'Рецепты',
      description: 'Создайте 1-2 рецепта напитков',
      required: true,
      path: '/recipes',
    },
    {
      number: 6,
      title: 'Начальные остатки',
      description: 'Введите остатки на дату начала учета (опционально)',
      required: false,
      path: '/opening-balances',
    },
  ];

  const markStepCompleted = (step: WizardStep) => {
    setStepStatuses({
      ...stepStatuses,
      [step]: { ...stepStatuses[step], completed: true, skipped: false },
    });
  };

  const markStepSkipped = (step: WizardStep) => {
    setStepStatuses({
      ...stepStatuses,
      [step]: { ...stepStatuses[step], completed: false, skipped: true },
    });
  };

  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as WizardStep);
    }
  };

  const goToNextStep = () => {
    if (currentStep < 6) {
      setCurrentStep((currentStep + 1) as WizardStep);
    }
  };

  const openStepPage = (path: string) => {
    window.open(path, '_blank');
  };

  const completedCount = Object.values(stepStatuses).filter((s) => s.completed).length;
  const totalRequired = steps.filter((s) => s.required).length;
  const requiredCompleted = steps
    .filter((s) => s.required)
    .filter((s) => stepStatuses[s.number as WizardStep].completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const canFinish = requiredCompleted >= totalRequired;

  const finishSetup = () => {
    if (!canFinish) {
      alert('Пожалуйста, завершите все обязательные шаги');
      return;
    }

    if (
      confirm(
        'Завершить первичную настройку системы?\n\nВы сможете добавить или изменить данные позже.'
      )
    ) {
      router.push('/dashboard');
    }
  };

  const currentStepData = steps.find((s) => s.number === currentStep)!;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Мастер первичной настройки
        </h1>
        <p className="text-gray-600 mt-2">
          Настройте основные справочники системы для начала работы
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8 bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-gray-700">
            Прогресс настройки
          </span>
          <span className="text-sm font-bold text-blue-600">
            {completedCount} из {steps.length} ({progressPercent}%)
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="mt-3 text-sm text-gray-600">
          <span className="font-medium">Обязательные шаги:</span>{' '}
          {requiredCompleted} / {totalRequired}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Steps Navigation */}
        <div className="col-span-4">
          <div className="bg-white shadow-sm rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase">
              Шаги настройки
            </h3>

            <nav className="space-y-2">
              {steps.map((step) => {
                const status = stepStatuses[step.number as WizardStep];
                const isActive = currentStep === step.number;
                const isCompleted = status.completed;
                const isSkipped = status.skipped;

                return (
                  <button
                    key={step.number}
                    onClick={() => goToStep(step.number as WizardStep)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isSkipped
                            ? 'bg-gray-300 text-gray-600'
                            : isActive
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {isCompleted ? (
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          step.number
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm font-medium truncate ${
                              isActive ? 'text-blue-600' : 'text-gray-900'
                            }`}
                          >
                            {step.title}
                          </p>
                          {step.required && (
                            <Badge variant="warning" className="text-xs">
                              Обязательно
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Step Content */}
        <div className="col-span-8">
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-bold">
                {currentStep}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {currentStepData.title}
                </h2>
                <p className="text-gray-600">{currentStepData.description}</p>
              </div>
            </div>

            {/* Step Instructions */}
            <div className="space-y-4 mb-6">
              {currentStep === 1 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Что нужно сделать:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Добавьте минимум 1 поставщика товаров и ингредиентов</li>
                    <li>Укажите название, ИНН, контактные данные</li>
                    <li>Вы можете добавить контрагентов-клиентов позже</li>
                  </ul>
                </div>
              )}

              {currentStep === 2 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Что нужно сделать:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Создайте минимум 1 локацию (точку размещения аппарата)</li>
                    <li>Укажите адрес, контактное лицо, тип локации</li>
                    <li>Локация потребуется для привязки аппаратов</li>
                  </ul>
                </div>
              )}

              {currentStep === 3 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Что нужно сделать:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Зарегистрируйте минимум 1 вендинговый аппарат</li>
                    <li>Привяжите аппарат к локации из предыдущего шага</li>
                    <li>Укажите номер, название, модель аппарата</li>
                    <li>QR-код будет сгенерирован автоматически</li>
                  </ul>
                </div>
              )}

              {currentStep === 4 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Что нужно сделать:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Добавьте 3-5 товаров для продажи (готовые напитки/снеки)</li>
                    <li>Добавьте 3-5 ингредиентов для производства (кофе, молоко, сиропы)</li>
                    <li>Укажите SKU, название, категорию, единицу измерения, цены</li>
                    <li>Вы можете использовать импорт из Excel/CSV</li>
                  </ul>
                </div>
              )}

              {currentStep === 5 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
                  <h4 className="font-medium text-blue-900 mb-2">
                    Что нужно сделать:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Создайте 1-2 рецепта для ваших напитков</li>
                    <li>Привяжите рецепт к товару из номенклатуры</li>
                    <li>Укажите состав ингредиентов и нормы расхода</li>
                    <li>Система автоматически рассчитает себестоимость</li>
                  </ul>
                </div>
              )}

              {currentStep === 6 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                  <h4 className="font-medium text-yellow-900 mb-2">
                    Что нужно сделать (опционально):
                  </h4>
                  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                    <li>
                      Введите начальные остатки товаров на дату начала учета
                    </li>
                    <li>Укажите количество и цену закупки для каждой позиции</li>
                    <li>
                      Этот шаг можно пропустить, если у вас нет начальных остатков
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={() => openStepPage(currentStepData.path)}
                className="w-full"
              >
                Открыть страницу "{currentStepData.title}"
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => markStepCompleted(currentStep)}
                  disabled={stepStatuses[currentStep].completed}
                >
                  {stepStatuses[currentStep].completed
                    ? 'Завершено ✓'
                    : 'Отметить как завершенное'}
                </Button>

                {!currentStepData.required && (
                  <Button
                    variant="secondary"
                    onClick={() => markStepSkipped(currentStep)}
                    disabled={stepStatuses[currentStep].skipped}
                  >
                    {stepStatuses[currentStep].skipped
                      ? 'Пропущено'
                      : 'Пропустить шаг'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="mt-6 flex justify-between">
            <Button
              variant="secondary"
              onClick={goToPreviousStep}
              disabled={currentStep === 1}
            >
              ← Предыдущий шаг
            </Button>

            {currentStep < 6 ? (
              <Button onClick={goToNextStep}>Следующий шаг →</Button>
            ) : (
              <Button
                variant={canFinish ? 'default' : 'secondary'}
                className={canFinish ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                onClick={finishSetup}
                disabled={!canFinish}
              >
                {canFinish
                  ? 'Завершить настройку ✓'
                  : `Завершите обязательные шаги (${requiredCompleted}/${totalRequired})`}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
