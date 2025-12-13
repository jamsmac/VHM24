'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Button } from '@/components/ui/button';

interface Nomenclature {
  id: string;
  name: string;
  sku: string;
  unit_of_measure_code: string;
  purchase_price?: number;
}

interface RecipeIngredient {
  id?: string;
  nomenclature_id: string;
  quantity_per_serving: number;
  unit_of_measure: string;
  cost_per_serving?: number;
  nomenclature?: Nomenclature;
}

export default function EditRecipePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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

  const fetchNomenclature = useCallback(async () => {
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
  }, []);

  const fetchRecipe = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`http://localhost:3000/recipes/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data;

      setFormData({
        nomenclature_id: data.nomenclature_id,
        recipe_name: data.recipe_name,
        recipe_type: data.recipe_type,
        serving_size: data.serving_size.toString(),
        serving_unit: data.serving_unit,
        description: data.description || '',
        preparation_instructions: data.preparation_instructions || '',
        is_active: data.is_active,
      });

      // Load existing ingredients
      if (data.ingredients && data.ingredients.length > 0) {
        setRecipeIngredients(
          data.ingredients.map((ing: any) => ({
            id: ing.id,
            nomenclature_id: ing.nomenclature_id,
            quantity_per_serving: ing.quantity_per_serving,
            unit_of_measure: ing.unit_of_measure,
            nomenclature: ing.nomenclature,
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch recipe:', error);
      alert('Ошибка при загрузке рецепта');
    } finally {
      setFetching(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchNomenclature();
    fetchRecipe();
  }, [fetchNomenclature, fetchRecipe]);

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

      await axios.patch(
        `http://localhost:3000/recipes/${params.id}`,
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
      console.error('Failed to update recipe:', error);
      alert(error.response?.data?.message || 'Ошибка при обновлении рецепта');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Вы уверены что хотите удалить этот рецепт?')) {return;}

    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`http://localhost:3000/recipes/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push('/recipes');
    } catch (error: any) {
      console.error('Failed to delete recipe:', error);
      alert(error.response?.data?.message || 'Ошибка при удалении');
    }
  };

  if (fetching) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          <p className="mt-2 text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Редактировать рецепт</h1>
        <p className="text-gray-600 mt-1">
          Обновите состав рецепта и ингредиенты
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        {/* Product Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Продукт (напиток) *
          </label>
          <select
            required
            value={formData.nomenclature_id}
            onChange={(e) => setFormData({ ...formData, nomenclature_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Выберите продукт</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.sku})
              </option>
            ))}
          </select>
        </div>

        {/* Recipe Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Название рецепта *
          </label>
          <input
            type="text"
            required
            value={formData.recipe_name}
            onChange={(e) => setFormData({ ...formData, recipe_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Recipe Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Тип рецепта *
          </label>
          <select
            value={formData.recipe_type}
            onChange={(e) => setFormData({ ...formData, recipe_type: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="primary">Основной</option>
            <option value="alternative">Альтернативный</option>
            <option value="test">Тестовый</option>
          </select>
        </div>

        {/* Serving Size */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Размер порции *
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.serving_size}
              onChange={(e) => setFormData({ ...formData, serving_size: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Единица измерения *
            </label>
            <select
              value={formData.serving_unit}
              onChange={(e) => setFormData({ ...formData, serving_unit: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="cup">Чашка</option>
              <option value="ml">мл</option>
              <option value="l">л</option>
              <option value="serving">Порция</option>
            </select>
          </div>
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
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Описание
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Preparation Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Инструкции по приготовлению
          </label>
          <textarea
            value={formData.preparation_instructions}
            onChange={(e) =>
              setFormData({ ...formData, preparation_instructions: e.target.value })
            }
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

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
        <div className="flex justify-between pt-4 border-t">
          <Button type="button" variant="danger" onClick={handleDelete}>
            Удалить рецепт
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
