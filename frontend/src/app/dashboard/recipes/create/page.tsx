'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/form-field';

interface Nomenclature {
  id: string;
  name: string;
  sku: string;
  unit_of_measure_code: string;
  purchase_price?: number;
}

interface RecipeIngredient {
  nomenclature_id: string;
  quantity_per_serving: number;
  unit_of_measure: string;
  cost_per_serving?: number;
  nomenclature?: Nomenclature;
}

export default function CreateRecipePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Nomenclature[]>([]);
  const [ingredients, setIngredients] = useState<Nomenclature[]>([]);
  const [formData, setFormData] = useState({
    nomenclature_id: '',
    recipe_name: '',
    recipe_type: 'primary' as 'primary' | 'alternative' | 'test',
    serving_size: '1',
    serving_unit: 'cup',
    description: '',
    preparation_instructions: '',
    is_active: true,
  });
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);

  useEffect(() => {
    fetchNomenclature();
  }, []);

  const fetchNomenclature = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get('http://localhost:3000/nomenclature', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;
      setProducts(data.filter((item: Nomenclature & { is_ingredient: boolean }) => !item.is_ingredient));
      setIngredients(data.filter((item: Nomenclature & { is_ingredient: boolean }) => item.is_ingredient));
    } catch (error) {
      console.error('Failed to fetch nomenclature:', error);
    }
  };

  const addIngredient = () => {
    setRecipeIngredients([
      ...recipeIngredients,
      {
        nomenclature_id: '',
        quantity_per_serving: 0,
        unit_of_measure: 'g',
      },
    ]);
  };

  const removeIngredient = (index: number) => {
    setRecipeIngredients(recipeIngredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...recipeIngredients];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill unit of measure if nomenclature selected
    if (field === 'nomenclature_id' && value) {
      const ingredient = ingredients.find((ing) => ing.id === value);
      if (ingredient) {
        updated[index].unit_of_measure = ingredient.unit_of_measure_code;
        updated[index].nomenclature = ingredient;
      }
    }

    setRecipeIngredients(updated);
  };

  const calculateTotalCost = () => {
    let total = 0;
    recipeIngredients.forEach((item) => {
      const ingredient = ingredients.find((ing) => ing.id === item.nomenclature_id);
      if (ingredient && ingredient.purchase_price) {
        total += ingredient.purchase_price * item.quantity_per_serving;
      }
    });
    return total.toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (recipeIngredients.length === 0) {
      alert('Добавьте хотя бы один ингредиент');
      return;
    }

    // Validate all ingredients have nomenclature_id and quantity
    const hasInvalidIngredients = recipeIngredients.some(
      (ing) => !ing.nomenclature_id || ing.quantity_per_serving <= 0
    );

    if (hasInvalidIngredients) {
      alert('Заполните все поля для ингредиентов');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');

      // Prepare ingredients array
      const ingredientsData = recipeIngredients.map((ing) => ({
        nomenclature_id: ing.nomenclature_id,
        quantity_per_serving: parseFloat(ing.quantity_per_serving.toString()),
        unit_of_measure: ing.unit_of_measure,
      }));

      await axios.post(
        'http://localhost:3000/recipes',
        {
          ...formData,
          serving_size: parseFloat(formData.serving_size),
          ingredients: ingredientsData,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      router.push('/recipes');
    } catch (error: any) {
      console.error('Failed to create recipe:', error);
      alert(error.response?.data?.message || 'Ошибка при создании рецепта');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Создать рецепт</h1>
        <p className="text-gray-600 mt-1">
          Добавьте новый рецепт напитка с составом ингредиентов
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        {/* Product Selection */}
        <FormSelect
          label="Продукт (напиток)"
          id="nomenclature_id"
          required
          value={formData.nomenclature_id}
          onChange={(e) => setFormData({ ...formData, nomenclature_id: e.target.value })}
          options={[
            { value: '', label: 'Выберите продукт' },
            ...products.map((product) => ({
              value: product.id,
              label: `${product.name} (${product.sku})`,
            })),
          ]}
        />

        {/* Recipe Name */}
        <FormInput
          label="Название рецепта"
          id="recipe_name"
          type="text"
          required
          value={formData.recipe_name}
          onChange={(e) => setFormData({ ...formData, recipe_name: e.target.value })}
          placeholder="Капучино стандартный"
        />

        {/* Recipe Type */}
        <FormSelect
          label="Тип рецепта"
          id="recipe_type"
          required
          value={formData.recipe_type}
          onChange={(e) => setFormData({ ...formData, recipe_type: e.target.value as any })}
          options={[
            { value: 'primary', label: 'Основной' },
            { value: 'alternative', label: 'Альтернативный' },
            { value: 'test', label: 'Тестовый' },
          ]}
        />

        {/* Serving Size */}
        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Размер порции"
            id="serving_size"
            type="number"
            step="0.01"
            required
            value={formData.serving_size}
            onChange={(e) => setFormData({ ...formData, serving_size: e.target.value })}
          />
          <FormSelect
            label="Единица измерения"
            id="serving_unit"
            required
            value={formData.serving_unit}
            onChange={(e) => setFormData({ ...formData, serving_unit: e.target.value })}
            options={[
              { value: 'cup', label: 'Чашка' },
              { value: 'ml', label: 'мл' },
              { value: 'l', label: 'л' },
              { value: 'serving', label: 'Порция' },
            ]}
          />
        </div>

        {/* Ingredients Section */}
        <div className="border-t pt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Состав ингредиентов</h3>
            <Button type="button" variant="secondary" onClick={addIngredient}>
              + Добавить ингредиент
            </Button>
          </div>

          {recipeIngredients.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Нет ингредиентов. Нажмите "Добавить ингредиент" для начала.
            </p>
          ) : (
            <div className="space-y-3">
              {recipeIngredients.map((item, index) => (
                <div key={index} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Ингредиент
                    </label>
                    <select
                      value={item.nomenclature_id}
                      onChange={(e) => updateIngredient(index, 'nomenclature_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Выберите ингредиент</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Количество
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity_per_serving}
                      onChange={(e) =>
                        updateIngredient(index, 'quantity_per_serving', parseFloat(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="w-24">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Ед. изм.
                    </label>
                    <input
                      type="text"
                      value={item.unit_of_measure}
                      onChange={(e) => updateIngredient(index, 'unit_of_measure', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => removeIngredient(index)}
                  >
                    Удалить
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Cost Summary */}
          {recipeIngredients.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">
                  Себестоимость порции:
                </span>
                <span className="text-lg font-bold text-blue-600">
                  {calculateTotalCost()} UZS
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <FormTextarea
          label="Описание"
          id="description"
          rows={3}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Краткое описание рецепта..."
        />

        {/* Preparation Instructions */}
        <FormTextarea
          label="Инструкции по приготовлению"
          id="preparation_instructions"
          rows={4}
          value={formData.preparation_instructions}
          onChange={(e) =>
            setFormData({ ...formData, preparation_instructions: e.target.value })
          }
          placeholder="1. Добавить кофе...&#10;2. Налить молоко...&#10;3. ..."
        />

        {/* Active checkbox */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Активен</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Отмена
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Создание...' : 'Создать рецепт'}
          </Button>
        </div>
      </form>
    </div>
  );
}
